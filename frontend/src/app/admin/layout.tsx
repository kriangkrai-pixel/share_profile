"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthToken, apiRequest } from "../../lib/api-config";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = getAuthToken() || localStorage.getItem("adminToken");

      if (!token) {
        router.push("/admin/login");
        return;
      }

      // Optionally validate token with backend
      try {
        const { API_ENDPOINTS } = await import("../../lib/api-config");
        const response = await apiRequest(API_ENDPOINTS.CONTENT_ME, {
          method: "GET",
        });

        if (response.ok || response.status === 401) {
          // If 401, token is invalid
          if (response.status === 401) {
            localStorage.removeItem("authToken");
            localStorage.removeItem("adminToken");
            router.push("/admin/login");
            return;
          }
          setIsAuthenticated(true);
        } else {
          // Token might be invalid
          localStorage.removeItem("authToken");
          localStorage.removeItem("adminToken");
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

    // Don't check auth on login page
    if (pathname === "/admin/login") {
      setIsChecking(false);
      return;
    }

    checkAuth();
  }, [router, pathname]);

  // Show loading state while checking
  if (isChecking && pathname !== "/admin/login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated (except on login page)
  if (!isAuthenticated && pathname !== "/admin/login") {
    return null;
  }

  return <>{children}</>;
}

