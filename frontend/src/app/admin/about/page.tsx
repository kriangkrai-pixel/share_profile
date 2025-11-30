"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { useProfile } from "../../context/ProfileContext";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "../../../lib/api-config";
import { getUsernameFromToken } from "../../../lib/jwt-utils";

export default function AboutPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // ดึง username จาก URL pathname (สำหรับ /[username]/admin/about)
  const urlMatch = pathname?.match(/^\/([^/]+)\/admin\/about/);
  const urlUsername = urlMatch ? urlMatch[1] : null;
  
  // Debug: log pathname และ urlUsername
  console.log("🔍 About Page - pathname:", pathname, "urlUsername:", urlUsername);
  
  // ส่ง username ไปให้ useAdminSession เพื่อใช้ token ที่ถูกต้อง
  useAdminSession(urlUsername || undefined);
  const { profile, updateProfile } = useProfile();
  const [authenticated, setAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [loadingWidget, setLoadingWidget] = useState(true);
  const [heroWidgetId, setHeroWidgetId] = useState<number | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileData, setProfileData] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    bio: "",
    achievement: "",
    skills: "",
    email: "",
    phone: "",
    location: "",
    welcomeMessage: "ยินดีต้อนรับ",
    portfolioButtonText: "ดูผลงาน",
    contactButtonText: "ติดต่อฉัน",
  });

  // โหลดข้อมูล profile โดยตรงจาก API พร้อมส่ง username
  const loadProfile = async (targetUsername?: string) => {
    try {
      setLoadingProfile(true);
      // ใช้ username ที่ส่งมา หรือ urlUsername หรือ username state
      const finalUsername = targetUsername || urlUsername || username;
      console.log("🔄 Loading profile for username:", finalUsername, {
        targetUsername,
        urlUsername,
        usernameState: username
      });
      
      if (!finalUsername) {
        console.error("❌ No username provided to loadProfile");
        setLoadingProfile(false);
        return;
      }
      
      const response = await apiRequest(API_ENDPOINTS.PROFILE, {
        method: "GET",
        cache: "no-store",
        username: finalUsername, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
      });
      
      console.log("📥 Profile API response status:", response.status, response.ok, "for username:", finalUsername);
      
      if (response.ok) {
        // ตรวจสอบ Content-Type เพื่อให้แน่ใจว่าเป็น JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          console.warn("⚠️ Response is not JSON, content-type:", contentType);
        }
        
        const data = await response.json();
        console.log("📥 Profile data received:", {
          hasData: !!data,
          name: data?.name || "no name",
          nameType: typeof data?.name,
          nameLength: data?.name?.length,
          nameBytes: data?.name ? new TextEncoder().encode(data.name).length : 0,
          email: data?.email || "no email",
          username: finalUsername
        });
        
        if (data && !data.error) {
          setProfileData(data);
          
          // Helper function เพื่อล้างข้อมูลที่ผิดพลาด (เช่น encoding issues)
          // แต่ไม่ลบข้อมูลที่ถูกต้องออก
          const cleanString = (str: any): string => {
            if (!str) return "";
            if (typeof str !== "string") {
              try {
                str = String(str);
              } catch {
                return "";
              }
            }
            
            // ลบเฉพาะ null bytes และ control characters ที่เป็นอันตราย
            // แต่เก็บ Thai characters และ Unicode characters อื่นๆ ไว้
            let cleaned = str
              .replace(/\0/g, '') // ลบ null bytes เท่านั้น
              .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, ''); // ลบเฉพาะ control characters ที่เป็นอันตราย
            
            // ไม่ trim เพราะอาจลบช่องว่างที่จำเป็น
            // .trim();
            
            // ตรวจสอบว่ามี invalid UTF-8 sequences หรือไม่ (แต่ไม่ลบออกถ้าเป็น valid)
            try {
              // ลอง encode/decode เพื่อตรวจสอบว่าเป็น valid UTF-8 หรือไม่
              const encoded = encodeURIComponent(cleaned);
              const decoded = decodeURIComponent(encoded);
              // ถ้า decode กลับมาได้เหมือนเดิม แสดงว่า valid
              if (decoded === cleaned) {
                return cleaned;
              }
            } catch (error) {
              // ถ้า encode/decode ไม่ได้ ให้ลบเฉพาะ characters ที่ไม่ valid
              console.warn("⚠️ Invalid UTF-8 sequence detected, cleaning string:", str.substring(0, 50));
              cleaned = cleaned
                .split('')
                .filter((char: string) => {
                  try {
                    encodeURIComponent(char);
                    return true;
                  } catch {
                    return false;
                  }
                })
                .join('');
            }
            
            return cleaned;
          };
          
          // อัปเดต formData ด้วยข้อมูลที่ดึงมา (ล้างข้อมูลก่อน)
          const cleanedData = {
            name: cleanString(data.name),
            description: cleanString(data.description),
            bio: cleanString(data.bio),
            achievement: cleanString(data.achievement),
            skills: Array.isArray(data.skills) 
              ? data.skills.map(cleanString).join("\n") 
              : cleanString(data.skills),
            email: cleanString(data.email),
            phone: cleanString(data.phone),
            location: cleanString(data.location),
          };
          
          // อัปเดต formData ด้วยข้อมูลที่ล้างแล้ว
          // ใช้ setTimeout เพื่อให้แน่ใจว่า state update ทำงาน
          const updatedFormData = {
            ...cleanedData,
            welcomeMessage: formData.welcomeMessage || "ยินดีต้อนรับ",
            portfolioButtonText: formData.portfolioButtonText || "ดูผลงาน",
            contactButtonText: formData.contactButtonText || "ติดต่อฉัน",
          };
          
          console.log("🔄 Updating formData:", {
            before: {
              name: formData.name,
              email: formData.email,
            },
            after: {
              name: updatedFormData.name,
              email: updatedFormData.email,
            },
            cleaned: {
              name: cleanedData.name,
              email: cleanedData.email,
            },
            rawData: {
              name: data.name,
              email: data.email,
            }
          });
          
          // อัปเดต formData โดยใช้ functional update เพื่อป้องกัน stale closure
          setFormData((prev) => ({
            ...cleanedData,
            welcomeMessage: prev.welcomeMessage || "ยินดีต้อนรับ",
            portfolioButtonText: prev.portfolioButtonText || "ดูผลงาน",
            contactButtonText: prev.contactButtonText || "ติดต่อฉัน",
          }));
          
          console.log("✅ FormData updated with:", {
            name: cleanedData.name || "empty name",
            nameLength: cleanedData.name?.length || 0,
            email: cleanedData.email || "empty email",
            username: finalUsername,
            rawName: data.name,
            rawNameLength: data.name?.length || 0,
            cleanedName: cleanedData.name,
            cleanedNameLength: cleanedData.name?.length || 0
          });
        } else {
          console.warn("⚠️ Profile data has error or is invalid:", data?.error, "for username:", finalUsername);
        }
      } else {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn("⚠️ Profile API response not OK:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          username: finalUsername
        });
        
        // ถ้า response ไม่ OK อาจเป็นเพราะ token ไม่ถูกต้อง
        if (response.status === 401) {
          const { removeTokenForUser } = await import("../../../lib/jwt-utils");
          if (finalUsername) {
            removeTokenForUser(finalUsername);
          }
          router.push("/admin/login");
        }
      }
    } catch (error) {
      console.error("❌ Error loading profile:", error);
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    // สร้าง async function ภายใน useEffect
    const initializeData = async () => {
      // ใช้ token ตาม username จาก URL หรือ token เก่า
      let token: string | null = null;
      if (urlUsername) {
        const { getTokenForUser } = require("@/lib/jwt-utils");
        token = getTokenForUser(urlUsername);
        console.log("🔑 Token for", urlUsername, ":", token ? "found" : "not found");
      }
      
      if (!token) {
        token = localStorage.getItem("adminToken") || localStorage.getItem("authToken");
        console.log("🔑 Using fallback token:", token ? "found" : "not found");
      }
      
      if (!token) {
        console.warn("⚠️ No token found, redirecting to login");
        router.push("/admin/login");
        return;
      }
      
      setAuthenticated(true);
      // ดึง username จาก token ที่ถูกต้อง
      const currentUsername = getUsernameFromToken(urlUsername || undefined);
      console.log("👤 Current username from token:", currentUsername);
      setUsername(currentUsername);
      
      // โหลดข้อมูล profile และ widget โดยใช้ urlUsername หรือ currentUsername
      const targetUsername = urlUsername || currentUsername;
      if (targetUsername) {
        // โหลด profile ก่อน แล้วค่อยโหลด widget settings เพื่อไม่ให้ทับข้อมูล profile
        console.log("📥 Step 1: Loading profile for", targetUsername);
        await loadProfile(targetUsername);
        console.log("✅ Step 1: Profile loaded, waiting a bit before loading widget...");
        
        // รอสักครู่เพื่อให้ formData ถูกอัปเดตก่อน
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // รอให้ profile โหลดเสร็จก่อน แล้วค่อยโหลด widget settings
        console.log("📥 Step 2: Loading widget data for", targetUsername);
        await loadHeroWidgetData(targetUsername);
        console.log("✅ Step 2: Widget data loaded");
      } else {
        // ถ้าไม่มี username ให้ redirect ไป login
        console.warn("⚠️ No username found, redirecting to login");
        router.push("/admin/login");
      }
    };

    // เรียกใช้ async function
    initializeData();
  }, [router, urlUsername]);

  // ไม่ต้องใช้ useEffect นี้แล้ว เพราะเราโหลดข้อมูล profile โดยตรงจาก API แล้ว
  // useEffect(() => {
  //   console.log("🔄 Profile data changed, updating formData:", {
  //     name: profile.name,
  //     email: profile.email,
  //     skillsCount: profile.skills?.length || 0,
  //   });
  //   setFormData((prev) => ({
  //     ...prev,
  //     name: profile.name,
  //     description: profile.description,
  //     bio: profile.bio,
  //     achievement: profile.achievement,
  //     skills: profile.skills?.join("\n") || "",
  //     email: profile.email,
  //     phone: profile.phone,
  //     location: profile.location,
  //   }));
  //   console.log("✅ FormData updated from profile");
  // }, [profile]);

  /**
   * โหลดข้อมูลจาก Hero Widget
   */
  const loadHeroWidgetData = async (targetUsername?: string) => {
    try {
      setLoadingWidget(true);
      const finalUsername = targetUsername || urlUsername || username;
      const response = await apiRequest(API_ENDPOINTS.LAYOUT, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        username: finalUsername || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
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

            // อัปเดต formData ด้วยข้อมูลจาก widget settings (เฉพาะ widget fields เท่านั้น)
            setFormData((prev) => {
              const updated = {
                ...prev, // เก็บข้อมูล profile ไว้ทั้งหมด
                welcomeMessage: (settings as any).welcomeMessage || prev.welcomeMessage || "ยินดีต้อนรับ",
                portfolioButtonText: (settings as any).portfolioButtonText || prev.portfolioButtonText || "ดูผลงาน",
                contactButtonText: (settings as any).contactButtonText || prev.contactButtonText || "ติดต่อฉัน",
              };
              
              console.log("🔄 Updating formData with widget settings:", {
                name: updated.name, // ตรวจสอบว่าชื่อยังอยู่หรือไม่
                email: updated.email, // ตรวจสอบว่าอีเมลยังอยู่หรือไม่
                welcomeMessage: updated.welcomeMessage,
                portfolioButtonText: updated.portfolioButtonText,
                contactButtonText: updated.contactButtonText,
              });
              
              return updated;
            });
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
      // ใช้ API request โดยตรงเพื่อส่ง username ไปด้วย
      try {
        const response = await apiRequest(API_ENDPOINTS.PROFILE, {
          method: "PUT",
          body: JSON.stringify({
            name: formData.name,
            description: formData.description,
            bio: formData.bio,
            achievement: formData.achievement,
            email: formData.email,
            phone: formData.phone,
            location: formData.location,
          }),
          username: urlUsername || username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
        });
        
        if (!response.ok) {
          let errorMessage = `Failed to update profile: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.message) {
              if (Array.isArray(errorData.message)) {
                errorMessage = errorData.message.join(', ');
              } else {
                errorMessage = errorData.message;
              }
            }
          } catch (e) {
            // ถ้า parse JSON ไม่ได้ ให้ใช้ error message เริ่มต้น
          }
          throw new Error(errorMessage);
        }
        
        // อัปเดต skills แยก
        if (skillsArray.length > 0) {
          await apiRequest(API_ENDPOINTS.SKILLS, {
            method: "PUT",
            body: JSON.stringify({ skills: skillsArray }),
            username: urlUsername || username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
          });
        }
        
        // Refresh ข้อมูล profile หลังจากบันทึกสำเร็จ
        await loadProfile(urlUsername || username || undefined);
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
            username: urlUsername || username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
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
              username: urlUsername || username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
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
          username: urlUsername || username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
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

  // แสดง loading state ขณะโหลดข้อมูล
  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-purple-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={username ? `/${username}/admin` : "/admin/login"}
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
                  value={formData.name || ""}
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, name: e.target.value }));
                  }}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="ระบุชื่อ-นามสกุล"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {formData.name ? (
                    <>💡 ข้อมูลปัจจุบัน: "{formData.name}" (ความยาว: {formData.name.length} ตัวอักษร)</>
                  ) : (
                    <>⚠️ ยังไม่มีข้อมูล - กำลังโหลด...</>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  คำอธิบายสั้นๆ (Hero Section)
                </label>
                <textarea
                  value={formData.description || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
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
                  value={formData.welcomeMessage || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, welcomeMessage: e.target.value }))
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
                    value={formData.portfolioButtonText || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, portfolioButtonText: e.target.value }))
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
                    value={formData.contactButtonText || ""}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contactButtonText: e.target.value }))
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
                  value={formData.bio || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, bio: e.target.value }))
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
                  value={formData.achievement || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, achievement: e.target.value }))
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
                value={formData.skills || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, skills: e.target.value }))
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
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
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
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
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
                  value={formData.location || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
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

