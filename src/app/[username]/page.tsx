"use client";

// ใช้ useMemo/useCallback/useRef เพื่อลด re-render และจัดการค่าแบบ stable
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";

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

const DEFAULT_THEME_SETTINGS: ThemeSettings = {
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

interface Education {
  id: number;
  type: string;
  field: string;
  institution: string;
  location?: string;
  year?: string;
  gpa?: string;
  status?: string;
}

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  bio: string;
  achievement: string;
  heroImage?: string;
  contactImage?: string;
  skills: string[];
  education: Education[];
  experience: Array<{
    id: number;
    title: string;
    company: string;
    location: string;
    period: string;
    description?: string;
  }>;
  portfolio: Array<{
    id: number;
    title: string;
    description: string;
    image?: string;
    link?: string;
  }>;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params?.username as string;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State สำหรับ Theme Settings
  const [theme, setTheme] = useState<ThemeSettings>(DEFAULT_THEME_SETTINGS);

  // State สำหรับฟอร์มติดต่อ
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  // เพิ่ม state สำหรับ errors
  const [contactFormErrors, setContactFormErrors] = useState<{
    name?: string;
    email?: string;
    message?: string;
    general?: string;
    success?: string;
  }>({});

  // State สำหรับ showAll ของ Portfolio (แยกตาม widget id)
  const [portfolioShowAll, setPortfolioShowAll] = useState<Record<number, boolean>>({});

  // ใช้ useRef เก็บค่าเวลาที่ fetch ล่าสุด เพื่อลด re-render เมื่อ focus
  const lastFetchTimeRef = useRef<number>(Date.now());

  // Transform API response to ProfileData format
  // ใช้ useCallback เพื่อไม่ต้องสร้าง function ใหม่ทุกครั้ง
  const transformUserContent = useCallback((data: any): ProfileData => {
    // รองรับทั้งโครงสร้างใหม่ (array) และเก่า (object) เพื่อ backward compatibility
    let education: Education[] = [];

    if (Array.isArray(data.education)) {
      // โครงสร้างใหม่ - array
      education = data.education.map((edu: any) => ({
        id: edu.id,
        type: edu.type || 'university',
        field: edu.field || '',
        institution: edu.institution || '',
        location: edu.location,
        year: edu.year,
        gpa: edu.gpa,
        status: edu.status || 'studying',
      }));
    } else if (data.education && typeof data.education === 'object') {
      // โครงสร้างเก่า - object (backward compatibility)
      if (data.education.university) {
        education.push({
          id: 0,
          type: 'university',
          field: data.education.university.field || '',
          institution: data.education.university.university || data.education.university.institution || '',
          year: data.education.university.year,
          gpa: data.education.university.gpa,
          status: data.education.university.status || 'studying',
        });
      }
      if (data.education.highschool) {
        education.push({
          id: 1,
          type: 'highschool',
          field: data.education.highschool.field || '',
          institution: data.education.highschool.school || data.education.highschool.institution || '',
          gpa: data.education.highschool.gpa,
          status: 'graduated',
        });
      }
    }

    return {
      name: data.name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      description: data.description || "",
      bio: data.bio || "",
      achievement: data.achievement || "",
      heroImage: data.heroImage,
      contactImage: data.contactImage,
      skills: data.skills || [],
      education: education,
      experience: data.experience || [],
      portfolio: data.portfolio || [],
    };
  }, []);

  // โหลดข้อมูลผู้ใช้
  useEffect(() => {
    if (!username) return;

    const loadUserContent = async () => {
      try {
        console.log("🔄 Loading user content for:", username);
        const response = await apiRequest(API_ENDPOINTS.CONTENT_USERNAME(username), {
          method: "GET",
          cache: "no-store",
        });

        console.log("📥 Response status:", response.status, response.ok);

        if (!response.ok) {
          if (response.status === 404) {
            console.error("❌ User not found (404)");
            setError("ไม่พบผู้ใช้");
            setLoadingLayout(false);
            return;
          }
          const errorText = await response.text().catch(() => "Unknown error");
          console.error(`❌ Failed to load user content: ${response.status} ${response.statusText}`, errorText);
          setError("ไม่สามารถโหลดข้อมูลได้");
          setLoadingLayout(false);
          return;
        }

        const data = await response.json();
        console.log("📥 Received data:", {
          hasData: !!data,
          hasError: !!data?.error,
          name: data?.name,
          bio: data?.bio ? `${data.bio.substring(0, 50)}...` : "empty",
          skillsCount: data?.skills?.length || 0,
        });

        if (!data || data.error) {
          console.error("❌ Invalid user content data:", data);
          setError("ไม่พบข้อมูลผู้ใช้");
          setLoadingLayout(false);
          return;
        }

        const transformedData = transformUserContent(data);
        console.log("✅ Transformed data:", {
          name: transformedData.name,
          bio: transformedData.bio ? `${transformedData.bio.substring(0, 50)}...` : "empty",
          skillsCount: transformedData.skills?.length || 0,
        });
        setProfile(transformedData);
        console.log("✅ Profile state updated");
      } catch (err) {
        console.error("❌ Error loading content:", err);
        if (isConnectionError(err)) {
          console.error("❌ Backend connection error. User profile not found.");
        }
        setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
        setLoadingLayout(false);
      }
    };

    loadUserContent();
  }, [username]);

  // helper สำหรับ theme - memoize เพื่อใช้ซ้ำ
  const resolveTheme = useCallback((data: Partial<ThemeSettings>): ThemeSettings => ({
    primaryColor: data.primaryColor || DEFAULT_THEME_SETTINGS.primaryColor,
    secondaryColor: data.secondaryColor || DEFAULT_THEME_SETTINGS.secondaryColor,
    accentColor: data.accentColor || DEFAULT_THEME_SETTINGS.accentColor,
    backgroundColor: data.backgroundColor || DEFAULT_THEME_SETTINGS.backgroundColor,
    textColor: data.textColor || DEFAULT_THEME_SETTINGS.textColor,
    headerBgColor:
      data.headerBgColor ||
      data.backgroundColor ||
      DEFAULT_THEME_SETTINGS.headerBgColor,
    headerTextColor:
      data.headerTextColor ||
      data.textColor ||
      DEFAULT_THEME_SETTINGS.headerTextColor,
    footerBgColor:
      data.footerBgColor ||
      data.primaryColor ||
      data.secondaryColor ||
      DEFAULT_THEME_SETTINGS.footerBgColor,
    footerTextColor: data.footerTextColor || DEFAULT_THEME_SETTINGS.footerTextColor,
  }), []);

  // memoize loadLayout เพื่อป้องกันการสร้าง function ใหม่
  const loadLayout = useCallback(async () => {
    try {
      const layoutEndpoint = username
        ? API_ENDPOINTS.LAYOUT_USERNAME(username)
        : API_ENDPOINTS.LAYOUT;
      console.log("🔄 Loading layout from:", layoutEndpoint);
      const response = await apiRequest(layoutEndpoint, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`❌ Failed to load layout: ${response.status} ${response.statusText}`, errorText);
        setLayout(null);
        return;
      }

      const data = await response.json();
      console.log("✅ Layout loaded:", data);

      if (data && !data.error && data.widgets) {
        setLayout(data);
      } else {
        console.warn("⚠️ Invalid layout data:", data);
        setLayout(null);
      }
    } catch (error) {
      console.error("❌ Error loading layout:", error);
      if (error instanceof TypeError && error.message === "Failed to fetch") {
        console.warn("⚠️ Backend may not be running or CORS issue. Using default layout.");
      }
      setLayout(null);
    }
  }, [username]);

  const loadGlobalSettingsTheme = useCallback(async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.SETTINGS, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load global theme (${response.status})`);
      }

      const data = await response.json();
      if (data && !data.error) {
        setTheme(
          resolveTheme({
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            accentColor: data.accentColor,
            backgroundColor: data.backgroundColor,
            textColor: data.textColor,
            headerBgColor: data.headerBgColor,
            headerTextColor: data.headerTextColor,
            footerBgColor: data.footerBgColor,
            footerTextColor: data.footerTextColor,
          }),
        );
      }
    } catch (error) {
      console.error("❌ Error loading fallback theme:", error);
    }
  }, [resolveTheme]);

  const loadTheme = useCallback(async () => {
    try {
      const endpoint = username ? API_ENDPOINTS.THEME_USERNAME(username) : API_ENDPOINTS.SETTINGS;
      const response = await apiRequest(endpoint, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        const errorMessage = `Failed to load theme preference (${response.status})`;
        console.warn(`${errorMessage}: ${errorText}`);

        // Gracefully fall back to global settings for missing or server errors
        if (response.status === 404 || response.status >= 500) {
          await loadGlobalSettingsTheme();
          return;
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      if (data && !data.error) {
        setTheme(
          resolveTheme({
            primaryColor: data.primaryColor,
            secondaryColor: data.secondaryColor,
            accentColor: data.accentColor,
            backgroundColor: data.backgroundColor,
            textColor: data.textColor,
            headerBgColor: data.headerBgColor,
            headerTextColor: data.headerTextColor,
            footerBgColor: data.footerBgColor,
            footerTextColor: data.footerTextColor,
          }),
        );
        return;
      }

      console.warn("⚠️ Theme preference response invalid, using global settings.");
      await loadGlobalSettingsTheme();
    } catch (error) {
      console.error("❌ Error loading theme preference:", error);
      await loadGlobalSettingsTheme();
    }
  }, [username, resolveTheme, loadGlobalSettingsTheme]);

  // โหลด Layout และ Theme จาก API (ใช้ helper ที่ memoize แล้ว)
  useEffect(() => {
    if (!profile) return;

    Promise.all([loadLayout(), loadTheme()]).finally(() => {
      setLoadingLayout(false);
    });
  }, [profile, loadLayout, loadTheme]);

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

  // Refresh เมื่อหน้า focus (รอให้ข้อมูลเก่าเกิน 5 นาที)
  const handleFocus = useCallback(async () => {
    if (!profile) return;

    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    if (now - lastFetchTimeRef.current < fiveMinutes) {
      console.log("⚡ Skip reload - Data is still fresh");
      return;
    }

    console.log("🔄 Reloading data after 5 minutes...");
    lastFetchTimeRef.current = now;

    await Promise.all([loadLayout(), loadTheme()]);
  }, [profile, loadLayout, loadTheme]);

  useEffect(() => {
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [handleFocus]);

  // เพิ่ม validation functions
  const validateName = (value: string): string | undefined => {
    if (!value.trim()) {
      return "กรุณากรอกชื่อ";
    }
    if (value.trim().length < 2) {
      return "ชื่อต้องมีอย่างน้อย 2 ตัวอักษร";
    }
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    if (!value.trim()) {
      return "กรุณากรอกอีเมล";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "รูปแบบอีเมลไม่ถูกต้อง";
    }
    return undefined;
  };

  const validateMessage = (value: string): string | undefined => {
    if (!value.trim()) {
      return "กรุณากรอกข้อความ";
    }
    if (value.trim().length < 10) {
      return "ข้อความต้องมีความยาวอย่างน้อย 10 ตัวอักษร";
    }
    return undefined;
  };

  // ฟังก์ชันส่งข้อความติดต่อ
  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const nameError = validateName(contactForm.name);
    const emailError = validateEmail(contactForm.email);
    const messageError = validateMessage(contactForm.message);

    setContactFormErrors({
      name: nameError,
      email: emailError,
      message: messageError,
    });

    // ถ้ามี error ให้หยุดการส่ง
    if (nameError || emailError || messageError) {
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
          username,
        }),
      });

      if (response.ok) {
        // แสดงข้อความสำเร็จด้านล่างฟอร์มแทน alert
        setContactFormErrors({
          success: "✅ ส่งข้อความสำเร็จ! เราจะตอบกลับโดยเร็วที่สุด"
        });
        setContactForm({ name: "", email: "", message: "" });
        // Clear success message after 5 seconds
        setTimeout(() => {
          setContactFormErrors({});
        }, 5000);
      } else {
        let errorMessages: { name?: string; email?: string; message?: string } = {};
        try {
          const errorData = await response.json();
          if (errorData.message && Array.isArray(errorData.message)) {
            // ถ้าเป็น array ของ error messages
            errorData.message.forEach((msg: string) => {
              if (msg.includes('ชื่อ')) {
                errorMessages.name = msg;
              } else if (msg.includes('อีเมล') || msg.includes('email')) {
                errorMessages.email = msg;
              } else if (msg.includes('ข้อความ') || msg.includes('message')) {
                errorMessages.message = msg;
              }
            });
          } else if (errorData.message) {
            // ถ้าเป็น string เดียว
            if (errorData.message.includes('ชื่อ')) {
              errorMessages.name = errorData.message;
            } else if (errorData.message.includes('อีเมล') || errorData.message.includes('email')) {
              errorMessages.email = errorData.message;
            } else if (errorData.message.includes('ข้อความ') || errorData.message.includes('message')) {
              errorMessages.message = errorData.message;
            } else {
              // ถ้าไม่สามารถระบุได้ ให้แสดงด้านล่างฟอร์ม
              setContactFormErrors({ general: errorData.message });
            }
          }
        } catch (parseError) {
          console.error("Error parsing error response:", parseError);
          setContactFormErrors({ general: "❌ เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" });
        }
        
        // แสดง error ในฟอร์ม
        if (Object.keys(errorMessages).length > 0) {
          setContactFormErrors({ ...contactFormErrors, ...errorMessages });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      if (isConnectionError(error)) {
        setContactFormErrors({ general: "❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง" });
      } else {
        setContactFormErrors({ general: "❌ เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้ง" });
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

  // ฟังก์ชันดึง Style จาก Widget settings (memoized)
  const getWidgetStyle = useCallback((widget: Widget): WidgetStyle => {
    if (!widget.settings) return {};

    try {
      const cleaned = widget.settings
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
        .trim();

      if (!cleaned) {
        return {};
      }

      if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
        console.warn(`Widget ${widget.id} has invalid JSON format (must start with { or [):`, widget.settings.substring(0, 50));
        return {};
      }

      let fixedJson = cleaned
        .replace(/'/g, '"')
        .replace(/(\w+):/g, '"$1":');

      const parsed = JSON.parse(fixedJson);

      if (typeof parsed !== 'object' || parsed === null) {
        console.warn(`Widget ${widget.id} settings is not an object:`, typeof parsed);
        return {};
      }

      return parsed as WidgetStyle;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Widget ${widget.id} has invalid settings, using defaults`);
      }
      return {};
    }
  }, []);

  // Apply style to section (memoized)
  const getStyleObject = useCallback((style: WidgetStyle) => {
    return {
      backgroundColor: style.backgroundColor || undefined,
      color: style.textColor || undefined,
      borderColor: style.borderColor || undefined,
      borderWidth: style.borderWidth || undefined,
      padding: style.padding || undefined,
      textAlign: style.alignment || undefined,
      flexDirection: style.flexDirection || undefined,
    } as React.CSSProperties;
  }, []);

  const renderHeroSection = useCallback((widget: Widget) => {
    if (!profile) return null;

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
        id="hero"
        className="relative flex items-center justify-center px-6 md:px-20 py-16 md:py-24 overflow-hidden"
        style={{
          background: bgColor,
          color: style.textColor || theme.textColor
        }}
      >
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
              {profile.name}
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
              {(widget.imageUrl || profile.heroImage) ? (
                <>
                  <div className="absolute inset-0 rounded-full border-4 animate-ping opacity-20" style={{ borderColor: theme.primaryColor }}></div>
                  <div className="absolute -inset-4 rounded-full border-2 animate-pulse" style={{ borderColor: theme.secondaryColor }}></div>

                  <Image
                    src={widget.imageUrl || profile.heroImage || ""}
                    alt="Profile Picture"
                    width={450}
                    height={450}
                    priority
                    quality={90}
                    className="rounded-full border-8 border-white shadow-2xl relative z-10 hover:scale-105 transition-transform duration-300 object-cover"
                  />
                </>
              ) : (
                <div 
                  className="rounded-full border-8 border-white shadow-2xl relative z-10 w-[450px] h-[450px] flex items-center justify-center"
                  style={{ backgroundColor: '#f3f4f6' }}
                >
                  <span className="text-gray-400 text-4xl">👤</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }, [profile, theme, getWidgetStyle]);

  const renderAboutSection = useCallback((widget: Widget) => {
    if (!profile) return null;

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
  }, [profile, theme, getWidgetStyle]);

  const renderSkillsSection = useCallback((widget: Widget) => {
    if (!profile) return null;

    const style = getWidgetStyle(widget);

    return (
      <section
        key={widget.id}
        id="skills"
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
  }, [profile, theme, getWidgetStyle]);

  const renderEducationSection = useCallback((widget: Widget) => {
    if (!profile) return null;

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
            <div>
              <h3 className="text-xl font-semibold mb-6 text-primary flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                การศึกษา
              </h3>

              <div className="space-y-6">
                {profile.education.length > 0 ? (
                  profile.education.map((edu, index) => {
                    const isGraduated = edu.status === "graduated";
                    const getTypeIcon = (type: string) => {
                      switch (type) {
                        case 'university': return '🎓';
                        case 'master': return '🎓';
                        case 'doctorate': return '🎓';
                        case 'highschool': return '🏫';
                        case 'vocational': return '🏛️';
                        default: return '📚';
                      }
                    };
                    const getTypeLabel = (type: string) => {
                      switch (type) {
                        case 'university': return 'มหาวิทยาลัย';
                        case 'master': return 'ปริญญาโท';
                        case 'doctorate': return 'ปริญญาเอก';
                        case 'highschool': return 'มัธยมศึกษา';
                        case 'vocational': return 'อาชีวศึกษา';
                        default: return type;
                      }
                    };

                    return (
                      <div
                        key={edu.id || index}
                        className="bg-white p-6 rounded-xl shadow-md border-2 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                        style={{ borderColor: isGraduated ? theme.accentColor : theme.primaryColor }}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xl">{getTypeIcon(edu.type)}</span>
                              <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{
                                backgroundColor: `${theme.primaryColor}15`,
                                color: theme.primaryColor
                              }}>
                                {getTypeLabel(edu.type)}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold mb-1" style={{ color: theme.textColor }}>{edu.field}</h4>
                            <p className="font-medium text-primary">{edu.institution}</p>
                            {edu.location && (
                              <p className="text-sm mt-1 flex items-center gap-1 text-gray-600">
                                <span>📍</span>
                                {edu.location}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            {isGraduated && edu.gpa ? (
                              <span className="text-white text-sm font-bold px-4 py-2 rounded-full shadow-md whitespace-nowrap bg-accent">
                                GPA {edu.gpa}
                              </span>
                            ) : edu.year ? (
                              <span className="text-white text-sm font-bold px-4 py-2 rounded-full shadow-md whitespace-nowrap" style={{
                                background: `linear-gradient(to right, ${theme.primaryColor}, ${theme.secondaryColor})`
                              }}>
                                {edu.year}
                              </span>
                            ) : null}
                          </div>
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
                  })
                ) : (
                  <div className="bg-white p-8 rounded-xl shadow-md border-2 border-gray-200 text-center">
                    <span className="text-4xl mb-3 block">🎓</span>
                    <p className="text-gray-500 font-medium">ยังไม่มีข้อมูลการศึกษา</p>
                  </div>
                )}
              </div>
            </div>

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
  }, [profile, theme, getWidgetStyle]);

  const renderPortfolioSection = useCallback((widget: Widget) => {
    if (!profile) return null;

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
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(to bottom right, ${theme.primaryColor}05, ${theme.secondaryColor}05)` }}></div>

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
                          href={`/portfolio/${item.id}?username=${username}`}
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
  }, [profile, theme, portfolioShowAll, getWidgetStyle]);

  const renderContactSection = useCallback((widget: Widget) => {
    if (!profile) return null;

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
                    {(widget.imageUrl || profile.contactImage) ? (
                      <>
                        <div className="absolute inset-0 rounded-full blur-xl opacity-50 group-hover:opacity-75 transition-opacity bg-primary"></div>
                        <Image
                          src={widget.imageUrl || profile.contactImage || ""}
                          alt="Profile Picture"
                          width={120}
                          height={120}
                          loading="lazy"
                          quality={85}
                          className="rounded-full border-4 border-white shadow-xl relative z-10 group-hover:scale-110 transition-transform duration-300 object-cover"
                        />
                      </>
                    ) : (
                      <div 
                        className="rounded-full border-4 border-white shadow-xl relative z-10 w-[120px] h-[120px] flex items-center justify-center"
                        style={{ backgroundColor: '#f3f4f6' }}
                      >
                        <span className="text-gray-400 text-2xl">👤</span>
                      </div>
                    )}
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
                      value={contactForm.name}
                      onChange={(e) => {
                        setContactForm({ ...contactForm, name: e.target.value });
                        // Clear error when user types
                        if (contactFormErrors.name) {
                          setContactFormErrors({ ...contactFormErrors, name: undefined });
                        }
                      }}
                      placeholder="กรอกชื่อของคุณ"
                      className={`w-full rounded-xl border-2 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        contactFormErrors.name
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-primary focus:ring-primary/20"
                      }`}
                      style={{
                        borderColor: contactFormErrors.name ? '#ef4444' : '#d1d5db',
                        color: theme.textColor
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = contactFormErrors.name ? '#ef4444' : theme.primaryColor;
                        e.target.style.boxShadow = contactFormErrors.name 
                          ? `0 0 0 3px rgba(239, 68, 68, 0.2)`
                          : `0 0 0 3px ${theme.primaryColor}20`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = contactFormErrors.name ? '#ef4444' : '#d1d5db';
                        e.target.style.boxShadow = 'none';
                        setContactFormErrors({ ...contactFormErrors, name: validateName(contactForm.name) });
                      }}
                    />
                    {contactFormErrors.name && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{contactFormErrors.name}</span>
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-1">
                    <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: theme.textColor }}>
                      อีเมล <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => {
                        setContactForm({ ...contactForm, email: e.target.value });
                        if (contactFormErrors.email) {
                          setContactFormErrors({ ...contactFormErrors, email: undefined });
                        }
                      }}
                      placeholder="example@mail.com"
                      className={`w-full rounded-xl border-2 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        contactFormErrors.email
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-primary focus:ring-primary/20"
                      }`}
                      style={{
                        borderColor: contactFormErrors.email ? '#ef4444' : '#d1d5db',
                        color: theme.textColor
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = contactFormErrors.email ? '#ef4444' : theme.primaryColor;
                        e.target.style.boxShadow = contactFormErrors.email 
                          ? `0 0 0 3px rgba(239, 68, 68, 0.2)`
                          : `0 0 0 3px ${theme.primaryColor}20`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = contactFormErrors.email ? '#ef4444' : '#d1d5db';
                        e.target.style.boxShadow = 'none';
                        setContactFormErrors({ ...contactFormErrors, email: validateEmail(contactForm.email) });
                      }}
                    />
                    {contactFormErrors.email && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{contactFormErrors.email}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      ตัวอย่าง: user@example.com
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label htmlFor="message" className="block text-sm font-semibold mb-2" style={{ color: theme.textColor }}>
                      ข้อความ <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={5}
                      value={contactForm.message}
                      onChange={(e) => {
                        setContactForm({ ...contactForm, message: e.target.value });
                        if (contactFormErrors.message) {
                          setContactFormErrors({ ...contactFormErrors, message: undefined });
                        }
                      }}
                      placeholder="พิมพ์ข้อความของคุณที่นี่..."
                      className={`w-full rounded-xl border-2 bg-white px-4 py-3 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all resize-none ${
                        contactFormErrors.message
                          ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                          : "border-gray-300 focus:border-primary focus:ring-primary/20"
                      }`}
                      style={{
                        borderColor: contactFormErrors.message ? '#ef4444' : '#d1d5db',
                        color: theme.textColor
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = contactFormErrors.message ? '#ef4444' : theme.primaryColor;
                        e.target.style.boxShadow = contactFormErrors.message 
                          ? `0 0 0 3px rgba(239, 68, 68, 0.2)`
                          : `0 0 0 3px ${theme.primaryColor}20`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = contactFormErrors.message ? '#ef4444' : '#d1d5db';
                        e.target.style.boxShadow = 'none';
                        setContactFormErrors({ ...contactFormErrors, message: validateMessage(contactForm.message) });
                      }}
                    />
                    {contactFormErrors.message && (
                      <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                        <span>⚠️</span>
                        <span>{contactFormErrors.message}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      ข้อความต้องมีความยาวอย่างน้อย 10 ตัวอักษร
                    </p>
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
                    
                    {/* แสดง success message */}
                    {contactFormErrors.success && (
                      <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-xl">
                        <p className="text-sm text-green-700 flex items-center gap-2">
                          <span>✅</span>
                          <span>{contactFormErrors.success}</span>
                        </p>
                      </div>
                    )}
                    
                    {/* แสดง general error message */}
                    {contactFormErrors.general && (
                      <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                        <p className="text-sm text-red-700 flex items-center gap-2">
                          <span>⚠️</span>
                          <span>{contactFormErrors.general}</span>
                        </p>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }, [profile, theme, contactForm, submitting, getWidgetStyle, contactFormErrors]);

  const renderImageWidget = useCallback((widget: Widget) => {
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
  }, [getWidgetStyle, getStyleObject, theme]);

  const renderTextWidget = useCallback((widget: Widget) => {
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
  }, [getWidgetStyle, getStyleObject, theme]);

  // ฟังก์ชันสำหรับแสดง widget ตามประเภท (memoized)
  const renderWidget = useCallback((widget: Widget) => {
    if (!widget.isVisible || !profile) return null;

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
  }, [
    profile,
    renderHeroSection,
    renderAboutSection,
    renderSkillsSection,
    renderEducationSection,
    renderPortfolioSection,
    renderContactSection,
    renderImageWidget,
    renderTextWidget,
  ]);

  // Memoize รายการ widget ที่ต้องแสดง (ลดการ sort/filter ซ้ำ)
  // ⚠️ ต้องเรียก useMemo ก่อน early returns เพื่อให้ลำดับ hooks ตรงกันทุกครั้ง
  const sortedWidgets = useMemo(() => {
    if (!layout || !Array.isArray(layout.widgets) || layout.widgets.length === 0) {
      return [];
    }
    return [...layout.widgets]
      .filter((w) => w.isVisible)
      .sort((a, b) => a.order - b.order);
  }, [layout?.widgets]);

  // Error state - ตรวจสอบก่อน loading state เพื่อแสดง error ทันที
  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">😕</div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: theme.textColor }}>ไม่พบผู้ใช้</h1>
          <p className="mb-6" style={{ color: theme.textColor }}>{error}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            style={{
              backgroundColor: theme.primaryColor,
              color: '#ffffff'
            }}
          >
            <span>←</span>
            <span>กลับไปหน้าแรก</span>
          </Link>
        </div>
      </main>
    );
  }

  // Loading state
  if (loadingLayout || !profile) {
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
  if (sortedWidgets.length > 0) {

    return (
      <main className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
        {sortedWidgets.map((widget) => renderWidget(widget))}
      </main>
    );
  }

  // Fallback: แสดงหน้าเริ่มต้นถ้าไม่มี layout
  return (
    <main className="min-h-screen" style={{ backgroundColor: theme.backgroundColor, color: theme.textColor }}>
      <section className="flex items-center justify-center px-6 md:px-20 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center justify-between w-full max-w-6xl gap-10">
          <div className="text-center md:text-left">
            <h1 className="text-4xl md:text-5xl font-bold leading-snug gradient-text">
              สวัสดี ผม {profile.name}
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
            {profile.heroImage ? (
              <Image
                src={profile.heroImage}
                alt="Profile Picture"
                width={450}
                height={450}
                priority
                quality={90}
                className="rounded-full border-4 shadow-lg object-cover"
                style={{ borderColor: theme.primaryColor }}
              />
            ) : (
              <div 
                className="rounded-full border-4 shadow-lg w-[450px] h-[450px] flex items-center justify-center"
                style={{ borderColor: theme.primaryColor, backgroundColor: '#f3f4f6' }}
              >
                <span className="text-gray-400 text-4xl">👤</span>
              </div>
            )}
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

      <section id="portfolio" className="px-6 md:px-20 py-12" style={{ backgroundColor: theme.backgroundColor }}>
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-3 text-primary">
              <span className="text-3xl">💼</span>
              ผลงาน
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {profile.portfolio.map((item, index) => (
                <div
                  key={item.id}
                  className="group relative rounded-xl border-2 bg-white shadow-md hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 overflow-hidden"
                  style={{
                    borderColor: '#e5e7eb',
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ background: `linear-gradient(to bottom right, ${theme.primaryColor}05, ${theme.secondaryColor}05)` }}></div>

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
                        href={`/portfolio/${item.id}?username=${username}`}
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
          )}
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
    </main>
  );
}