"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useProfile } from "./context/ProfileContext";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";
import { getUsernameFromToken } from "@/lib/jwt-utils";

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

export default function Home() {
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
  
  // State สำหรับ Theme Settings
  const [theme, setTheme] = useState<ThemeSettings>({
    primaryColor: "#000000ff",
    secondaryColor: "#000000ff",
    accentColor: "#10b981",
    backgroundColor: "#ffffff",
    textColor: "#1f2937",
    headerBgColor: "#ffffff",
    headerTextColor: "#1f2937",
    footerBgColor: "#1f2937",
    footerTextColor: "#ffffff",
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

    const loadTheme = async (owner?: string | null) => {
      try {
        if (owner) {
          console.log("🎨 Loading theme for owner:", owner);
          const response = await apiRequest(API_ENDPOINTS.THEME_USERNAME(owner), {
            method: "GET",
            cache: "no-store",
            retryOn429: true,
            maxRetries: 2,
          });

          if (response.ok) {
            const data = await response.json();
            if (data && !data.error) {
              setTheme({
                primaryColor: data.primaryColor || "#3b82f6",
                secondaryColor: data.secondaryColor || "#8b5cf6",
                accentColor: data.accentColor || "#10b981",
                backgroundColor: data.backgroundColor || "#ffffff",
                textColor: data.textColor || "#1f2937",
                headerBgColor: data.headerBgColor || "#ffffff",
                headerTextColor: data.headerTextColor || "#1f2937",
                footerBgColor: data.footerBgColor || "#1f2937",
                footerTextColor: data.footerTextColor || "#ffffff",
              });
              return;
            }
          } else if (response.status === 429) {
            // Rate limit - use default theme, will retry automatically
            console.warn("⚠️ Rate limit exceeded while loading theme, using default");
          }
        } else {
          const token = localStorage.getItem("authToken") || localStorage.getItem("adminToken");
          
          if (token) {
            console.log("🎨 Loading theme from:", API_ENDPOINTS.THEME_ME);
            const response = await apiRequest(API_ENDPOINTS.THEME_ME, {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              retryOn429: true,
              maxRetries: 2,
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data && !data.error) {
                setTheme({
                  primaryColor: data.primaryColor || "#3b82f6",
                  secondaryColor: data.secondaryColor || "#8b5cf6",
                  accentColor: data.accentColor || "#10b981",
                  backgroundColor: data.backgroundColor || "#ffffff",
                  textColor: data.textColor || "#1f2937",
                  headerBgColor: data.headerBgColor || "#ffffff",
                  headerTextColor: data.headerTextColor || "#1f2937",
                  footerBgColor: data.footerBgColor || "#1f2937",
                  footerTextColor: data.footerTextColor || "#ffffff",
                });
                return;
              }
            } else if (response.status === 429) {
              // Rate limit - use default theme, will retry automatically
              console.warn("⚠️ Rate limit exceeded while loading theme, using default");
            }
          }
        }
        
        console.log("🎨 Using default theme");
        setTheme({
          primaryColor: "#3b82f6",
          secondaryColor: "#8b5cf6",
          accentColor: "#10b981",
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          headerBgColor: "#ffffff",
          headerTextColor: "#1f2937",
          footerBgColor: "#1f2937",
          footerTextColor: "#ffffff",
        });
      } catch (error) {
        console.error("❌ Error loading theme:", error);
        // Check if it's a network error
        if (error instanceof TypeError && error.message === "Failed to fetch") {
          console.warn("⚠️ Backend may not be running or CORS issue. Using default theme.");
        }
        // Keep default theme values on error
        setTheme({
          primaryColor: "#3b82f6",
          secondaryColor: "#8b5cf6",
          accentColor: "#10b981",
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          headerBgColor: "#ffffff",
          headerTextColor: "#1f2937",
          footerBgColor: "#1f2937",
          footerTextColor: "#ffffff",
        });
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
    Promise.all([
      loadLayout(),
      loadTheme(targetOwner),
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
      
      // โหลด Theme ใหม่
      const loadTheme = async () => {
        try {
          if (ownerParam) {
            const response = await apiRequest(API_ENDPOINTS.THEME_USERNAME(ownerParam), {
              method: "GET",
              cache: "no-store",
              retryOn429: true,
              maxRetries: 1,
            });

            if (response.ok) {
              const data = await response.json();
              if (data && !data.error) {
                setTheme({
                  primaryColor: data.primaryColor || "#3b82f6",
                  secondaryColor: data.secondaryColor || "#8b5cf6",
                  accentColor: data.accentColor || "#10b981",
                  backgroundColor: data.backgroundColor || "#ffffff",
                  textColor: data.textColor || "#1f2937",
                  headerBgColor: data.headerBgColor || "#ffffff",
                  headerTextColor: data.headerTextColor || "#1f2937",
                  footerBgColor: data.footerBgColor || "#1f2937",
                  footerTextColor: data.footerTextColor || "#ffffff",
                });
                return;
              }
            } else if (response.status === 429) {
              console.warn("⚠️ Rate limit exceeded during theme refresh");
              return;
            }
          } else {
            // ตรวจสอบว่ามี token หรือไม่
            const token = localStorage.getItem("authToken") || localStorage.getItem("adminToken");
            
            if (token) {
              // ถ้ามี token ให้โหลด theme preferences ของ user
              const response = await apiRequest(API_ENDPOINTS.THEME_ME, {
                method: "GET",
                credentials: "include",
                cache: "no-store",
                retryOn429: true,
                maxRetries: 1,
              });
              
              if (response.ok) {
                const data = await response.json();
                if (data && !data.error) {
                  setTheme({
                    primaryColor: data.primaryColor || "#3b82f6",
                    secondaryColor: data.secondaryColor || "#8b5cf6",
                    accentColor: data.accentColor || "#10b981",
                    backgroundColor: data.backgroundColor || "#ffffff",
                    textColor: data.textColor || "#1f2937",
                    headerBgColor: data.headerBgColor || "#ffffff",
                    headerTextColor: data.headerTextColor || "#1f2937",
                    footerBgColor: data.footerBgColor || "#1f2937",
                    footerTextColor: data.footerTextColor || "#ffffff",
                  });
                  return;
                }
              } else if (response.status === 429) {
                console.warn("⚠️ Rate limit exceeded during theme refresh");
                return;
              }
            }
          }
          
          setTheme({
            primaryColor: "#3b82f6",
            secondaryColor: "#8b5cf6",
            accentColor: "#10b981",
            backgroundColor: "#ffffff",
            textColor: "#1f2937",
            headerBgColor: "#ffffff",
            headerTextColor: "#1f2937",
            footerBgColor: "#1f2937",
            footerTextColor: "#ffffff",
          });
        } catch (error) {
          console.error("❌ Error loading theme:", error);
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
      try {
        await Promise.all([
          loadLayout(),
          loadTheme(),
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

  // ฟังก์ชันดึง Style จาก Widget settings
  const getWidgetStyle = (widget: Widget): WidgetStyle => {
    if (!widget.settings) return {};
    
    try {
      // Remove any non-printable characters and trim
      const cleaned = widget.settings
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .trim();
      
      if (!cleaned) {
        return {};
      }
      
      // Check if it's already a valid JSON object/array
      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        console.warn(`Widget ${widget.id} has invalid JSON format (must start with { or [):`, widget.settings.substring(0, 50));
        return {};
      }
      
      // Try to fix common JSON issues
      let fixedJson = cleaned
        .replace(/'/g, '"') // Replace single quotes with double quotes
        .replace(/(\w+):/g, '"$1":'); // Add quotes to unquoted keys
      
      const parsed = JSON.parse(fixedJson);
      
      if (typeof parsed !== 'object' || parsed === null) {
        console.warn(`Widget ${widget.id} settings is not an object:`, typeof parsed);
        return {};
      }
      
      return parsed as WidgetStyle;
    } catch (error) {
      // Silent fallback - just return empty object without error
      // This prevents the "string did not match expected pattern" error
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Widget ${widget.id} has invalid settings, using defaults`);
      }
      return {};
    }
  };

  // Apply style to section
  const getStyleObject = (style: WidgetStyle) => {
    return {
      backgroundColor: style.backgroundColor || undefined,
      color: style.textColor || undefined,
      borderColor: style.borderColor || undefined,
      borderWidth: style.borderWidth || undefined,
      padding: style.padding || undefined,
      textAlign: style.alignment || undefined,
      flexDirection: style.flexDirection || undefined,
    } as React.CSSProperties;
  };

  // ฟังก์ชันสำหรับแสดงแต่ละ widget
  const renderWidget = (widget: Widget) => {
    if (!widget.isVisible) return null;

    switch (widget.type) {
      case "hero":
        return renderHeroSection(widget);
      case "about":
        return renderAboutSection(widget);
      case "skills":
        return renderSkillsSection(widget);
      case "education":
        return renderEducationSection(widget);
      case "portfolio":
        return renderPortfolioSection(widget);
      case "contact":
        return renderContactSection(widget);
      case "image":
        return renderImageWidget(widget);
      case "text":
        return renderTextWidget(widget);
      default:
        return null;
    }
  };

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

  const renderHeroSection = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    const bgColor = style.backgroundColor || `linear-gradient(to bottom right, ${theme.backgroundColor}, ${theme.primaryColor}15, ${theme.secondaryColor}15)`;
    
    // อ่านข้อมูลจาก widget settings
    let welcomeMessage = "ยินดีต้อนรับ";
    let portfolioButtonText = "ดูผลงาน";
    let contactButtonText = "ติดต่อฉัน";
    
    if (widget.settings) {
      try {
        const cleaned = widget.settings
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
          .trim();
        
        if (cleaned && (cleaned.startsWith('{') || cleaned.startsWith('['))) {
          let fixedJson = cleaned
            .replace(/'/g, '"')
            .replace(/(\w+):/g, '"$1":');
          const parsed = JSON.parse(fixedJson);
          
          if (typeof parsed === 'object' && parsed !== null) {
            welcomeMessage = parsed.welcomeMessage || welcomeMessage;
            portfolioButtonText = parsed.portfolioButtonText || portfolioButtonText;
            contactButtonText = parsed.contactButtonText || contactButtonText;
          }
        }
      } catch (error) {
        // ใช้ค่า default ถ้า parse ไม่ได้
        console.debug("Error parsing hero widget settings, using defaults");
      }
    }
    
    return (
      <section 
        key={widget.id} 
        className="relative flex items-center justify-center px-6 md:px-20 py-16 md:py-24 overflow-hidden"
        style={{ 
          background: bgColor,
          color: style.textColor || theme.textColor 
        }}
      >
        {/* Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ backgroundColor: theme.primaryColor }}></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" style={{ backgroundColor: theme.secondaryColor }}></div>
        
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl gap-10 relative z-10">
          <div className="text-center md:text-left animate-fade-in-up">
            <div className="inline-block mb-4">
              <span className="px-4 py-2 rounded-full text-sm font-semibold" style={{ backgroundColor: `${theme.primaryColor}20`, color: theme.primaryColor }}>
                👋 {welcomeMessage}
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold leading-snug gradient-text">
             {loggedInUserName || profile.name}
            </h1>
            <p className="mt-6 text-lg md:text-xl max-w-xl leading-relaxed" style={{ color: style.textColor || theme.textColor }}>
              {profile.description}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a
                href="#portfolio"
                className="btn-primary group py-3 px-8 rounded-full text-center shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <span>{portfolioButtonText}</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
              <a
                href="#contact"
                className="btn-outline-primary group py-3 px-8 rounded-full text-center shadow-md hover:shadow-lg transform hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <span>{contactButtonText}</span>
                <span className="text-xl">📧</span>
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end animate-fade-in">
            <div className="relative">
              {/* Decorative rings */}
              <div className="absolute inset-0 rounded-full border-4 animate-ping opacity-20" style={{ borderColor: theme.primaryColor }}></div>
              <div className="absolute -inset-4 rounded-full border-2 animate-pulse" style={{ borderColor: theme.secondaryColor }}></div>
              
              <Image
                src={widget.imageUrl || profile.heroImage || "/img.png"}
                alt="Profile Picture"
                width={450}
                height={450}
                priority // โหลดก่อน - เพราะเห็นทันที
                quality={90} // คุณภาพสูง สำหรับ Hero
                className="rounded-full border-8 border-white shadow-2xl relative z-10 hover:scale-105 transition-transform duration-300 object-cover"
              />
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderAboutSection = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    const bgColor = style.backgroundColor || `linear-gradient(to bottom right, #f9fafb, ${theme.primaryColor}10)`;
    
    return (
      <section 
        key={widget.id} 
        id="about" 
        className="px-6 md:px-20 py-12"
        style={{ background: bgColor }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3 text-primary">
            <span className="text-3xl">👤</span>
            {widget.title || "เกี่ยวกับฉัน"}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ borderColor: theme.primaryColor, borderWidth: '1px', borderStyle: 'solid' }}>
              <div className="flex items-start gap-3 mb-4">
                <span className="text-2xl">📖</span>
                <div>
                  <p className="mb-4 leading-relaxed" style={{ color: theme.textColor }}>{profile.bio}</p>
                  <p className="leading-relaxed" style={{ color: theme.textColor }}>{profile.achievement}</p>
                  {widget.content && (
                    <p className="mt-4 leading-relaxed" style={{ color: theme.textColor }}>{widget.content}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ borderColor: theme.primaryColor, borderWidth: '1px', borderStyle: 'solid' }}>
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-primary">
                <span className="text-2xl">⚡</span>
                ทักษะ
              </h3>
              <ul className="space-y-3">
                {profile.skills.map((skill, index) => (
                  <li key={index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-colors">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold">
                      ✓
                    </span>
                    <span className="font-medium" style={{ color: theme.textColor }}>{skill}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderSkillsSection = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    
    return (
      <section 
        key={widget.id} 
        className="px-6 md:px-20 py-12"
        style={{ backgroundColor: style.backgroundColor || theme.backgroundColor }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3 text-primary">
            <span className="text-3xl">⚡</span>
            {widget.title || "ทักษะ"}
          </h2>
          <div className="gradient-primary/10 p-8 rounded-2xl shadow-xl border-2 border-primary/20">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.skills.map((skill, index) => (
                <li 
                  key={index} 
                  className="flex items-center gap-3 p-3 rounded-lg bg-white hover:shadow-md transition-all duration-300 transform hover:-translate-y-1"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <span className="flex-shrink-0 w-8 h-8 gradient-primary text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                    ✓
                  </span>
                  <span className="font-medium" style={{ color: theme.textColor }}>{skill}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    );
  };

  const renderEducationSection = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    const bgColor = style.backgroundColor || `linear-gradient(to bottom right, #f9fafb, ${theme.secondaryColor}10)`;
    
    return (
      <section 
        key={widget.id} 
        id="education-experience" 
        className="px-6 md:px-20 py-12"
        style={{ background: bgColor }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center flex items-center justify-center gap-3 text-primary">
            <span className="text-3xl">🎓</span>
            {widget.title || "ประวัติการศึกษาและประสบการณ์"}
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Education Section */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-primary flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                การศึกษา
              </h3>
              
              <div className="space-y-6">
                {(() => {
                  const universityStatus = (profile.education.university as any).status || "studying";
                  const isGraduated = universityStatus === "graduated";
                  const universityGpa = (profile.education.university as any).gpa;
                  
                  return (
                    <div className="bg-white p-6 rounded-xl shadow-md border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ borderColor: isGraduated ? theme.accentColor : theme.primaryColor }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold mb-1" style={{ color: theme.textColor }}>{profile.education.university.field}</h4>
                          <p className="font-medium text-primary">{profile.education.university.university}</p>
                        </div>
                        {isGraduated && universityGpa ? (
                          <span className="text-white text-sm font-bold px-4 py-2 rounded-full shadow-md whitespace-nowrap ml-2 bg-accent">
                            GPA {universityGpa}
                          </span>
                        ) : (
                          <span className="text-white text-sm font-bold px-4 py-2 rounded-full shadow-md whitespace-nowrap ml-2" style={{ 
                            background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`
                          }}>
                            {profile.education.university.year}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        {isGraduated ? (
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                            <span>✓</span>
                            จบการศึกษาแล้ว
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                            <span className="w-2 h-2 rounded-full animate-pulse bg-primary"></span>
                            กำลังศึกษาอยู่
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-white p-6 rounded-xl shadow-md border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1" style={{ borderColor: theme.accentColor }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-lg font-bold mb-1" style={{ color: theme.textColor }}>{profile.education.highschool.field}</h4>
                      <p className="font-medium text-accent">{profile.education.highschool.school}</p>
                    </div>
                    <span className="text-white text-sm font-bold px-4 py-2 rounded-full shadow-md bg-accent">
                      GPA {profile.education.highschool.gpa}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                      <span>✓</span>
                      จบการศึกษา
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Experience Section */}
            <div>
              <h3 className="text-xl font-semibold mb-6 text-primary flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-2.912 0-5.68-.49-8-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                ประสบการณ์ทำงาน / ฝึกงาน
              </h3>
              
              <div className="space-y-4">
                {profile.experience.length > 0 ? (
                  profile.experience.map((exp, index) => (
                    <div 
                      key={exp.id} 
                      className="bg-white p-6 rounded-xl shadow-md border-2 border-l-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                      style={{ 
                        borderColor: `${theme.secondaryColor}20`,
                        borderLeftColor: theme.secondaryColor,
                        animationDelay: `${index * 100}ms` 
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-lg font-bold mb-1" style={{ color: theme.textColor }}>{exp.title}</h4>
                          <p className="font-semibold mb-1 text-secondary">{exp.company}</p>
                          <p className="text-sm mb-2 flex items-center gap-2" style={{ color: theme.textColor }}>
                            <span className="text-lg">📍</span>
                            {exp.location}
                          </p>
                        </div>
                        <span className="text-xs font-bold px-3 py-2 rounded-full whitespace-nowrap ml-4 shadow-sm" style={{ backgroundColor: `${theme.secondaryColor}20`, color: theme.secondaryColor }}>
                          {exp.period}
                        </span>
                      </div>
                      {exp.description && (
                        <p className="text-sm mt-3 pt-3 border-t border-gray-200 leading-relaxed" style={{ color: theme.textColor }}>
                          {exp.description}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="bg-white p-8 rounded-xl shadow-md border-2 border-gray-200 text-center">
                    <span className="text-4xl mb-3 block">📋</span>
                    <p className="text-gray-500 font-medium">ยังไม่มีข้อมูลประสบการณ์</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderPortfolioSection = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    const showAll = portfolioShowAll[widget.id] || false;
    const displayCount = showAll ? profile.portfolio.length : 6;
    
    return (
      <section 
        key={widget.id} 
        id="portfolio" 
        className="px-6 md:px-20 py-12"
        style={{ backgroundColor: style.backgroundColor || theme.backgroundColor }}
      >
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-primary">
              <span className="text-3xl">💼</span>
              {widget.title || "ผลงาน"}
            </h2>
            <span className="text-sm font-medium px-4 py-2 rounded-full" style={{ 
              backgroundColor: `${theme.primaryColor}15`,
              color: theme.primaryColor 
            }}>
              {profile.portfolio.length} โปรเจค
            </span>
          </div>
          
          {profile.portfolio.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">📁</p>
              <p className="text-gray-500">ยังไม่มีผลงาน</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {profile.portfolio.slice(0, displayCount).map((item, index) => (
              <div 
                key={item.id} 
                className="group relative rounded-xl border-2 bg-white shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                style={{ 
                  borderColor: '#e5e7eb',
                  animationDelay: `${index * 100}ms` 
                }}
              >
                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(to bottom right, ${theme.primaryColor}05, ${theme.secondaryColor}05)` }}></div>
                
                {/* Portfolio Image */}
                {item.image && (
                  <div className="relative w-full h-48 bg-gray-100 overflow-hidden">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute top-3 left-3 w-10 h-10 gradient-primary rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {index + 1}
                    </div>
                  </div>
                )}
                
                <div className="relative z-10 p-6">
                  {/* แสดงตัวเลขถ้าไม่มีรูป */}
                  {!item.image && (
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                        {index + 1}
                      </div>
                    </div>
                  )}
                  
                  <h3 className="font-bold mb-3 text-lg group-hover:text-primary transition-colors" style={{ color: theme.textColor }}>
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed mb-4 line-clamp-3" style={{ color: theme.textColor }}>
                    {item.description}
                  </p>
                  
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/portfolio/${item.id}`}
                      className="inline-flex items-center gap-2 font-semibold text-sm group/link text-secondary"
                    >
                      <span>รายละเอียด</span>
                      <span className="transform group-hover/link:translate-x-1 transition-transform">→</span>
                    </Link>
                    {item.link && (
                      <>
                        <span className="text-gray-300">|</span>
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="inline-flex items-center gap-2 font-semibold text-sm group/link text-primary"
                        >
                          <span>ดูโปรเจค</span>
                          <span className="transform group-hover/link:translate-x-1 transition-transform">↗</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
                ))}
              </div>
              
              {profile.portfolio.length > 6 && (
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setPortfolioShowAll(prev => ({ ...prev, [widget.id]: !showAll }))}
                    className="px-8 py-3 rounded-full font-semibold text-white shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1"
                    style={{ 
                      background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})` 
                    }}
                  >
                    {showAll ? (
                      <>
                        <span>แสดงน้อยลง</span>
                        <span className="ml-2">↑</span>
                      </>
                    ) : (
                      <>
                        <span>ดูทั้งหมด ({profile.portfolio.length} โปรเจค)</span>
                        <span className="ml-2">↓</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    );
  };

  const renderContactSection = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    const bgColor = style.backgroundColor || `linear-gradient(to bottom right, #f9fafb, ${theme.primaryColor}10)`;
    
    return (
      <section 
        key={widget.id} 
        id="contact" 
        className="px-6 md:px-20 py-12"
        style={{ background: bgColor }}
      >
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3 text-primary">
            <span className="text-3xl">📧</span>
            ติดต่อ
          </h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="rounded-2xl border-2 bg-white p-8 shadow-xl h-full flex flex-col hover:shadow-2xl transition-all duration-300" style={{ borderColor: theme.primaryColor }}>
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity bg-primary"></div>
                    <Image
                      src={widget.imageUrl || profile.contactImage || "/img.png"}
                      alt="Profile Picture"
                      width={120}
                      height={120}
                      loading="lazy" // โหลดเมื่อเลื่อนมาถึง
                      quality={85} // คุณภาพปานกลาง
                      className="rounded-full border-4 border-white shadow-xl relative z-10 group-hover:scale-110 transition-transform duration-300 object-cover"
                    />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold" style={{ color: theme.textColor }}>{profile.name}</h3>
                  <p className="mt-2 text-sm" style={{ color: theme.textColor }}>{profile.description}</p>
                </div>
                
                <div className="mt-4 space-y-4 flex-grow">
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors group">
                    <span className="text-2xl">📧</span>
                    <div className="flex-1">
                      <span className="text-primary font-semibold block text-sm mb-1">อีเมล</span>
                      <a href={`mailto:${profile.email}`} className="hover:text-primary transition-colors break-all" style={{ color: theme.textColor }}>
                        {profile.email}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors group">
                    <span className="text-2xl">📱</span>
                    <div className="flex-1">
                      <span className="text-primary font-semibold block text-sm mb-1">โทรศัพท์</span>
                      <a href={`tel:${profile.phone.replace(/-/g, '')}`} className="hover:text-primary transition-colors" style={{ color: theme.textColor }}>
                        {profile.phone}
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors group">
                    <span className="text-2xl">📍</span>
                    <div className="flex-1">
                      <span className="text-primary font-semibold block text-sm mb-1">ที่อยู่</span>
                      <span style={{ color: theme.textColor }}>{profile.location}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="rounded-lg p-4 text-center" style={{ background: `linear-gradient(to right, ${theme.primaryColor}10, ${theme.secondaryColor}10)` }}>
                    <p className="text-sm font-medium" style={{ color: theme.textColor }}>
                      ✨ พร้อมรับงานด้านการพัฒนาเว็บไซต์ และการออกแบบเกม
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="rounded-2xl border-2 bg-white p-8 shadow-xl h-full hover:shadow-2xl transition-all duration-300" style={{ borderColor: theme.secondaryColor }}>
                <h3 className="text-2xl font-bold mb-2 flex items-center gap-2" style={{ color: theme.textColor }}>
                  <span className="text-2xl">💬</span>
                  ส่งข้อความ
                </h3>
                <p className="text-sm mb-6" style={{ color: theme.textColor }}>กรุณากรอกข้อมูลด้านล่างเพื่อติดต่อฉัน</p>
              <form
                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                onSubmit={handleContactSubmit}
              >
                <div className="md:col-span-1">
                  <label htmlFor="name" className="block text-sm font-semibold mb-2" style={{ color: theme.textColor }}>
                    ชื่อ <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="name" 
                    name="name" 
                    type="text" 
                    required 
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    placeholder="กรอกชื่อของคุณ" 
                    className="w-full rounded-xl border-2 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#d1d5db',
                      color: theme.textColor 
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primaryColor;
                      e.target.style.boxShadow = `0 0 0 3px ${theme.primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="md:col-span-1">
                  <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: theme.textColor }}>
                    อีเมล <span className="text-red-500">*</span>
                  </label>
                  <input 
                    id="email" 
                    name="email" 
                    type="email" 
                    required 
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    placeholder="example@mail.com" 
                    className="w-full rounded-xl border-2 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all"
                    style={{ 
                      borderColor: '#d1d5db',
                      color: theme.textColor 
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primaryColor;
                      e.target.style.boxShadow = `0 0 0 3px ${theme.primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="message" className="block text-sm font-semibold mb-2" style={{ color: theme.textColor }}>
                    ข้อความ <span className="text-red-500">*</span>
                  </label>
                  <textarea 
                    id="message" 
                    name="message" 
                    required 
                    rows={5} 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    placeholder="พิมพ์ข้อความของคุณที่นี่..." 
                    className="w-full rounded-xl border-2 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all resize-none"
                    style={{ 
                      borderColor: '#d1d5db',
                      color: theme.textColor 
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.primaryColor;
                      e.target.style.boxShadow = `0 0 0 3px ${theme.primaryColor}20`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm text-gray-500">🔒 เราจะเก็บข้อมูลของคุณไว้อย่างปลอดภัย</span>
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="btn-primary w-full py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{submitting ? "กำลังส่ง..." : "ส่งข้อความ"}</span>
                    {!submitting && <span className="transform group-hover:translate-x-1 transition-transform">📨</span>}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderImageWidget = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    const styleObj = getStyleObject(style);

    return (
      <section
        key={widget.id}
        className="px-6 md:px-20 py-12 transition-all duration-300"
        style={styleObj}
      >
        <div className="max-w-6xl mx-auto">
          {widget.title && (
            <h2
              className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3"
              style={{ color: style.textColor || theme.primaryColor }}
            >
              <span className="text-3xl">🖼️</span>
              {widget.title}
            </h2>
          )}
          <div
            className="p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
            style={{
              backgroundColor: styleObj.backgroundColor || "#ffffff",
              borderWidth: style.borderWidth || "2px",
              borderColor: style.borderColor || theme.primaryColor,
              borderStyle: "solid",
            }}
          >
            {widget.imageUrl && (
              <img
                src={widget.imageUrl}
                alt={widget.title || "Image"}
                className="w-full h-auto rounded-xl shadow-md hover:scale-105 transition-transform duration-300"
              />
            )}
            {widget.content && (
              <p
                className="mt-6 leading-relaxed"
                style={{
                  color: style.textColor || theme.textColor,
                  textAlign: style.alignment || "center",
                }}
              >
                {widget.content}
              </p>
            )}
          </div>
        </div>
      </section>
    );
  };

  const renderTextWidget = (widget: Widget) => {
    const style = getWidgetStyle(widget);
    const styleObj = getStyleObject(style);

    return (
      <section
        key={widget.id}
        className="px-6 md:px-20 py-12 transition-all duration-300"
        style={styleObj}
      >
        <div className="max-w-6xl mx-auto">
          {widget.title && (
            <h2
              className="text-2xl md:text-3xl font-bold mb-8 flex items-center gap-3"
              style={{ color: style.textColor || theme.primaryColor }}
            >
              <span className="text-3xl">📝</span>
              {widget.title}
            </h2>
          )}
          <div
            className="p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300"
            style={{
              backgroundColor: styleObj.backgroundColor || "#ffffff",
              borderWidth: style.borderWidth || "2px",
              borderColor: style.borderColor || theme.primaryColor,
              borderStyle: "solid",
            }}
          >
            {widget.content && (
              <div
                className="whitespace-pre-wrap leading-relaxed text-lg"
                style={{
                  color: style.textColor || theme.textColor,
                  textAlign: style.alignment || "left",
                }}
              >
                {widget.content}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

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

  // ถ้ามี layout ให้แสดงตาม layout
  if (layout && Array.isArray(layout.widgets) && layout.widgets.length > 0) {
    const sortedWidgets = [...layout.widgets]
      .filter((w) => w.isVisible)
      .sort((a, b) => a.order - b.order);

    return (
      <main className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
        {renderPromoHero()}
        {renderPromoHighlights()}
        {sortedWidgets.map((widget) => renderWidget(widget))}
        {renderPromoCTA()}
      </main>
    );
  }

  // Fallback: แสดงหน้าเริ่มต้นถ้าไม่มี layout
  return (
    <main className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
      {renderPromoHero()}
      {renderPromoHighlights()}
      <section className="flex items-center justify-center px-6 md:px-20 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl gap-10">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold leading-snug gradient-text">
              สวัสดี ผม {loggedInUserName || profile.name}
            </h1>
            <p className="mt-4 text-lg max-w-xl" style={{ color: theme.textColor }}>
              {profile.description}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
              <a href="#portfolio" className="btn-primary py-3 px-8 rounded-full text-center">
                ดูผลงาน
              </a>
              <a href="#contact" className="btn-outline-primary py-3 px-8 rounded-full text-center">
                ติดต่อฉัน
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <Image
              src={profile.heroImage || "/img.png"}
              alt="Profile Picture"
              width={450}
              height={450}
              priority // โหลดก่อน - Fallback Hero
              quality={90}
              className="rounded-full border-4 shadow-lg object-cover"
              style={{ borderColor: theme.primaryColor }}
            />
          </div>
        </div>
      </section>

      <section id="about" className="px-6 md:px-20 py-12" style={{ background: `linear-gradient(to bottom right, ${theme.backgroundColor}, ${theme.primaryColor}10)` }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-primary">เกี่ยวกับฉัน</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm border" style={{ borderColor: theme.primaryColor }}>
            <p className="mb-4" style={{ color: theme.textColor }}>{profile.bio}</p>
            <p style={{ color: theme.textColor }}>{profile.achievement}</p>
          </div>
        </div>
      </section>

      <section id="contact" className="px-6 md:px-20 py-12">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6 text-primary">ติดต่อฉัน</h2>
          <p style={{ color: theme.textColor }}>
            📧 {profile.email} | 📱 {profile.phone}
          </p>
        </div>
      </section>
      {renderPromoCTA()}
    </main>
  );
}
