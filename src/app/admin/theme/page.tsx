"use client";

/**
 * Admin Theme Settings - ตั้งค่าสีธีม
 * 
 * คืออะไร:
 * - หน้าสำหรับปรับแต่งสีธีมของเว็บไซต์
 * 
 * เอาไว้ทำไร:
 * - เปลี่ยนสีหลัก, สีรอง, สีเน้น
 * - เปลี่ยนสีพื้นหลัง, สีข้อความ
 * - เปลี่ยนสี Header และ Footer
 * - ดูตัวอย่างสีแบบ Live Preview
 * 
 * ฟีเจอร์:
 * - Color Picker สำหรับแต่ละสี
 * - แสดงตัวอย่างสีแบบ Real-time
 * - Reset เป็นค่าเริ่มต้น
 * - บันทึกไปยัง Database
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { API_ENDPOINTS, apiRequest } from "@/lib/api-config";
import { getUsernameFromToken } from "@/lib/jwt-utils";

interface SiteSettings {
  id?: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
}

const defaultSettings: SiteSettings = {
  primaryColor: "#3b82f6",
  secondaryColor: "#8b5cf6",
  accentColor: "#10b981",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  headerBgColor: "#ffffff",
  headerTextColor: "#1f2937",
  footerBgColor: "#1f2937",
  footerTextColor: "#ffffff",
};

export default function ThemeSettingsPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // ดึง username จาก URL pathname (สำหรับ /[username]/admin/theme)
  const urlMatch = pathname?.match(/^\/([^/]+)\/admin\/theme/);
  const urlUsername = urlMatch ? urlMatch[1] : null;
  
  // ส่ง username ไปให้ useAdminSession เพื่อใช้ token ที่ถูกต้อง
  useAdminSession(urlUsername || undefined);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
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
      loadSettings();
    }
  }, [router, urlUsername]);

  /**
   * โหลดการตั้งค่าจาก API
   */
  const loadSettings = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.THEME_ME, {
        username: urlUsername || username || undefined,
        method: "GET",
      });
      if (response.ok) {
        const data = await response.json();
        if (data && !data.error) {
          setSettings({
            primaryColor: data.primaryColor || defaultSettings.primaryColor,
            secondaryColor: data.secondaryColor || defaultSettings.secondaryColor,
            accentColor: data.accentColor || defaultSettings.accentColor,
            backgroundColor: data.backgroundColor || defaultSettings.backgroundColor,
            textColor: data.textColor || defaultSettings.textColor,
            headerBgColor: data.headerBgColor || defaultSettings.headerBgColor,
            headerTextColor: data.headerTextColor || defaultSettings.headerTextColor,
            footerBgColor: data.footerBgColor || defaultSettings.footerBgColor,
            footerTextColor: data.footerTextColor || defaultSettings.footerTextColor,
          });
        }
      }
    } catch (error) {
      console.error("Error loading theme preferences:", error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * บันทึกการตั้งค่า
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      // ตรวจสอบว่ามี token หรือไม่
      const token = localStorage.getItem("adminToken");
      if (!token) {
        alert("❌ กรุณาเข้าสู่ระบบก่อนบันทึก");
        setSaving(false);
        return;
      }

      // ตรวจสอบรูปแบบสีก่อนส่ง (ต้องเป็น #ffffff หรือ #ffffffff)
      const colorFields = [
        'primaryColor', 'secondaryColor', 'accentColor', 'backgroundColor',
        'textColor', 'headerBgColor', 'headerTextColor', 'footerBgColor', 'footerTextColor'
      ];
      
      const invalidColors: string[] = [];
      for (const field of colorFields) {
        const color = settings[field as keyof SiteSettings];
        if (color && !/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
          invalidColors.push(field);
        }
      }
      
      if (invalidColors.length > 0) {
        alert(`❌ สีต่อไปนี้ไม่ถูกต้อง (ต้องเป็นรูปแบบ #ffffff):\n${invalidColors.join(', ')}`);
        setSaving(false);
        return;
      }

      const response = await apiRequest(API_ENDPOINTS.THEME_UPDATE, {
        username: urlUsername || username || undefined,
        method: "PUT",
        body: JSON.stringify({
          primaryColor: settings.primaryColor,
          secondaryColor: settings.secondaryColor,
          accentColor: settings.accentColor,
          backgroundColor: settings.backgroundColor,
          textColor: settings.textColor,
          headerBgColor: settings.headerBgColor,
          headerTextColor: settings.headerTextColor,
          footerBgColor: settings.footerBgColor,
          footerTextColor: settings.footerTextColor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Theme saved:", data);
        alert("✅ บันทึกการตั้งค่าสำเร็จ!");
      } else {
        let errorMessage = "Unknown error";
        try {
          const errorText = await response.text();
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          // Handle validation errors (array of messages)
          if (errorData.message && Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join("\n");
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else {
            errorMessage = `HTTP ${response.status}: ${response.statusText}`;
          }
        } catch (parseError) {
          console.error("Failed to parse error response:", parseError);
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error("❌ Error saving theme:", errorMessage);
        alert(`❌ เกิดข้อผิดพลาดในการบันทึก:\n${errorMessage}`);
      }
    } catch (error) {
      console.error("Error saving theme preferences:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  };

  /**
   * Reset เป็นค่าเริ่มต้น
   */
  const handleReset = () => {
    if (confirm("คุณต้องการรีเซ็ตเป็นค่าเริ่มต้นหรือไม่?")) {
      setSettings(defaultSettings);
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
                <span className="text-4xl">🎨</span>
                ตั้งค่าสีธีม
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                ปรับแต่งสีสันของเว็บไซต์ตามความชอบ
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Color Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-pink-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span>🎨</span>
                เลือกสี
              </h2>

              <div className="space-y-6">
                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีหลัก (Primary Color)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.primaryColor}
                      onChange={(e) =>
                        setSettings({ ...settings, primaryColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.primaryColor}
                      onChange={(e) =>
                        setSettings({ ...settings, primaryColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีรอง (Secondary Color)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.secondaryColor}
                      onChange={(e) =>
                        setSettings({ ...settings, secondaryColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.secondaryColor}
                      onChange={(e) =>
                        setSettings({ ...settings, secondaryColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีเน้น (Accent Color)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.accentColor}
                      onChange={(e) =>
                        setSettings({ ...settings, accentColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.accentColor}
                      onChange={(e) =>
                        setSettings({ ...settings, accentColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Background Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีพื้นหลัง (Background)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.backgroundColor}
                      onChange={(e) =>
                        setSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.backgroundColor}
                      onChange={(e) =>
                        setSettings({ ...settings, backgroundColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Text Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีข้อความ (Text Color)
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.textColor}
                      onChange={(e) =>
                        setSettings({ ...settings, textColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.textColor}
                      onChange={(e) =>
                        setSettings({ ...settings, textColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Header BG Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีพื้นหลัง Header
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.headerBgColor}
                      onChange={(e) =>
                        setSettings({ ...settings, headerBgColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.headerBgColor}
                      onChange={(e) =>
                        setSettings({ ...settings, headerBgColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Header Text Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีตัวอักษร Header
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.headerTextColor}
                      onChange={(e) =>
                        setSettings({ ...settings, headerTextColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.headerTextColor}
                      onChange={(e) =>
                        setSettings({ ...settings, headerTextColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Footer BG Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีพื้นหลัง Footer
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.footerBgColor}
                      onChange={(e) =>
                        setSettings({ ...settings, footerBgColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.footerBgColor}
                      onChange={(e) =>
                        setSettings({ ...settings, footerBgColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>

                {/* Footer Text Color */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สีตัวอักษร Footer
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={settings.footerTextColor}
                      onChange={(e) =>
                        setSettings({ ...settings, footerTextColor: e.target.value })
                      }
                      className="w-20 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={settings.footerTextColor}
                      onChange={(e) =>
                        setSettings({ ...settings, footerTextColor: e.target.value })
                      }
                      className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-2 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4 mt-8">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า"}
                </button>
                <button
                  onClick={handleReset}
                  className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all"
                >
                  🔄 Reset
                </button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-pink-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <span>👁️</span>
                ตัวอย่าง
              </h2>

              <div className="space-y-6">
                {/* Color Palette Preview */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div
                      className="w-full h-24 rounded-lg shadow-md mb-2"
                      style={{ backgroundColor: settings.primaryColor }}
                    ></div>
                    <p className="text-xs text-gray-600 font-semibold">Primary</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-full h-24 rounded-lg shadow-md mb-2"
                      style={{ backgroundColor: settings.secondaryColor }}
                    ></div>
                    <p className="text-xs text-gray-600 font-semibold">Secondary</p>
                  </div>
                  <div className="text-center">
                    <div
                      className="w-full h-24 rounded-lg shadow-md mb-2"
                      style={{ backgroundColor: settings.accentColor }}
                    ></div>
                    <p className="text-xs text-gray-600 font-semibold">Accent</p>
                  </div>
                </div>

                {/* Header Preview */}
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">Header Preview:</p>
                  <div
                    className="rounded-lg p-4 shadow-md"
                    style={{ backgroundColor: settings.headerBgColor }}
                  >
                    <div
                      className="text-lg font-bold"
                      style={{ color: settings.headerTextColor }}
                    >
                      Header Example
                    </div>
                  </div>
                </div>

                {/* Content Preview */}
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">Content Preview:</p>
                  <div
                    className="rounded-lg p-6 shadow-md"
                    style={{ backgroundColor: settings.backgroundColor }}
                  >
                    <h3
                      className="text-xl font-bold mb-2"
                      style={{ color: settings.primaryColor }}
                    >
                      ตัวอย่างหัวข้อ
                    </h3>
                    <p
                      className="mb-3"
                      style={{ color: settings.textColor }}
                    >
                      นี่คือตัวอย่างข้อความธรรมดา ที่จะแสดงด้วยสีที่คุณเลือก
                    </p>
                    <button
                      className="px-4 py-2 rounded-lg text-white font-semibold shadow-md"
                      style={{ backgroundColor: settings.accentColor }}
                    >
                      ปุ่มตัวอย่าง
                    </button>
                  </div>
                </div>

                {/* Footer Preview */}
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">Footer Preview:</p>
                  <div
                    className="rounded-lg p-4 shadow-md"
                    style={{ backgroundColor: settings.footerBgColor }}
                  >
                    <p
                      className="text-center text-sm"
                      style={{ color: settings.footerTextColor }}
                    >
                      © 2025 Your Website. All rights reserved.
                    </p>
                  </div>
                </div>

                {/* Gradient Preview */}
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-2">Gradient Preview:</p>
                  <div
                    className="rounded-lg p-6 shadow-md text-center"
                    style={{
                      background: `linear-gradient(135deg, ${settings.primaryColor}, ${settings.secondaryColor})`,
                    }}
                  >
                    <p className="text-white font-bold text-lg">
                      Gradient Background Example
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>💡</span>
                เคล็ดลับ
              </h3>
              <ul className="text-sm text-blue-800 space-y-2">
                <li>• ใช้สีที่ตัดกันเพื่อความชัดเจน</li>
                <li>• ทดสอบดูบนหน้าจริงหลังบันทึก</li>
                <li>• สีควรสะท้อนอัตลักษณ์ของแบรนด์</li>
                <li>• ระวังสีพื้นหลังกับสีข้อความให้อ่านง่าย</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

