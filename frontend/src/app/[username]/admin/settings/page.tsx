"use client";

/**
 * User Settings Page - หน้าตั้งค่าผู้ใช้
 * 
 * Path: /[username]/admin/settings
 * 
 * คืออะไร:
 * - หน้าสำหรับตั้งค่าการใช้งานของผู้ใช้แต่ละคน
 * - ตั้งค่าการเข้าสู่ระบบ เช่น อนุญาตให้ login พร้อมกันหลายคนได้หรือไม่
 */

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../../hooks/useAdminSession";
import { API_ENDPOINTS, apiRequest } from "../../../../lib/api-config";
import { getUsernameFromToken } from "../../../../lib/jwt-utils";

interface UserSettings {
  allowMultipleSessions: boolean;
}

export default function UserSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const urlUsername = params?.username as string;
  useAdminSession();
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    allowMultipleSessions: true,
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    } else {
      const currentUsername = getUsernameFromToken();
      // ตรวจสอบว่า username ตรงกันหรือไม่
      if (currentUsername && currentUsername.toLowerCase() === urlUsername.toLowerCase()) {
        setAuthenticated(true);
        setUsername(currentUsername);
        loadSettings();
      } else {
        router.push("/admin/login");
      }
    }
  }, [router, urlUsername]);

  /**
   * โหลดการตั้งค่าจาก API
   */
  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.USER_SETTINGS_ME, {
        method: "GET",
        cache: "no-store",
        username: urlUsername, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
      });

      if (!response.ok) {
        throw new Error("ไม่สามารถโหลดการตั้งค่าได้");
      }

      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setMessage({
        type: "error",
        text: "ไม่สามารถโหลดการตั้งค่าได้",
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * บันทึกการตั้งค่า
   */
  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await apiRequest(API_ENDPOINTS.USER_SETTINGS_ME, {
        method: "PUT",
        body: JSON.stringify(settings),
        username: urlUsername, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "เกิดข้อผิดพลาด" }));
        throw new Error(errorData.message || "ไม่สามารถบันทึกการตั้งค่าได้");
      }

      setMessage({
        type: "success",
        text: "บันทึกการตั้งค่าสำเร็จ",
      });

      // ลบ message หลังจาก 3 วินาที
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error: any) {
      console.error("Error saving settings:", error);
      setMessage({
        type: "error",
        text: error.message || "ไม่สามารถบันทึกการตั้งค่าได้",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-blue-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">⚙️</span>
                ตั้งค่าผู้ใช้
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {username && (
                  <>
                    การตั้งค่าสำหรับ <span className="font-semibold text-blue-600">{username}</span>
                  </>
                )}
              </p>
            </div>
            <Link
              href={`/${urlUsername}/admin`}
              className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
            >
              ← กลับ
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === "success"
                ? "bg-green-50 border-2 border-green-200 text-green-700"
                : "bg-red-50 border-2 border-red-200 text-red-700"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {message.type === "success" ? "✅" : "⚠️"}
              </span>
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Settings Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">การตั้งค่าการเข้าสู่ระบบ</h2>

          {/* Allow Multiple Sessions */}
          <div className="mb-8 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-100">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <span>🔐</span>
                  อนุญาตให้เข้าสู่ระบบพร้อมกันหลายคน
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  เมื่อเปิดใช้งาน คุณสามารถเข้าสู่ระบบจากหลายอุปกรณ์หรือเบราว์เซอร์พร้อมกันได้
                  <br />
                  เมื่อปิดใช้งาน การเข้าสู่ระบบใหม่จะทำให้ session เก่าทั้งหมดถูกยกเลิก
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.allowMultipleSessions}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      allowMultipleSessions: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {/* Status Info */}
            <div
              className={`p-4 rounded-lg ${
                settings.allowMultipleSessions
                  ? "bg-green-100 border-2 border-green-200"
                  : "bg-yellow-100 border-2 border-yellow-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">
                  {settings.allowMultipleSessions ? "✅" : "⚠️"}
                </span>
                <div>
                  <p className="font-semibold text-gray-900 mb-1">
                    {settings.allowMultipleSessions
                      ? "เปิดใช้งาน"
                      : "ปิดใช้งาน"}
                  </p>
                  <p className="text-sm text-gray-700">
                    {settings.allowMultipleSessions
                      ? "คุณสามารถเข้าสู่ระบบจากหลายอุปกรณ์พร้อมกันได้"
                      : "การเข้าสู่ระบบใหม่จะทำให้ session เก่าถูกยกเลิก"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex gap-4 justify-end">
            <button
              onClick={() => router.push(`/${urlUsername}/admin`)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-6 rounded-xl transition-all"
            >
              ยกเลิก
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>กำลังบันทึก...</span>
                </>
              ) : (
                <>
                  <span>💾</span>
                  <span>บันทึกการตั้งค่า</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6 border-2 border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">💡</span>
            ข้อมูลเพิ่มเติม
          </h3>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">•</span>
              <p>
                <strong>การเข้าสู่ระบบพร้อมกัน:</strong> เมื่อเปิดใช้งาน คุณสามารถ login จากหลายอุปกรณ์ได้
                เช่น คอมพิวเตอร์และมือถือพร้อมกัน
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">•</span>
              <p>
                <strong>ความปลอดภัย:</strong> การปิดใช้งานจะช่วยเพิ่มความปลอดภัย
                เพราะจะทำให้ session เก่าถูกยกเลิกเมื่อมีการ login ใหม่
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-500 font-bold">•</span>
              <p>
                <strong>การตั้งค่าเริ่มต้น:</strong> ระบบจะอนุญาตให้เข้าสู่ระบบพร้อมกันหลายคนเป็นค่าเริ่มต้น
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

