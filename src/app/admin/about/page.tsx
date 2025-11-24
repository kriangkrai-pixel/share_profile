"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { useProfile } from "../../context/ProfileContext";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";
import { getUsernameFromToken } from "@/lib/jwt-utils";

export default function AboutPage() {
  const router = useRouter();
  useAdminSession();
  const { profile, updateProfile } = useProfile();
  const [authenticated, setAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loadingWidget, setLoadingWidget] = useState(true);
  const [heroWidgetId, setHeroWidgetId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: profile.name,
    description: profile.description,
    bio: profile.bio,
    achievement: profile.achievement,
    skills: profile.skills.join("\n"),
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    welcomeMessage: "ยินดีต้อนรับ",
    portfolioButtonText: "ดูผลงาน",
    contactButtonText: "ติดต่อฉัน",
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthenticated(true);
      const currentUsername = getUsernameFromToken();
      setUsername(currentUsername);
      loadHeroWidgetData();
    }
  }, [router]);

  useEffect(() => {
    console.log("🔄 Profile data changed, updating formData:", {
      name: profile.name,
      email: profile.email,
      skillsCount: profile.skills?.length || 0,
    });
    setFormData((prev) => ({
      ...prev,
      name: profile.name,
      description: profile.description,
      bio: profile.bio,
      achievement: profile.achievement,
      skills: profile.skills?.join("\n") || "",
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
    }));
    console.log("✅ FormData updated from profile");
  }, [profile]);

  /**
   * โหลดข้อมูลจาก Hero Widget
   */
  const loadHeroWidgetData = async () => {
    try {
      setLoadingWidget(true);
      const response = await apiRequest(API_ENDPOINTS.LAYOUT, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (response.ok) {
        const layoutData = await response.json();
        if (layoutData && layoutData.widgets) {
          const heroWidget = layoutData.widgets.find((w: any) => w.type === "hero");
          if (heroWidget) {
            setHeroWidgetId(heroWidget.id);
            
            // Parse settings
            let settings = {};
            if (heroWidget.settings) {
              try {
                const cleaned = heroWidget.settings
                  .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                  .trim();
                if (cleaned && (cleaned.startsWith('{') || cleaned.startsWith('['))) {
                  let fixedJson = cleaned
                    .replace(/'/g, '"')
                    .replace(/(\w+):/g, '"$1":');
                  settings = JSON.parse(fixedJson);
                }
              } catch (error) {
                console.warn("Error parsing widget settings:", error);
              }
            }

            // อัปเดต formData ด้วยข้อมูลจาก widget settings
            setFormData((prev) => ({
              ...prev,
              welcomeMessage: (settings as any).welcomeMessage || "ยินดีต้อนรับ",
              portfolioButtonText: (settings as any).portfolioButtonText || "ดูผลงาน",
              contactButtonText: (settings as any).contactButtonText || "ติดต่อฉัน",
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error loading hero widget data:", error);
    } finally {
      setLoadingWidget(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Validate email format
      if (formData.email && formData.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
          alert("❌ รูปแบบอีเมลไม่ถูกต้อง กรุณากรอกอีเมลที่ถูกต้อง");
          setSaving(false);
          return;
        }
      }

      const skillsArray = formData.skills
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s);

      // อัปเดต profile data รวมถึงรูปภาพ
      try {
        await updateProfile({
          name: formData.name,
          description: formData.description,
          bio: formData.bio,
          achievement: formData.achievement,
          skills: skillsArray,
          email: formData.email,
          phone: formData.phone,
          location: formData.location,
        });
      } catch (error: any) {
        console.error("Error updating profile:", error);
        const errorMessage = error?.message || "เกิดข้อผิดพลาดในการบันทึกข้อมูล";
        if (errorMessage.includes("heroImage") || errorMessage.includes("contactImage") || errorMessage.includes("image")) {
          alert(`❌ เกิดข้อผิดพลาดในการอัปโหลดรูปภาพ: ${errorMessage}\n\nกรุณาลองลดขนาดรูปภาพหรือใช้รูปแบบอื่น`);
        } else {
          alert(`❌ ${errorMessage}`);
        }
        setSaving(false);
        return;
      }

      // อัปเดต Hero Widget settings
      if (heroWidgetId) {
        try {
          // ดึง settings ปัจจุบัน
          const layoutResponse = await apiRequest(API_ENDPOINTS.LAYOUT, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });

          if (layoutResponse.ok) {
            const layoutData = await layoutResponse.json();
            const heroWidget = layoutData.widgets?.find((w: any) => w.id === heroWidgetId);
            
            let currentSettings = {};
            if (heroWidget?.settings) {
              try {
                const cleaned = heroWidget.settings
                  .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
                  .trim();
                if (cleaned && (cleaned.startsWith('{') || cleaned.startsWith('['))) {
                  let fixedJson = cleaned
                    .replace(/'/g, '"')
                    .replace(/(\w+):/g, '"$1":');
                  currentSettings = JSON.parse(fixedJson);
                }
              } catch (error) {
                console.warn("Error parsing current settings:", error);
              }
            }

            // รวม settings ใหม่กับ settings เดิม
            const newSettings = {
              ...currentSettings,
              welcomeMessage: formData.welcomeMessage,
              portfolioButtonText: formData.portfolioButtonText,
              contactButtonText: formData.contactButtonText,
            };

            // อัปเดต widget
            await apiRequest(API_ENDPOINTS.WIDGETS, {
              method: "PUT",
              body: JSON.stringify({
                id: heroWidgetId,
                settings: JSON.stringify(newSettings),
              }),
            });
          }
        } catch (widgetError) {
          console.warn("Error updating widget settings:", widgetError);
          // ไม่ throw error เพื่อให้บันทึกข้อมูลอื่นได้
        }
      }

      // Log history
      try {
        await apiRequest(API_ENDPOINTS.EDIT_HISTORY, {
          method: "POST",
          body: JSON.stringify({
            page: "About",
            action: "update",
            newValue: "Updated profile information and hero section",
          }),
        });
      } catch (historyError) {
        // Ignore history logging errors
        console.warn("Failed to log edit history:", historyError);
      }

      window.dispatchEvent(new Event("profileUpdated"));
      alert("✅ บันทึกข้อมูลสำเร็จ!");
    } catch (error: any) {
      console.error("Error saving:", error);
      
      // จัดการ error จาก API
      let errorMessage = "❌ เกิดข้อผิดพลาดในการบันทึก";
      
      if (error?.message) {
        // ถ้าเป็น validation error จาก backend
        if (error.message.includes("Failed to update profile: 400")) {
          // ดึง error message ที่ชัดเจนจาก error message
          const detailedMessage = error.message.replace("Failed to update profile: 400", "").trim();
          if (detailedMessage) {
            errorMessage = "❌ " + detailedMessage;
          } else {
            errorMessage = "❌ ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบรูปแบบอีเมลและข้อมูลอื่นๆ";
          }
        } else if (error.message.includes("Failed to update profile: 500")) {
          errorMessage = "❌ เกิดข้อผิดพลาดในเซิร์ฟเวอร์ กรุณาลองใหม่อีกครั้ง หรือตรวจสอบขนาดรูปภาพ";
        } else if (error.message.includes("รูปแบบอีเมลไม่ถูกต้อง")) {
          errorMessage = "❌ " + error.message;
        } else {
          errorMessage = "❌ " + error.message;
        }
      }
      
      // ถ้าเป็น connection error
      if (isConnectionError(error)) {
        errorMessage = "❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต";
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-purple-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-purple-600 hover:text-purple-700 text-sm font-medium inline-flex items-center gap-2 mb-2"
              >
                <span>←</span>
                <span>กลับไปหน้า Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">👤</span>
                เกี่ยวกับเรา
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                แก้ไขข้อมูลส่วนตัว ประวัติ และทักษะ
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
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* ข้อมูลส่วนตัว */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              ข้อมูลส่วนตัว
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="ระบุชื่อ-นามสกุล"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  คำอธิบายสั้นๆ (Hero Section)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับตัวคุณ"
                />
              </div>
            </div>
          </div>

          {/* Hero Section Settings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-orange-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              Hero Section Settings
            </h2>

            <div className="space-y-6">
              {/* Welcome Message */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Welcome Message (ข้อความต้อนรับ)
                </label>
                <input
                  type="text"
                  value={formData.welcomeMessage}
                  onChange={(e) =>
                    setFormData({ ...formData, welcomeMessage: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="ยินดีต้อนรับ"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 ข้อความที่แสดงใน badge ต้อนรับ (เช่น "ยินดีต้อนรับ 👋")
                </p>
              </div>

              {/* Button Texts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ข้อความปุ่ม "ดูผลงาน"
                  </label>
                  <input
                    type="text"
                    value={formData.portfolioButtonText}
                    onChange={(e) =>
                      setFormData({ ...formData, portfolioButtonText: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    placeholder="ดูผลงาน"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ข้อความปุ่ม "ติดต่อฉัน"
                  </label>
                  <input
                    type="text"
                    value={formData.contactButtonText}
                    onChange={(e) =>
                      setFormData({ ...formData, contactButtonText: e.target.value })
                    }
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    placeholder="ติดต่อฉัน"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* ประวัติส่วนตัว */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">📖</span>
              ประวัติส่วนตัว
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Bio (ประวัติ)
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={6}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="เขียนประวัติส่วนตัวของคุณ"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ความสำเร็จ (Achievement)
                </label>
                <textarea
                  value={formData.achievement}
                  onChange={(e) =>
                    setFormData({ ...formData, achievement: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="ความสำเร็จที่ภาคภูมิใจ"
                />
              </div>
            </div>
          </div>

          {/* ทักษะ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              ทักษะ (Skills)
            </h2>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                รายการทักษะ (แต่ละบรรทัดคือ 1 ทักษะ)
              </label>
              <textarea
                value={formData.skills}
                onChange={(e) =>
                  setFormData({ ...formData, skills: e.target.value })
                }
                rows={10}
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-sm"
                placeholder="JavaScript&#10;TypeScript&#10;React&#10;Next.js&#10;..."
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 เขียนทักษะแต่ละอันขึ้นบรรทัดใหม่
              </p>
            </div>
          </div>

          {/* ข้อมูลติดต่อ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">📧</span>
              ข้อมูลติดต่อ
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  อีเมล <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="example@mail.com"
                  pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
                  title="กรุณากรอกอีเมลที่ถูกต้อง เช่น example@mail.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 อีเมลต้องเป็นรูปแบบที่ถูกต้อง (เช่น example@mail.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  เบอร์โทร
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="0XX-XXX-XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ที่อยู่
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="จังหวัด, ประเทศ"
                />
              </div>
            </div>
          </div>

          {/* Save Button (Sticky) */}
          <div className="sticky bottom-8 flex justify-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-12 rounded-full shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {saving ? "กำลังบันทึก..." : "💾 บันทึกทั้งหมด"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

