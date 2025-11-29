"use client";

/**
 * Admin Dashboard - หน้าแรกของระบบ Admin
 * 
 * Redirect ไป /admin/login เพราะตอนนี้ใช้ /[username]/admin แทน
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect ไปหน้า login เพราะต้องใช้ /[username]/admin แทน
    router.push("/admin/login");
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">กำลังเปลี่ยนเส้นทาง...</p>
      </div>
    </div>
  );
}

