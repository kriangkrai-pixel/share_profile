"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { apiRequest } from "../../../lib/api-config";
import { getTokenForUser, getUsernameFromToken } from "../../../lib/jwt-utils";

export default function UsernameAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const urlUsername = params?.username as string;
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [usernameMismatch, setUsernameMismatch] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (!urlUsername) {
        router.push("/admin/login");
        return;
      }

      // ดึง token สำหรับ username นี้โดยเฉพาะ (ไม่ใช้ fallback)
      const token = getTokenForUser(urlUsername);

      if (!token) {
        console.warn(`⚠️ No token found for user: ${urlUsername}`);
        router.push("/admin/login");
        return;
      }

      // ตรวจสอบว่า username ใน URL ตรงกับ username ที่ login หรือไม่
      const loggedInUsername = getUsernameFromToken(urlUsername);
      
      if (!loggedInUsername) {
        console.warn(`⚠️ Cannot decode username from token for user: ${urlUsername}`);
        router.push("/admin/login");
        return;
      }

      // ตรวจสอบว่า username ตรงกันหรือไม่ (case-insensitive)
      if (loggedInUsername.toLowerCase() !== urlUsername.toLowerCase()) {
        console.warn(`⚠️ Username mismatch: ${loggedInUsername} !== ${urlUsername}`);
        setUsernameMismatch(true);
        setIsChecking(false);
        return;
      }

      // Optionally validate token with backend
      try {
        const { API_ENDPOINTS } = await import("../../../lib/api-config");
        // ส่ง username เพื่อใช้ token ที่ถูกต้อง
        const response = await apiRequest(API_ENDPOINTS.CONTENT_ME, {
          method: "GET",
          username: urlUsername,
        });

        if (response.ok || response.status === 401) {
          // If 401, token is invalid
          if (response.status === 401) {
            const { removeTokenForUser } = await import("../../../lib/jwt-utils");
            removeTokenForUser(urlUsername);
            router.push("/admin/login");
            return;
          }
          setIsAuthenticated(true);
        } else {
          // Token might be invalid
          const { removeTokenForUser } = await import("../../../lib/jwt-utils");
          removeTokenForUser(urlUsername);
          router.push("/admin/login");
          return;
        }
      } catch (error) {
        // If API is not available, just check if token exists
        // This allows offline development
        setIsAuthenticated(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [router, urlUsername]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Show error if username doesn't match
  if (usernameMismatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-600 mb-6">
            คุณไม่มีสิทธิ์เข้าถึง admin ของ user <span className="font-semibold text-blue-600">{urlUsername}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                // ไปที่ admin ของ user ที่ login อยู่
                const { getUsernameFromToken } = require("@/lib/jwt-utils");
                const currentUsername = getUsernameFromToken();
                if (currentUsername) {
                  router.push(`/${currentUsername}/admin`);
                } else {
                  router.push("/admin/login");
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl transition-all"
            >
              ไปที่ Admin ของฉัน
            </button>
            <button
              onClick={() => router.push(`/${urlUsername}`)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-xl transition-all"
            >
              ดู Profile
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}

