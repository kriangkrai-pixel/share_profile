import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const SESSION_TIMEOUT = 10 * 60 * 1000; // 30 นาที
const INACTIVITY_CHECK_INTERVAL = 60 * 1000; // ตรวจสอบทุก 1 นาที

export function useAdminSession() {
  const router = useRouter();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminLoginTime");
      router.push("/admin/login");
    }
  };

  const resetSession = () => {
    // เก็บเวลาที่ login
    const loginTime = Date.now();
    localStorage.setItem("adminLoginTime", loginTime.toString());

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
    const token = localStorage.getItem("adminToken");
    const loginTimeStr = localStorage.getItem("adminLoginTime");

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
    const token = localStorage.getItem("adminToken");
    
    if (!token) {
      router.push("/admin/login");
      return;
    }

    // ตรวจสอบว่ามี loginTime หรือไม่ ถ้าไม่มีให้ตั้งค่าใหม่
    const loginTimeStr = localStorage.getItem("adminLoginTime");
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
  }, [router]);

  return { logout };
}

