"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProfile } from "./context/ProfileContext";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "../lib/api-config";
import { getUsernameFromToken } from "../lib/jwt-utils";

interface WidgetStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: string;
  alignment?: "left" | "center" | "right";
  flexDirection?: "row" | "column";
  padding?: string;
}

interface Widget {
  id: number;
  type: string;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
  isVisible: boolean;
  settings: string | null;
}

interface Layout {
  id: number;
  name: string;
  isActive: boolean;
  widgets: Widget[];
}

interface ThemeSettings {
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

type ProfileModel = ReturnType<typeof useProfile>["profile"];

const extractHexColor = (color?: string | null) => {
  if (!color) return null;
  const match = color.match(/#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})/i);
  return match ? match[0] : null;
};

const hexToRgb = (hex: string) => {
  let normalized = hex.replace("#", "");
  if (normalized.length === 3) {
    normalized = normalized
      .split("")
      .map((char) => char + char)
      .join("");
  } else if (normalized.length === 8) {
    normalized = normalized.substring(0, 6);
  }
  const num = parseInt(normalized, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const getReadableTextColor = (background?: string | null) => {
  const hex = extractHexColor(background);
  if (!hex) return "#0f172a";
  const { r, g, b } = hexToRgb(hex);
  const [sr, sg, sb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const luminance = 0.2126 * sr + 0.7152 * sg + 0.0722 * sb;
  return luminance > 0.5 ? "#0f172a" : "#ffffff";
};

const buildButtonStyle = (background?: string | null, options?: { outline?: boolean }) => {
  const baseColor = extractHexColor(background) || "#111827";
  if (options?.outline) {
    return {
      backgroundColor: "transparent",
      color: baseColor,
      borderColor: baseColor,
    };
  }
  const textColor = getReadableTextColor(baseColor);
  return {
    backgroundColor: baseColor,
    color: textColor,
    borderColor: baseColor,
  };
};

function HomeContent() {
  const searchParams = useSearchParams();
  const sharedUsernameParam = searchParams?.get("username");
  const normalizedSharedUsername = sharedUsernameParam ? sharedUsernameParam.trim() : null;
  const { profile: baseProfile, refreshProfile } = useProfile();
  const [sharedProfile, setSharedProfile] = useState<ProfileModel | null>(null);
  const profile = sharedProfile || baseProfile;
  const [layout, setLayout] = useState<Layout | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [loggedInUserName, setLoggedInUserName] = useState<string | null>(null);
  const [ownerUsername, setOwnerUsername] = useState<string | null>(null);
  
  // State สำหรับ Theme Settings - ใช้สีแบบ hardcode (ไม่ต้องดึงจาก API)
  const [theme] = useState<ThemeSettings>({
    primaryColor: "#6366f1",      // Indigo - สีน้ำเงินม่วงสวยงาม
    secondaryColor: "#8b5cf6",   // Purple - สีม่วง
    accentColor: "#10b981",      // Emerald - สีเขียวสดใส
    backgroundColor: "#ffffff",  // White - พื้นหลังขาว
    textColor: "#0f172a",         // Slate 900 - ข้อความเทาเข้ม
    headerBgColor: "#ffffff",    // White - หัวข้อขาว
    headerTextColor: "#0f172a",  // Slate 900 - ข้อความหัวข้อ
    footerBgColor: "#1e293b",    // Slate 800 - เทาเข้ม
    footerTextColor: "#ffffff",  // White - ข้อความฟุตเตอร์ขาว
  });
  
  // State สำหรับฟอร์มติดต่อ
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  
  // State สำหรับ showAll ของ Portfolio (แยกตาม widget id)
  const [portfolioShowAll, setPortfolioShowAll] = useState<Record<number, boolean>>({});
  useEffect(() => {
    setPortfolioShowAll({});
  }, [normalizedSharedUsername]);

  // โหลด Layout และ Theme จาก API (Optimized: Parallel + Cache)
  useEffect(() => {
    const targetOwner = normalizedSharedUsername || null;

    const loadLayout = async () => {
      try {
        console.log("🔄 Loading layout from:", API_ENDPOINTS.LAYOUT);
        const response = await apiRequest(API_ENDPOINTS.LAYOUT, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          retryOn429: true,
          maxRetries: 2,
        });
        
        if (!response.ok) {
          // If still 429 after retries, show user-friendly message
          if (response.status === 429) {
            try {
              const errorData = await response.json().catch(() => ({}));
              const retryAfter = errorData?.retryAfter || 60;
              console.warn(`⚠️ Rate limit exceeded. Please wait ${retryAfter} seconds before trying again.`);
              // Don't set layout to null, keep existing layout if available
              return;
            } catch {
              console.warn("⚠️ Rate limit exceeded. Please wait before trying again.");
              return;
            }
          }
          
          const errorText = await response.text().catch(() => "Unknown error");
          console.error(`❌ Failed to load layout: ${response.status} ${response.statusText}`, errorText);
          setLayout(null);
          return;
        }
        
        const data = await response.json();
        console.log("✅ Layout loaded:", data);
        
        // ตรวจสอบว่าข้อมูลถูกต้องและมี widgets array
        if (data && !data.error && data.widgets) {
          setLayout(data);
        } else {
          console.warn("⚠️ Invalid layout data:", data);
          setLayout(null);
        }
      } catch (error) {
        console.error("❌ Error loading layout:", error);
        // Check if it's a network error
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          console.warn("⚠️ Backend may not be running or CORS issue. Using default layout.");
        }
        setLayout(null);
      }
    };

    // ตรวจสอบว่ามี user ล็อกอินอยู่หรือไม่
    const loadLoggedInUser = async (owner?: string | null) => {
      if (owner) {
        setOwnerUsername(owner);
        setLoggedInUserName(null);
        return;
      }

      const token = localStorage.getItem("authToken") || localStorage.getItem("adminToken");
      if (token) {
        // ดึง username จาก token
        const username = getUsernameFromToken();
        if (username) {
          setOwnerUsername(username);
          // ถ้ามี token ให้ดึงข้อมูล user จาก API
          try {
            const response = await apiRequest(API_ENDPOINTS.CONTENT_ME, {
              method: "GET",
              cache: "no-store",
            });
            if (response.ok) {
              const userData = await response.json();
              if (userData && userData.name) {
                setLoggedInUserName(userData.name);
              }
            }
          } catch (error) {
            // ถ้าเรียก API ไม่ได้ ให้ใช้ username จาก token แทน
            setLoggedInUserName(username);
          }
        }
      } else {
        setOwnerUsername(null);
        setLoggedInUserName(null);
      }
    };

    const loadOwnerProfile = async (owner?: string | null) => {
      if (!owner) {
        setSharedProfile(null);
        return;
      }

      try {
        const response = await apiRequest(API_ENDPOINTS.CONTENT_USERNAME(owner), {
          method: "GET",
          cache: "no-store",
          retryOn429: true,
          maxRetries: 2,
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.warn("⚠️ Rate limit exceeded while loading owner profile");
            // Keep existing profile if available
            return;
          }
          throw new Error(`Failed to load owner profile (${response.status})`);
        }

        const data = await response.json();
        if (data && !data.error) {
          setSharedProfile(data as ProfileModel);
          return;
        }
      } catch (error) {
        console.error("❌ Error loading owner profile:", error);
      }

      setSharedProfile(null);
    };

    // โหลดข้อมูลทั้งหมดพร้อมกัน (Parallel Loading)
    // Note: Theme ใช้สีแบบ hardcode ไม่ต้องดึงจาก API
    Promise.all([
      loadLayout(),
      refreshProfile(),
      loadLoggedInUser(targetOwner),
      loadOwnerProfile(targetOwner),
    ]).finally(() => {
      setLoadingLayout(false);
    });
  }, [normalizedSharedUsername, refreshProfile]);

  // Apply Theme CSS Variables
  useEffect(() => {
    if (theme) {
      document.documentElement.style.setProperty('--primary-color', theme.primaryColor);
      document.documentElement.style.setProperty('--secondary-color', theme.secondaryColor);
      document.documentElement.style.setProperty('--accent-color', theme.accentColor);
      document.documentElement.style.setProperty('--bg-color', theme.backgroundColor);
      document.documentElement.style.setProperty('--text-color', theme.textColor);
      document.documentElement.style.setProperty('--header-bg', theme.headerBgColor);
      document.documentElement.style.setProperty('--header-text', theme.headerTextColor || theme.textColor);
      document.documentElement.style.setProperty('--footer-bg', theme.footerBgColor);
      document.documentElement.style.setProperty('--footer-text', theme.footerTextColor || '#ffffff');
    }
  }, [theme]);

  // Hide global Header/Footer on landing page
  useEffect(() => {
    const headerEl = document.querySelector("header");
    const footerEl = document.querySelector("footer");
    const previousHeaderDisplay = headerEl?.style.display;
    const previousFooterDisplay = footerEl?.style.display;

    if (headerEl) {
      headerEl.style.display = "none";
    }
    if (footerEl) {
      footerEl.style.display = "none";
    }

    return () => {
      if (headerEl) {
        headerEl.style.display = previousHeaderDisplay || "";
      }
      if (footerEl) {
        footerEl.style.display = previousFooterDisplay || "";
      }
    };
  }, []);

  // Listen for profile updates และ refresh ข้อมูลทันที
  useEffect(() => {
    const handleProfileUpdate = async () => {
      console.log("🔄 Profile updated event received, refreshing...");
      await refreshProfile();
    };

    window.addEventListener("profileUpdated", handleProfileUpdate);
    return () => window.removeEventListener("profileUpdated", handleProfileUpdate);
  }, [refreshProfile]);

  // Refresh เมื่อหน้ามี focus (Optimized: โหลดเฉพาะเมื่อเกิน 5 นาที + Throttling)
  useEffect(() => {
    let lastFetchTime = Date.now();
    let isRefreshing = false; // Prevent concurrent refreshes
    const ownerParam = normalizedSharedUsername || null;
    
    const handleFocus = async () => {
      // Prevent concurrent refresh operations
      if (isRefreshing) {
        console.log("⚡ Refresh already in progress, skipping...");
        return;
      }
      
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 นาที
      
      // ถ้ายังไม่ถึง 5 นาที ไม่โหลดใหม่
      if (now - lastFetchTime < fiveMinutes) {
        console.log("⚡ Skip reload - Data is still fresh");
        return;
      }
      
      console.log("🔄 Reloading data after 5 minutes...");
      lastFetchTime = now;
      isRefreshing = true;
      
      // โหลด Layout ใหม่
      const loadLayout = async () => {
        try {
          const response = await apiRequest(API_ENDPOINTS.LAYOUT, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            retryOn429: true,
            maxRetries: 1, // Only 1 retry for background refresh
          });
          
          if (!response.ok) {
            // Silently handle 429 for background refresh
            if (response.status === 429) {
              console.warn("⚠️ Rate limit exceeded during background refresh. Will retry later.");
              return;
            }
            const errorText = await response.text().catch(() => "Unknown error");
            console.warn(`⚠️ Failed to reload layout: ${response.status} ${response.statusText}`, errorText);
            return;
          }
          
          const data = await response.json();
          
          if (data && !data.error && data.widgets) {
            setLayout(data);
          } else {
            console.warn("⚠️ Invalid layout data on focus:", data);
          }
        } catch (error) {
          console.error("❌ Error loading layout:", error);
          if (error instanceof TypeError && error.message === "Failed to fetch") {
            console.warn("⚠️ Backend may not be running or CORS issue.");
          }
        }
      };

      const loadOwnerProfile = async () => {
        if (!ownerParam) {
          return;
        }
        try {
          const response = await apiRequest(API_ENDPOINTS.CONTENT_USERNAME(ownerParam), {
            method: "GET",
            cache: "no-store",
            retryOn429: true,
            maxRetries: 1,
          });
          if (response.ok) {
            const data = await response.json();
            if (data && !data.error) {
              setSharedProfile(data as ProfileModel);
              return;
            }
          } else if (response.status === 429) {
            console.warn("⚠️ Rate limit exceeded during profile refresh");
            return;
          }
        } catch (error) {
          console.error("❌ Error refreshing owner profile:", error);
        }
      };

      const refreshOwnerState = async () => {
        if (ownerParam) {
          return;
        }
        const token = localStorage.getItem("authToken") || localStorage.getItem("adminToken");
        if (token) {
          const username = getUsernameFromToken();
          if (username) {
            setOwnerUsername(username);
          }
        } else {
          setOwnerUsername(null);
          setLoggedInUserName(null);
        }
      };
      
      // โหลดพร้อมกัน
      // Note: Theme ใช้สีแบบ hardcode ไม่ต้องดึงจาก API
      try {
        await Promise.all([
          loadLayout(),
          refreshProfile(),
          loadOwnerProfile(),
          refreshOwnerState(),
        ]);
      } finally {
        isRefreshing = false;
      }
    };

    // Throttle focus events - only process one per 10 seconds
    let focusTimeout: NodeJS.Timeout | null = null;
    const throttledHandleFocus = () => {
      if (focusTimeout) {
        return; // Already scheduled
      }
      focusTimeout = setTimeout(() => {
        handleFocus();
        focusTimeout = null;
      }, 10000); // Wait 10 seconds before processing focus
    };

    window.addEventListener("focus", throttledHandleFocus);
    return () => {
      window.removeEventListener("focus", throttledHandleFocus);
      if (focusTimeout) {
        clearTimeout(focusTimeout);
      }
    };
  }, [refreshProfile, normalizedSharedUsername]);

  // ฟังก์ชันส่งข้อความติดต่อ
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    if (!ownerUsername) {
      alert("ไม่สามารถระบุเจ้าของโปรไฟล์ได้ กรุณาเข้าสู่ระบบก่อนส่งข้อความ");
      return;
    }

    setSubmitting(true);
    
    try {
      const response = await apiRequest(API_ENDPOINTS.CONTACT, {
        method: "POST",
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          message: contactForm.message,
          username: ownerUsername,
        }),
      });

      if (response.ok) {
        alert("✅ ส่งข้อความสำเร็จ! เราจะตอบกลับโดยเร็วที่สุด");
        setContactForm({ name: "", email: "", message: "" });
      } else {
        // Parse error message จาก API
        let errorMessage = "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
        try {
          const errorData = await response.json();
          // ถ้าเป็น validation error จะมี message เป็น array
          if (errorData.message && Array.isArray(errorData.message)) {
            errorMessage = errorData.message.join('\n');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (parseError) {
          // ถ้า parse ไม่ได้ ใช้ข้อความ default
          console.error("Error parsing error response:", parseError);
        }
        alert(errorMessage);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      // Provide user-friendly error message based on error type
      if (isConnectionError(error)) {
        alert("❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง");
      } else {
        alert("❌ เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Scroll ไปยัง section เมื่อโหลดหน้าด้วย hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const sectionId = hash.substring(1);
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    }
  }, []);



  const renderPromoHero = () => {
    const sellingPoints = [
      "ลากวางวิดเจ็ตได้อย่างอิสระ",
      "ธีมสวยงามปรับแต่งได้",
      "แสดงผลงานและประวัติครบจบที่เดียว",
    ];
    const primaryBtnStyle = {
      ...buildButtonStyle(theme.accentColor || theme.primaryColor),
      boxShadow: "0 15px 35px rgba(0,0,0,0.2)",
    };
    const secondaryBtnStyle = {
      ...buildButtonStyle("#ffffff"),
      boxShadow: "0 12px 30px rgba(0,0,0,0.15)",
    };

    return (
      <section
        className="relative overflow-hidden px-6 md:px-20 py-20"
        style={{
          background: `linear-gradient(135deg, ${theme.primaryColor} 0%, ${theme.secondaryColor} 60%, ${theme.accentColor} 100%)`,
          color: "#ffffff",
        }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-grid-white"></div>
        <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 rounded-full text-sm font-semibold backdrop-blur">
              <span>🚀</span>
              <span>ShareProfile Platform</span>
            </div>
            <h1 className="mt-6 text-4xl md:text-5xl font-bold leading-tight">
              สร้างโปรไฟล์ออนไลน์ระดับมืออาชีพในไม่กี่นาที
            </h1>
            <p className="mt-5 text-lg md:text-xl text-white/90 leading-relaxed">
              จัดระเบียบตัวตนดิจิทัลของคุณ นำเสนอผลงาน ประวัติการทำงาน และช่องทางติดต่อ
              ทั้งหมดในลิงก์เดียว พร้อมระบบปรับแต่งที่ยืดหยุ่นและใช้งานได้ทั้งบนเดสก์ท็อปและมือถือ
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link
                href="/admin/login"
                className="btn-primary font-semibold px-8 py-4 rounded-2xl transition-transform text-center hover:-translate-y-1"
                style={primaryBtnStyle}
              >
                เข้าสู่ระบบ
              </Link>
              <Link
                href="/register"
                className="btn-outline-primary border-2 px-8 py-4 rounded-2xl font-semibold transition-transform text-center hover:-translate-y-1"
                style={{ ...secondaryBtnStyle, borderColor: "#ffffff" }}
              >
                สมัครสมาชิกฟรี
              </Link>
            </div>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {sellingPoints.map((point) => (
                <div
                  key={point}
                  className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur hover:bg-white/15 transition-colors"
                >
                  <span className="text-2xl">✨</span>
                  <p className="text-sm font-medium">{point}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-white/10 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white text-gray-900 rounded-3xl p-8 shadow-2xl border border-white/40">
              <p className="text-sm font-semibold text-primary mb-4">แผงควบคุมแบบเรียลไทม์</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    1
                  </span>
                  <div>
                    <p className="font-semibold">เลือกเทมเพลตที่ใช่</p>
                    <p className="text-sm text-gray-500">ปรับแต่งสี ฟอนต์ และรูปภาพให้ตรงกับตัวตน</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    2
                  </span>
                  <div>
                    <p className="font-semibold">จัดวางวิดเจ็ต</p>
                    <p className="text-sm text-gray-500">ลากวาง Hero, Portfolio, Experience และอื่นๆ ได้ตามใจ</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    3
                  </span>
                  <div>
                    <p className="font-semibold">แชร์ลิงก์เดียว</p>
                    <p className="text-sm text-gray-500">เชื่อมต่อโอกาสใหม่ๆ ด้วยโปรไฟล์ที่พร้อมใช้งานทันที</p>
                  </div>
                </li>
              </ul>
              <div className="mt-8 rounded-2xl border border-dashed border-gray-200 p-4 text-center">
                <p className="text-sm font-semibold text-primary">พร้อมเริ่มต้นหรือยัง?</p>
                <p className="text-xl font-bold mt-1">เริ่มสร้างโปรไฟล์วันนี้ ฟรี!</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderPromoHighlights = () => {
    const features = [
      {
        title: "ระบบ Layout Builder",
        description: "จัดเรียงส่วนประกอบด้วย Grid drag & drop พร้อมบันทึกหลาย Layout",
        icon: "🧩",
      },
      {
        title: "เครื่องมือ Theme ขั้นสูง",
        description: "กำหนดสี ปุ่ม ฟอนต์ และองค์ประกอบให้เข้ากับแบรนด์ของคุณแบบเรียลไทม์",
        icon: "🎨",
      },
      {
        title: "หน้า Portfolio พร้อมลิงก์",
        description: "โชว์ผลงานพร้อมปุ่มลิงก์ไปยังโค้ดหรือเดโม รองรับทั้งวิดีโอและรูปภาพ",
        icon: "💼",
      },
      {
        title: "ฟอร์มติดต่ออัจฉริยะ",
        description: "ลูกค้าติดต่อคุณได้ทันที ระบบจัดเก็บข้อความและแจ้งเตือน",
        icon: "📨",
      },
    ];

    return (
      <section className="px-6 md:px-20 py-16" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="max-w-6xl mx-auto">
          <div className="md:flex items-center justify-between mb-12 text-center md:text-left">
            <div>
              <p className="text-primary font-semibold uppercase tracking-wide">ทำไมต้อง ShareProfile</p>
              <h2 className="mt-2 text-3xl md:text-4xl font-bold" style={{ color: theme.textColor }}>
                ทุกสิ่งที่คุณต้องการเพื่อสร้างตัวตนดิจิทัล
              </h2>
            </div>
            <div className="mt-6 md:mt-0">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-semibold shadow-lg transition-transform hover:-translate-y-1"
                style={buildButtonStyle(theme.primaryColor)}
              >
                สมัครใช้งานตอนนี้
                <span>↗</span>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="p-6 rounded-2xl border bg-white shadow-sm hover:-translate-y-1 hover:shadow-xl transition-all"
                style={{ borderColor: `${theme.primaryColor}20` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: `${theme.primaryColor}10` }}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold" style={{ color: theme.textColor }}>
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  const renderPromoCTA = () => {
    const registerBtnStyle = {
      ...buildButtonStyle(theme.primaryColor),
      boxShadow: "0 15px 35px rgba(0,0,0,0.15)",
    };
    const loginBtnStyle = {
      ...buildButtonStyle("#ffffff"),
      borderColor: theme.primaryColor,
      color: theme.primaryColor,
      boxShadow: "0 12px 30px rgba(0,0,0,0.1)",
    };

    return (
      <section
        className="px-6 md:px-20 py-16"
        style={{ background: `linear-gradient(120deg, ${theme.backgroundColor}, ${theme.primaryColor}20)` }}
      >
        <div className="max-w-5xl mx-auto text-center bg-white rounded-3xl shadow-2xl p-10 border" style={{ borderColor: `${theme.primaryColor}30` }}>
          <p className="text-sm font-semibold text-primary uppercase tracking-widest">พร้อมเริ่มแล้วหรือยัง?</p>
          <h2 className="mt-4 text-3xl md:text-4xl font-bold" style={{ color: theme.textColor }}>
            เริ่มต้นสร้างโปรไฟล์ที่โดดเด่น และเพิ่มโอกาสใหม่ๆ ให้ตัวคุณ
          </h2>
          <p className="mt-4 text-gray-600 leading-relaxed">
            ใช้งานฟรี สมัครสมาชิกเพียงไม่กี่ขั้นตอน และอัปเกรดได้เมื่อคุณต้องการฟีเจอร์ขั้นสูงเพิ่มเติม
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-4 rounded-2xl font-semibold hover:-translate-y-1 transition-all text-center"
              style={registerBtnStyle}
            >
              สมัครสมาชิกฟรี
            </Link>
            <Link
              href="/admin/login"
              className="px-8 py-4 rounded-2xl font-semibold border-2 hover:-translate-y-1 transition-all text-center"
              style={loginBtnStyle}
            >
              ผู้ใช้เดิมเข้าสู่ระบบ
            </Link>
          </div>
        </div>
      </section>
    );
  };

  // Loading state
  if (loadingLayout) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: theme.primaryColor }}></div>
          <p className="mt-4" style={{ color: theme.textColor }}>กำลังโหลด...</p>
        </div>
      </main>
    );
  }

  // แสดงหน้าโปรโมตเท่านั้น (ไม่แสดงตัวอย่าง)
  return (
    <main className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
      {renderPromoHero()}
      {renderPromoHighlights()}
      {renderPromoCTA()}
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}