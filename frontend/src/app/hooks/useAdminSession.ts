import { useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { API_ENDPOINTS, apiRequest, isConnectionError, getAuthToken } from "../../lib/api-config";
import { getTokenForUser, removeTokenForUser } from "../../lib/jwt-utils";

const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 นาที
const INACTIVITY_CHECK_INTERVAL = 60 * 1000; // ตรวจสอบทุก 1 นาที

/**
 * Hook สำหรับจัดการ session ของ admin
 * รองรับ multi-user โดยตรวจสอบ token แยกตาม username
 * @param username optional username สำหรับ user-specific admin pages
 */
export function useAdminSession(username?: string) {
  const router = useRouter();
  const params = useParams();
  // ถ้าไม่มี username ใน parameter ให้ดึงจาก URL
  const urlUsername = username || (params?.username as string);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const logout = async () => {
    try {
      // ส่ง username เพื่อใช้ token ที่ถูกต้อง
      await apiRequest(API_ENDPOINTS.LOGOUT, { 
        method: "POST",
        username: urlUsername,
      });
    } catch (error) {
      // Log connection errors but don't block logout
      if (isConnectionError(error)) {
        console.warn("⚠️ Backend may not be running. Logging out locally.");
      } else {
        console.error("Logout error:", error);
      }
    } finally {
      // ลบ token ของ user นี้เท่านั้น
      if (urlUsername) {
        removeTokenForUser(urlUsername);
        localStorage.removeItem(`adminLoginTime_${urlUsername}`);
      } else {
        // Fallback สำหรับกรณีที่ไม่มี username
        localStorage.removeItem("authToken");
        localStorage.removeItem("adminToken");
        localStorage.removeItem("adminLoginTime");
      }
      router.push("/admin/login");
    }
  };

  const resetSession = () => {
    // เก็บเวลาที่ login สำหรับ user นี้
    const loginTime = Date.now();
    if (urlUsername) {
      localStorage.setItem(`adminLoginTime_${urlUsername}`, loginTime.toString());
    } else {
      localStorage.setItem("adminLoginTime", loginTime.toString());
    }

    // ล้าง timeout เก่า
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // ตั้ง timeout ใหม่
    timeoutRef.current = setTimeout(() => {
      logout();
    }, SESSION_TIMEOUT);
  };

  const checkSession = () => {
    // ดึง token ตาม username
    const token = urlUsername 
      ? getTokenForUser(urlUsername)
      : getAuthToken();
    
    const loginTimeKey = urlUsername 
      ? `adminLoginTime_${urlUsername}`
      : "adminLoginTime";
    const loginTimeStr = localStorage.getItem(loginTimeKey);

    if (!token || !loginTimeStr) {
      logout();
      return;
    }

    const loginTime = parseInt(loginTimeStr, 10);
    const now = Date.now();
    const elapsed = now - loginTime;

    if (elapsed >= SESSION_TIMEOUT) {
      logout();
    }
  };

  useEffect(() => {
    // ดึง token ตาม username
    const token = urlUsername 
      ? getTokenForUser(urlUsername)
      : getAuthToken();
    
    if (!token) {
      // ไม่ต้อง redirect ถ้าไม่มี token เพราะ layout จะจัดการเอง
      return;
    }

    // ตรวจสอบว่ามี loginTime หรือไม่ ถ้าไม่มีให้ตั้งค่าใหม่
    const loginTimeKey = urlUsername 
      ? `adminLoginTime_${urlUsername}`
      : "adminLoginTime";
    const loginTimeStr = localStorage.getItem(loginTimeKey);
    
    if (!loginTimeStr) {
      resetSession();
    } else {
      const loginTime = parseInt(loginTimeStr, 10);
      const now = Date.now();
      const elapsed = now - loginTime;

      if (elapsed >= SESSION_TIMEOUT) {
        logout();
        return;
      }

      // ตั้ง timeout สำหรับเวลาที่เหลือ
      const remaining = SESSION_TIMEOUT - elapsed;
      timeoutRef.current = setTimeout(() => {
        logout();
      }, remaining);
    }

    // ตั้ง interval สำหรับตรวจสอบ session
    checkIntervalRef.current = setInterval(checkSession, INACTIVITY_CHECK_INTERVAL);

    // ฟังก์ชันสำหรับตรวจจับ activity
    const handleActivity = () => {
      resetSession();
    };

    // ตรวจจับ user activity
    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [router, urlUsername]);

  return { logout };
}

