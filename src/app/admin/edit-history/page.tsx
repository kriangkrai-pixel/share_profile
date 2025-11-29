"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";
import { getUsernameFromToken } from "@/lib/jwt-utils";

interface EditHistoryItem {
  id: number;
  page: string;
  section: string | null;
  action: string;
  oldValue: string | null;
  newValue: string | null;
  itemId: number | null;
  createdAt: string;
}

export default function EditHistoryPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // ดึง username จาก URL pathname (สำหรับ /[username]/admin/edit-history)
  const urlMatch = pathname?.match(/^\/([^/]+)\/admin\/edit-history/);
  const urlUsername = urlMatch ? urlMatch[1] : null;
  
  // ส่ง username ไปให้ useAdminSession เพื่อใช้ token ที่ถูกต้อง
  useAdminSession(urlUsername || undefined);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<EditHistoryItem[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [selectedHistory, setSelectedHistory] = useState<EditHistoryItem | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(20); // แสดง 20 รายการแรก
  const [username, setUsername] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ใช้ token ตาม username จาก URL หรือ token เก่า
    let token: string | null = null;
    if (urlUsername) {
      const { getTokenForUser } = require("@/lib/jwt-utils");
      token = getTokenForUser(urlUsername);
    }
    
    if (!token) {
      token = localStorage.getItem("adminToken") || localStorage.getItem("authToken");
    }
    
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthenticated(true);
      setLoading(false);
      // ดึง username จาก token ที่ถูกต้อง
      const currentUsername = getUsernameFromToken(urlUsername || undefined);
      setUsername(currentUsername);
      fetchHistory();
    }
  }, [router, filter, urlUsername]);

  const fetchHistory = async () => {
    try {
      setError(null);
      const url = filter === "all"
        ? API_ENDPOINTS.EDIT_HISTORY
        : `${API_ENDPOINTS.EDIT_HISTORY}?page=${filter}`;
      const response = await apiRequest(url, {
        username: urlUsername || username || undefined,
        method: "GET",
        cache: "no-store",
      });

      // ตรวจสอบว่า response สำเร็จหรือไม่
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "เกิดข้อผิดพลาดในการโหลดข้อมูล" }));
        setError(errorData.message || `เกิดข้อผิดพลาด (${response.status})`);
        setHistory([]);
        setSelectedHistory(null);
        return;
      }

      const data = await response.json();

      // ตรวจสอบว่า data เป็น array หรือไม่
      if (!Array.isArray(data)) {
        console.error("API response is not an array:", data);
        setError("รูปแบบข้อมูลไม่ถูกต้อง");
        setHistory([]);
        setSelectedHistory(null);
        return;
      }

      // ตั้งค่า history และ selectedHistory
      setHistory(data);
      if (data && data.length > 0) {
        setSelectedHistory(data[0]);
      } else {
        setSelectedHistory(null);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
      setError("ไม่สามารถโหลดประวัติการแก้ไขได้ กรุณาลองใหม่อีกครั้ง");
      setHistory([]);
      setSelectedHistory(null);
    }
  };

  useEffect(() => {
    if (history.length > 0 && !selectedHistory) {
      setSelectedHistory(history[0]);
    }
  }, [history, selectedHistory]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-800";
      case "update":
        return "bg-blue-100 text-blue-800";
      case "delete":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPageName = (page: string) => {
    const pageNames: { [key: string]: string } = {
      profile: "ข้อมูลส่วนตัว",
      about: "เกี่ยวกับฉัน",
      portfolio: "ผลงาน",
      experience: "ประสบการณ์",
      education: "การศึกษา",
    };
    return pageNames[page] || page;
  };

  const renderValue = (value: string | null) => {
    if (!value) {
      return <span className="text-gray-400">-</span>;
    }

    try {
      const parsed = JSON.parse(value);
      return (
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm text-gray-800 overflow-auto max-h-60 whitespace-pre-wrap break-words">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      );
    } catch {
      return (
        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed">
          {value}
        </p>
      );
    }
  };

  const handleSelectHistory = (item: EditHistoryItem) => {
    setSelectedHistory(item);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b-2 border-blue-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={username ? `/${username}/admin` : "/admin/login"}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-2 mb-2"
              >
                <span>←</span>
                <span>กลับไปหน้า Dashboard</span>
              </Link>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-3xl">📜</span>
                ประวัติการแก้ไข
              </h1>
              <p className="text-xs text-gray-600 mt-1">ดูประวัติการเปลี่ยนแปลงข้อมูลทั้งหมด</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">รายการทั้งหมด</p>
                <p className="text-2xl font-bold text-blue-600">{history.length}</p>
              </div>
              <Link
                href={username ? `/${username}` : "/"}
                target="_blank"
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                🌐 ดูหน้าเว็บ
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* Filter */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl p-6 mb-6 border-2 border-blue-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-xl">🔍</span>
            กรองตามหมวดหมู่
          </h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 ${
                filter === "all"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="text-lg">📋</span>
              <span>ทั้งหมด</span>
            </button>
            <button
              onClick={() => setFilter("profile")}
              className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 ${
                filter === "profile"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="text-lg">👤</span>
              <span>ข้อมูลส่วนตัว</span>
            </button>
            <button
              onClick={() => setFilter("about")}
              className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 ${
                filter === "about"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="text-lg">📖</span>
              <span>เกี่ยวกับฉัน</span>
            </button>
            <button
              onClick={() => setFilter("portfolio")}
              className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 ${
                filter === "portfolio"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="text-lg">💼</span>
              <span>ผลงาน</span>
            </button>
            <button
              onClick={() => setFilter("experience")}
              className={`group px-6 py-3 rounded-xl font-semibold transition-all duration-300 transform hover:-translate-y-1 flex items-center gap-2 ${
                filter === "experience"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                  : "bg-white text-gray-700 hover:bg-gray-50 border-2 border-gray-200 hover:border-blue-300"
              }`}
            >
              <span className="text-lg">💼</span>
              <span>ประสบการณ์</span>
            </button>
          </div>
        </div>

        {/* History List */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl overflow-hidden border-2 border-blue-100">
          {error ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <p className="text-red-600 text-lg font-medium mb-2">เกิดข้อผิดพลาด</p>
              <p className="text-gray-600 text-sm">{error}</p>
              <button
                onClick={() => fetchHistory()}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-all"
              >
                ลองใหม่อีกครั้ง
              </button>
            </div>
          ) : history.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📝</div>
              <p className="text-gray-500 text-lg font-medium">ยังไม่มีประวัติการแก้ไข</p>
              <p className="text-gray-400 text-sm mt-2">เริ่มแก้ไขข้อมูลเพื่อดูประวัติที่นี่</p>
            </div>
          ) : (
            <div>
              <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-blue-100">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">📋</span>
                  รายการการแก้ไข ({history.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {history.slice(0, displayLimit).map((item, index) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelectHistory(item)}
                    className={`p-6 cursor-pointer transition-all duration-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 ${
                      selectedHistory?.id === item.id
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 border-l-4 border-l-blue-600"
                        : ""
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span
                            className={`px-3 py-1 text-xs font-bold rounded-full ${getActionColor(
                              item.action
                            )}`}
                          >
                            {item.action === "create" && "➕ เพิ่ม"}
                            {item.action === "update" && "✏️ แก้ไข"}
                            {item.action === "delete" && "🗑️ ลบ"}
                          </span>
                          <span className="px-3 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">
                            {getPageName(item.page)}
                          </span>
                          {item.section && (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                              {item.section}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 flex items-center gap-2">
                          <span className="text-lg">🕐</span>
                          {formatDate(item.createdAt)}
                        </p>
                      </div>
                      <button
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                          selectedHistory?.id === item.id
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-blue-100"
                        }`}
                      >
                        {selectedHistory?.id === item.id ? "✓ เลือกแล้ว" : "ดูรายละเอียด"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* ปุ่มโหลดเพิ่มเติม */}
              {history.length > displayLimit && (
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-t-2 border-blue-100 text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    แสดง {displayLimit} จาก {history.length} รายการ
                  </p>
                  <button
                    onClick={() => setDisplayLimit(displayLimit + 20)}
                    className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2 mx-auto"
                  >
                    <span>โหลดเพิ่มเติม</span>
                    <span className="text-xl group-hover:translate-y-1 transition-transform">⬇️</span>
                  </button>
                  
                  {displayLimit < history.length && (
                    <button
                      onClick={() => setDisplayLimit(history.length)}
                      className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                    >
                      แสดงทั้งหมด ({history.length} รายการ)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedHistory && (
          <div className="mt-6 bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border-2 border-blue-100 p-8 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-6 border-b-2 border-blue-100">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3 mb-2">
                  <span className="text-3xl">📄</span>
                  รายละเอียดการแก้ไข
                </h2>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span className="text-lg">🕐</span>
                  {formatDate(selectedHistory.createdAt)}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-4 py-2 text-sm font-bold rounded-xl bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-2 border-blue-200">
                  📍 {getPageName(selectedHistory.page)}
                </span>
                {selectedHistory.section && (
                  <span className="px-4 py-2 text-sm font-bold rounded-xl bg-gray-100 text-gray-700 border-2 border-gray-200">
                    📂 {selectedHistory.section}
                  </span>
                )}
                <span
                  className={`px-4 py-2 text-sm font-bold rounded-xl border-2 ${getActionColor(
                    selectedHistory.action
                  )}`}
                >
                  {selectedHistory.action === "create" && "➕ เพิ่ม"}
                  {selectedHistory.action === "update" && "✏️ แก้ไข"}
                  {selectedHistory.action === "delete" && "🗑️ ลบ"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border-2 border-red-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">📋</span>
                  <h3 className="text-lg font-bold text-red-700">ข้อมูลเดิม (Before)</h3>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-red-100 max-h-96 overflow-auto">
                  {renderValue(selectedHistory.oldValue)}
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">✨</span>
                  <h3 className="text-lg font-bold text-green-700">ข้อมูลใหม่ (After)</h3>
                </div>
                <div className="bg-white rounded-xl p-4 border-2 border-green-100 max-h-96 overflow-auto">
                  {renderValue(selectedHistory.newValue)}
                </div>
              </div>
            </div>
            
            {selectedHistory.itemId && (
              <div className="mt-6 pt-6 border-t-2 border-blue-100">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border-2 border-blue-200">
                  <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                    <span className="text-lg">🔢</span>
                    <span className="font-bold">ID ข้อมูลที่แก้ไข:</span>
                    <span className="px-3 py-1 bg-white rounded-lg font-mono text-blue-600">{selectedHistory.itemId}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
