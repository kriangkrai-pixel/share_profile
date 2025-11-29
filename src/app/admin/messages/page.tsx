"use client";

/**
 * Admin Messages - จัดการข้อความติดต่อ
 * 
 * คืออะไร:
 * - หน้าแสดงข้อความที่ลูกค้าส่งมาจากฟอร์มติดต่อ
 * 
 * เอาไว้ทำไร:
 * - ดูข้อความจากลูกค้า
 * - ทำเครื่องหมายว่าอ่านแล้ว/ยังไม่อ่าน
 * - ลบข้อความ
 * - กรองดูเฉพาะข้อความใหม่
 * 
 * ฟีเจอร์:
 * - แสดงรายการข้อความทั้งหมด
 * - Filter: ทั้งหมด / ยังไม่อ่าน / อ่านแล้ว
 * - Badge สีต่างกันตามสถานะ
 * - แสดงวันที่-เวลา
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";
import { getUsernameFromToken } from "@/lib/jwt-utils";

interface ContactMessage {
  id: number;
  name: string;
  email: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  recipientId?: number | null;
}

type FilterType = "all" | "unread" | "read";

export default function MessagesPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // ดึง username จาก URL pathname (สำหรับ /[username]/admin/messages)
  const urlMatch = pathname?.match(/^\/([^/]+)\/admin\/messages/);
  const urlUsername = urlMatch ? urlMatch[1] : null;
  
  // ส่ง username ไปให้ useAdminSession เพื่อใช้ token ที่ถูกต้อง
  useAdminSession(urlUsername || undefined);
  const [authenticated, setAuthenticated] = useState(false);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [username, setUsername] = useState<string | null>(null);

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
      // ดึง username จาก token ที่ถูกต้อง
      const currentUsername = getUsernameFromToken(urlUsername || undefined);
      setUsername(currentUsername);
      loadMessages();
    }
  }, [router, urlUsername]);

  /**
   * โหลดข้อความทั้งหมดจาก API
   */
  const handleUnauthorized = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("authToken");
    localStorage.removeItem("adminLoginTime");
    router.push("/admin/login");
  };

  const loadMessages = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.CONTACT, {
        username: urlUsername || username || undefined,
        method: "GET",
        cache: "no-store",
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          handleUnauthorized();
          return;
        }
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(`⚠️ Failed to load messages: ${response.status} ${response.statusText}`, errorText);
        setMessages([]);
        return;
      }
      
      const data = await response.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading messages:", error);
      if (isConnectionError(error)) {
        console.warn("⚠️ Backend may not be running.");
      }
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * กรองข้อความตาม Filter
   */
  useEffect(() => {
    let filtered = messages;
    if (filter === "unread") {
      filtered = messages.filter((m) => !m.isRead);
    } else if (filter === "read") {
      filtered = messages.filter((m) => m.isRead);
    }
    setFilteredMessages(filtered);
  }, [messages, filter]);

  /**
   * ทำเครื่องหมายว่าอ่านแล้ว
   */
  const handleMarkAsRead = async (id: number, currentStatus: boolean) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.CONTACT, {
        username: urlUsername || username || undefined,
        method: "PUT",
        body: JSON.stringify({ id, isRead: !currentStatus }),
      });

      if (response.ok) {
        await loadMessages();
        if (selectedMessage?.id === id) {
          setSelectedMessage({ ...selectedMessage, isRead: !currentStatus });
        }
      } else {
        if (response.status === 401 || response.status === 403) {
          handleUnauthorized();
          return;
        }
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`❌ Failed to update message: ${response.status} ${response.statusText}`, errorText);
      }
    } catch (error) {
      console.error("Error updating message:", error);
      if (isConnectionError(error)) {
        alert("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง");
      }
    }
  };

  /**
   * ลบข้อความ
   */
  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`คุณต้องการลบข้อความจาก "${name}" หรือไม่?`)) return;

    try {
      const response = await apiRequest(`${API_ENDPOINTS.CONTACT}?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadMessages();
        if (selectedMessage?.id === id) {
          setSelectedMessage(null);
        }
        alert("✅ ลบข้อความสำเร็จ!");
      } else {
        if (response.status === 401 || response.status === 403) {
          handleUnauthorized();
          return;
        }
        alert("❌ เกิดข้อผิดพลาดในการลบ");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("❌ เกิดข้อผิดพลาดในการลบ");
    }
  };

  /**
   * แปลงวันที่เป็นรูปแบบไทย
   */
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

  /**
   * เลือกข้อความเพื่อดูรายละเอียด
   */
  const handleSelectMessage = async (message: ContactMessage) => {
    setSelectedMessage(message);
    
    // ถ้ายังไม่อ่าน ทำเครื่องหมายว่าอ่านแล้วอัตโนมัติ
    if (!message.isRead) {
      await handleMarkAsRead(message.id, message.isRead);
    }
  };

  if (!authenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const unreadCount = messages.filter((m) => !m.isRead).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-pink-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={username ? `/${username}/admin` : "/admin/login"}
                className="text-pink-600 hover:text-pink-700 text-sm font-medium inline-flex items-center gap-2 mb-2"
              >
                <span>←</span>
                <span>กลับไปหน้า Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">📧</span>
                ข้อความติดต่อ
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full animate-bounce">
                    {unreadCount} ใหม่
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                ข้อความจากลูกค้าทั้งหมด {messages.length} รายการ
              </p>
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Buttons */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`${
              filter === "all"
                ? "bg-gradient-to-r from-pink-600 to-purple-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            } font-bold py-2 px-6 rounded-xl border-2 border-pink-300 transition-all shadow-md`}
          >
            📧 ทั้งหมด ({messages.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`${
              filter === "unread"
                ? "bg-gradient-to-r from-red-600 to-pink-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            } font-bold py-2 px-6 rounded-xl border-2 border-red-300 transition-all shadow-md relative`}
          >
            🔴 ยังไม่อ่าน ({unreadCount})
            {unreadCount > 0 && (
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center animate-ping"></span>
            )}
          </button>
          <button
            onClick={() => setFilter("read")}
            className={`${
              filter === "read"
                ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white"
                : "bg-white text-gray-700 hover:bg-gray-50"
            } font-bold py-2 px-6 rounded-xl border-2 border-green-300 transition-all shadow-md`}
          >
            ✅ อ่านแล้ว ({messages.length - unreadCount})
          </button>
        </div>

        {/* Messages Grid */}
        {filteredMessages.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-pink-100">
            <span className="text-6xl mb-4 block">📭</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {filter === "all" && "ยังไม่มีข้อความ"}
              {filter === "unread" && "ไม่มีข้อความใหม่"}
              {filter === "read" && "ไม่มีข้อความที่อ่านแล้ว"}
            </h3>
            <p className="text-gray-600">
              {filter === "all" && "รอลูกค้าส่งข้อความมาจากหน้าเว็บ"}
              {filter === "unread" && "ยอดเยี่ยม! คุณอ่านข้อความหมดแล้ว"}
              {filter === "read" && "เลือกดู 'ทั้งหมด' หรือ 'ยังไม่อ่าน'"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Message List */}
            <div className="space-y-4">
              {filteredMessages.map((message, index) => (
                <div
                  key={message.id}
                  onClick={() => handleSelectMessage(message)}
                  className={`bg-white rounded-2xl shadow-lg p-6 border-2 ${
                    selectedMessage?.id === message.id
                      ? "border-pink-400 ring-4 ring-pink-200"
                      : message.isRead
                      ? "border-gray-200 hover:border-gray-300"
                      : "border-pink-200 hover:border-pink-300"
                  } cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          message.isRead ? "bg-gray-300" : "bg-red-500 animate-pulse"
                        }`}
                      ></div>
                      <div>
                        <h3 className="font-bold text-gray-900">{message.name}</h3>
                        <p className="text-sm text-gray-600">{message.email}</p>
                      </div>
                    </div>
                    {!message.isRead && (
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        NEW
                      </span>
                    )}
                  </div>

                  <p className="text-gray-700 text-sm line-clamp-2 mb-3">
                    {message.message}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>📅 {formatDate(message.createdAt)}</span>
                    <span className="text-pink-600 font-semibold">คลิกเพื่อดู →</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Detail */}
            <div className="lg:sticky lg:top-24 h-fit">
              {selectedMessage ? (
                <div className="bg-white rounded-2xl shadow-2xl p-8 border-2 border-pink-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <span>📧</span>
                      รายละเอียดข้อความ
                    </h2>
                    <button
                      onClick={() => setSelectedMessage(null)}
                      className="text-gray-500 hover:text-gray-700 text-2xl"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Sender Info */}
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl p-6 mb-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-pink-500 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold">
                        {selectedMessage.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {selectedMessage.name}
                        </h3>
                        <a
                          href={`mailto:${selectedMessage.email}`}
                          className="text-pink-600 hover:text-pink-700 text-sm font-semibold"
                        >
                          {selectedMessage.email}
                        </a>
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <span>📅</span>
                      <span>{formatDate(selectedMessage.createdAt)}</span>
                    </div>
                  </div>

                  {/* Message Content */}
                  <div className="mb-6">
                    <h4 className="text-sm font-bold text-gray-700 mb-3">ข้อความ:</h4>
                    <div className="bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
                      <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {selectedMessage.message}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="mb-6">
                    <span
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
                        selectedMessage.isRead
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {selectedMessage.isRead ? "✅ อ่านแล้ว" : "🔴 ยังไม่อ่าน"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        handleMarkAsRead(selectedMessage.id, selectedMessage.isRead)
                      }
                      className={`flex-1 ${
                        selectedMessage.isRead
                          ? "bg-gray-500 hover:bg-gray-600"
                          : "bg-green-500 hover:bg-green-600"
                      } text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all`}
                    >
                      {selectedMessage.isRead ? "❌ ทำเครื่องหมายว่ายังไม่อ่าน" : "✅ ทำเครื่องหมายว่าอ่านแล้ว"}
                    </button>
                    <button
                      onClick={() =>
                        handleDelete(selectedMessage.id, selectedMessage.name)
                      }
                      className="bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
                    >
                      🗑️ ลบ
                    </button>
                  </div>

                  {/* Quick Reply */}
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Re: ข้อความจากหน้าเว็บ&body=สวัสดีครับ/ค่ะ คุณ ${selectedMessage.name}%0D%0A%0D%0A`}
                      className="block w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all text-center"
                    >
                      📨 ตอบกลับทางอีเมล
                    </a>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-gray-200">
                  <span className="text-6xl mb-4 block">👈</span>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    เลือกข้อความเพื่อดูรายละเอียด
                  </h3>
                  <p className="text-gray-600">คลิกที่ข้อความทางซ้ายมือ</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

