"use client";

/**
 * Shared Admin Dashboard Component
 * 
 * Component ที่ใช้ร่วมกันระหว่าง:
 * - /admin (Admin Dashboard หลัก)
 * - /[username]/admin (Admin Dashboard สำหรับ user แต่ละคน)
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../hooks/useAdminSession";
import { API_ENDPOINTS, apiRequest } from "@/lib/api-config";
import { getUsernameFromToken } from "@/lib/jwt-utils";

interface AdminDashboardProps {
  /**
   * Base path สำหรับสร้าง links
   * เช่น "/admin" หรือ "/{username}/admin"
   */
  basePath?: string;
  
  /**
   * แสดงปุ่มไปที่ Admin หลักหรือไม่
   */
  showMainAdminLink?: boolean;
  
  /**
   * Username จาก URL (ถ้ามี)
   */
  urlUsername?: string;
  
  /**
   * Custom header title
   */
  headerTitle?: string;
  
  /**
   * Custom header subtitle
   */
  headerSubtitle?: string;
  
}

export default function AdminDashboard({
  basePath = "/admin",
  showMainAdminLink = false,
  urlUsername,
  headerTitle = "Admin Dashboard",
  headerSubtitle,
}: AdminDashboardProps) {
  const router = useRouter();
  // ส่ง urlUsername เพื่อให้ session management ทำงานแยกตาม user
  useAdminSession(urlUsername);
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  
  // สถิติต่างๆ - แสดงจำนวนข้อมูลในระบบ
  const [stats, setStats] = useState({
    portfolios: 0,      // จำนวนผลงานทั้งหมด
    experiences: 0,     // จำนวนประสบการณ์ทั้งหมด
    unreadMessages: 0,  // จำนวนข้อความที่ยังไม่อ่าน
  });

  useEffect(() => {
    const checkAuth = async () => {
      // ถ้ามี urlUsername ให้ใช้ token ของ user นั้น
      let token: string | null = null;
      if (urlUsername) {
        const { getTokenForUser } = await import("@/lib/jwt-utils");
        token = getTokenForUser(urlUsername);
      } else {
        token = localStorage.getItem("authToken") || localStorage.getItem("adminToken");
      }
      
      if (!token) {
        router.push("/admin/login");
      } else {
        setAuthenticated(true);
        // ดึง username จาก token
        const currentUsername = getUsernameFromToken(urlUsername);
        setUsername(currentUsername);
        loadStats(); // โหลดสถิติเมื่อเข้าหน้า
      }
    };
    
    checkAuth();
  }, [router, urlUsername]);

  /**
   * โหลดสถิติจาก API
   * - ดึงจำนวน Portfolio, Experience, และข้อความที่ยังไม่อ่าน
   */
  const loadStats = async () => {
    try {
      // ดึงข้อมูล Content (PageContent) ที่มีทั้ง Portfolio และ Experience
      const profileRes = await apiRequest(API_ENDPOINTS.CONTENT_ME, {
        method: "GET",
        cache: "no-store",
        username: urlUsername, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
      });
      
      if (!profileRes.ok) {
        console.warn('Profile API returned non-OK status:', profileRes.status);
        // ไม่ throw error แต่ใช้ค่า default แทน
        setStats({
          portfolios: 0,
          experiences: 0,
          unreadMessages: 0,
        });
        return;
      }
      
      const profileData = await profileRes.json();

      // ตรวจสอบว่ามี error ใน response หรือไม่
      if (profileData.error) {
        console.warn('Profile API error:', profileData.error);
        setStats({
          portfolios: 0,
          experiences: 0,
          unreadMessages: 0,
        });
        return;
      }

      // ดึงจำนวนข้อความที่ยังไม่อ่าน
      let unreadCount = 0;
      try {
        const msgRes = await apiRequest(`${API_ENDPOINTS.CONTACT}?unreadOnly=true`, {
          method: "GET",
          cache: "no-store",
          username: urlUsername, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
        });
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          unreadCount = Array.isArray(msgData) ? msgData.length : 0;
        }
      } catch (msgError) {
        console.warn("Error loading messages:", msgError);
        // ไม่ต้อง throw ให้ใช้ค่า 0 แทน
      }

      setStats({
        portfolios: Array.isArray(profileData.portfolio) ? profileData.portfolio.length : 0,
        experiences: Array.isArray(profileData.experience) ? profileData.experience.length : 0,
        unreadMessages: unreadCount,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
      // ตั้งค่า default ถ้าเกิด error
      setStats({
        portfolios: 0,
        experiences: 0,
        unreadMessages: 0,
      });
    }
  };

  /**
   * ฟังก์ชัน Logout
   * - ลบ Token ออกจาก localStorage
   * - Redirect ไปหน้า Login
   */
  const handleLogout = async () => {
    // ถ้ามี urlUsername ให้ลบ token ของ user นั้น
    if (urlUsername) {
      const { removeTokenForUser } = await import("@/lib/jwt-utils");
      removeTokenForUser(urlUsername);
      localStorage.removeItem(`adminLoginTime_${urlUsername}`);
    } else {
      localStorage.removeItem("authToken");
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminLoginTime");
    }
    router.push("/admin/login");
  };

  if (!authenticated) return null;

  // สร้าง subtitle
  const displaySubtitle = headerSubtitle || (
    username ? (
      urlUsername ? (
        <>
          ยินดีต้อนรับ, <span className="font-semibold text-blue-600">{username}</span>
          <span className="text-gray-400 ml-2">({urlUsername})</span>
        </>
      ) : (
        <>ยินดีต้อนรับ, <span className="font-semibold text-blue-600">{username}</span></>
      )
    ) : (
      "ยินดีต้อนรับสู่ระบบจัดการเว็บไซต์"
    )
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header - แสดงชื่อและปุ่ม Logout */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-blue-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">🎨</span>
                {headerTitle}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {displaySubtitle}
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href={username ? `/${username}` : "/"}
                target="_blank"
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                🌐 ดูหน้าเว็บ
              </Link>
              {showMainAdminLink && urlUsername && (
                <Link
                  href={`/${urlUsername}/admin`}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
                >
                  🏠 Admin หลัก
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                🚪 ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards - แสดงสถิติ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* จำนวนผลงาน */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-semibold">ผลงานทั้งหมด</p>
                <p className="text-4xl font-bold mt-2">{stats.portfolios}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <span className="text-5xl">💼</span>
              </div>
            </div>
          </div>

          {/* จำนวนประสบการณ์ */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-semibold">ประสบการณ์</p>
                <p className="text-4xl font-bold mt-2">{stats.experiences}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <span className="text-5xl">🎓</span>
              </div>
            </div>
          </div>

          {/* จำนวนข้อความใหม่ */}
          <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl shadow-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-pink-100 text-sm font-semibold">ข้อความใหม่</p>
                <p className="text-4xl font-bold mt-2">{stats.unreadMessages}</p>
              </div>
              <div className="bg-white/20 p-4 rounded-xl">
                <span className="text-5xl">📧</span>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Grid - เมนูหลักทั้งหมด */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 1. จัดการเลย์เอาต์ - Layout Builder */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/layout-builder` : "/admin/login"}
            className="group bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 p-6 border-2 border-white transform hover:-translate-y-2 relative overflow-hidden"
          >
            {/* Badge MAIN */}
            <div className="absolute -top-1 -right-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl shadow-lg animate-pulse">
              ⭐ หลัก
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-xl text-white text-3xl group-hover:scale-110 group-hover:rotate-6 transition-all">
                🎨
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">จัดการเลย์เอาต์</h2>
                <p className="text-sm text-blue-100">Layout Builder & Editor</p>
              </div>
            </div>
            <p className="text-white/90 text-sm leading-relaxed">
              ✨ จัดเรียง Section<br/>
              📝 แก้ไขเนื้อหา<br/>
              🎨 ปรับสีและรูปแบบ<br/>
              <span className="font-bold">ทุกอย่างในที่เดียว!</span>
            </p>
          </Link>

          {/* 2. เกี่ยวกับเรา */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/about` : "/admin/login"}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-purple-100 hover:border-purple-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-4 rounded-xl text-white text-3xl group-hover:scale-110 transition-transform">
                👤
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">เกี่ยวกับเรา</h2>
                <p className="text-sm text-gray-600">About Section</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              แก้ไขข้อมูลส่วนตัว ประวัติ ความสำเร็จ และทักษะ
            </p>
          </Link>

          {/* 3. การศึกษาและประสบการณ์ */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/education-experience` : "/admin/login"}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-green-100 hover:border-green-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-4 rounded-xl text-white text-3xl group-hover:scale-110 transition-transform">
                🎓
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">การศึกษา & ประสบการณ์</h2>
                <p className="text-sm text-gray-600">Education & Experience</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              จัดการข้อมูลการศึกษาและประสบการณ์การทำงาน
            </p>
          </Link>

          {/* 4. ผลงาน */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/portfolios` : "/admin/login"}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-orange-100 hover:border-orange-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-4 rounded-xl text-white text-3xl group-hover:scale-110 transition-transform">
                💼
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">ผลงาน</h2>
                <p className="text-sm text-gray-600">Portfolio Management</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              จัดการผลงานทั้งหมด เพิ่ม แก้ไข และลบผลงาน
            </p>
          </Link>

          {/* 5. ข้อความติดต่อ */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/messages` : "/admin/login"}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-pink-100 hover:border-pink-300 transform hover:-translate-y-1 relative"
          >
            {/* Badge แจ้งเตือนข้อความใหม่ */}
            {stats.unreadMessages > 0 && (
              <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm animate-bounce">
                {stats.unreadMessages}
              </div>
            )}
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-pink-500 to-pink-600 p-4 rounded-xl text-white text-3xl group-hover:scale-110 transition-transform">
                📧
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">ข้อความติดต่อ</h2>
                <p className="text-sm text-gray-600">Contact Messages</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              ดูข้อความที่ลูกค้าส่งมาทางฟอร์มติดต่อ
            </p>
          </Link>

          {/* 6. ตั้งค่าสีธีม */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/theme` : "/admin/login"}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-indigo-100 hover:border-indigo-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-xl text-white text-3xl group-hover:scale-110 transition-transform">
                🎨
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">ตั้งค่าสีธีม</h2>
                <p className="text-sm text-gray-600">Theme Settings</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              ปรับแต่งสีของเว็บไซต์ให้เข้ากับแบรนด์ของคุณ
            </p>
          </Link>

          {/* 7. จัดการ Header & Footer */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/header-footer` : "/admin/login"}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-teal-100 hover:border-teal-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-teal-500 to-teal-600 p-4 rounded-xl text-white text-3xl group-hover:scale-110 transition-transform">
                📋
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Header & Footer</h2>
                <p className="text-sm text-gray-600">Header & Footer Settings</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              แก้ไขเนื้อหาโลโก้ อีเมล และข้อมูลใน Header และ Footer
            </p>
          </Link>

          {/* 8. ประวัติการแก้ไข */}
          <Link
            href={urlUsername ? `/${urlUsername}/admin/edit-history` : "/admin/login"}
            className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 border-2 border-gray-100 hover:border-gray-300 transform hover:-translate-y-1"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-4 rounded-xl text-white text-3xl group-hover:scale-110 transition-transform">
                📜
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">ประวัติการแก้ไข</h2>
                <p className="text-sm text-gray-600">Edit History</p>
              </div>
            </div>
            <p className="text-gray-700 text-sm">
              ดูประวัติการแก้ไขข้อมูลทั้งหมดในระบบ
            </p>
          </Link>

        </div>

        {/* Quick Tips - คำแนะนำการใช้งาน */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            เคล็ดลับการใช้งาน
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">✓</span>
              <p>
                <strong>แก้ไขหน้าเว็บ:</strong> ดูผลลัพธ์แบบ Real-time ขณะแก้ไข
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">✓</span>
              <p>
                <strong>ผลงาน:</strong> อัปโหลดรูปภาพเพื่อแสดงผลงานให้น่าสนใจ
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">✓</span>
              <p>
                <strong>ข้อความ:</strong> ตรวจสอบข้อความจากลูกค้าเป็นประจำ
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">✓</span>
              <p>
                <strong>สีธีม:</strong> เลือกสีที่เข้ากับแบรนด์ของคุณ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

