"use client";

/**
 * Header & Footer Settings Page
 * 
 * จัดการเนื้อหาและรูปแบบของ Header และ Footer
 */

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "../../../lib/api-config";
import { getUsernameFromToken } from "../../../lib/jwt-utils";
import { useSiteSettings } from "../../context/SiteSettingsContext";
import type { HeaderMenuLink, HeaderCta, FooterLink } from "../../context/SiteSettingsContext";

type EditableLink = (HeaderMenuLink | FooterLink) & { id: string };

interface HeaderFooterSettingsForm {
  headerLogoText: string;
  headerBgColor: string;
  headerTextColor: string;
  headerLinks: EditableLink[];
  headerCta: HeaderCta;
  footerLogoText: string;
  footerDescription: string;
  footerEmail: string;
  footerLocation: string;
  footerPhone: string;
  footerBgColor: string;
  footerTextColor: string;
  footerLinks: EditableLink[];
  footerShowLocation: boolean;
  footerShowEmail: boolean;
  footerShowPhone: boolean;
}

const generateId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const DEFAULT_HEADER_LINKS: HeaderMenuLink[] = [
  { label: "หน้าแรก", href: "/#hero" },
  { label: "เกี่ยวกับฉัน", href: "/#about" },
  { label: "ผลงาน", href: "/#portfolio" },
  { label: "ติดต่อ", href: "/#contact" },
];

const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: "งานทั้งหมด", href: "/#portfolio" },
  { label: "ประสบการณ์", href: "/#experience" },
  { label: "ติดต่อ", href: "/#contact" },
];

const FOOTER_PRESET_LINKS: FooterLink[] = [
  { label: "งานทั้งหมด", href: "/#portfolio" },
  { label: "ประสบการณ์", href: "/#experience" },
  { label: "เกี่ยวกับฉัน", href: "/#about" },
  { label: "ติดต่อ", href: "/#contact" },
  { label: "หน้าแรก", href: "/#hero" },
];

const defaultSettings: HeaderFooterSettingsForm = {
  headerLogoText: "PORTFOLIO.PRO",
  headerBgColor: "#ffffff",
  headerTextColor: "#1f2937",
  headerLinks: DEFAULT_HEADER_LINKS.map((link) => ({ ...link, id: generateId() })),
  headerCta: { label: "", href: "", enabled: false },
  footerLogoText: "PORTFOLIO.PRO",
  footerDescription: "ช่วยคุณนำเสนอโปรไฟล์และผลงานอย่างมืออาชีพ",
  footerEmail: "hello@portfolio.pro",
  footerLocation: "Bangkok, Thailand",
  footerPhone: "080-000-1234",
  footerBgColor: "#1f2937",
  footerTextColor: "#ffffff",
  footerLinks: DEFAULT_FOOTER_LINKS.map((link) => ({ ...link, id: generateId() })),
  footerShowLocation: true,
  footerShowEmail: true,
  footerShowPhone: true,
};

const toEditableLinks = (
  links?: HeaderMenuLink[] | FooterLink[] | null,
  fallback?: HeaderMenuLink[] | FooterLink[],
) => {
  const source = (links && links.length > 0 ? links : fallback) || [];
  return source.map((link) => ({
    id: generateId(),
    label: link.label || "",
    href: link.href || "",
    external: Boolean(link.external),
  }));
};

const parseHeaderMenu = (value: unknown): { links: HeaderMenuLink[]; cta: HeaderCta } => {
  let raw = value;
  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = null;
    }
  }

  const links =
    (Array.isArray((raw as any)?.links) && (raw as any)?.links.length > 0
      ? (raw as any).links
      : DEFAULT_HEADER_LINKS) || DEFAULT_HEADER_LINKS;

  const ctaRaw = (raw as any)?.cta;
  // ถ้าเป็นค่า default เก่า ("จ้างงานเลย", "/contact") ให้แปลงเป็นค่าว่าง
  const isOldDefault = ctaRaw?.label === "จ้างงานเลย" && ctaRaw?.href === "/contact";
  const cta: HeaderCta = {
    label: isOldDefault ? "" : (ctaRaw?.label || ""),
    href: isOldDefault ? "" : (ctaRaw?.href || ""),
    external: Boolean(ctaRaw?.external),
    enabled: isOldDefault ? false : (ctaRaw?.enabled === undefined ? false : Boolean(ctaRaw.enabled)),
  };

  return { links, cta };
};

const PRESET_SECTIONS: HeaderMenuLink[] = [
  { label: "หน้าแรก", href: "/#hero" },
  { label: "เกี่ยวกับฉัน", href: "/#about" },
  { label: "ผลงาน", href: "/#portfolio" },
  { label: "ติดต่อ", href: "/#contact" },
];

export default function HeaderFooterPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // ดึง username จาก URL pathname (สำหรับ /[username]/admin/header-footer)
  const urlMatch = pathname?.match(/^\/([^/]+)\/admin\/header-footer/);
  const urlUsername = urlMatch ? urlMatch[1] : null;
  
  // ส่ง username ไปให้ useAdminSession เพื่อใช้ token ที่ถูกต้อง
  useAdminSession(urlUsername || undefined);
  const { refreshSettings } = useSiteSettings();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HeaderFooterSettingsForm>(defaultSettings);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
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
      // โหลดสีจาก Theme Preferences API
      const themeResponse = await apiRequest(API_ENDPOINTS.THEME_ME, {
        username: urlUsername || username || undefined,
        method: "GET",
        cache: "no-store",
      });
      
      // โหลดข้อมูลอื่นๆ จาก Settings API
      const settingsResponse = await apiRequest(API_ENDPOINTS.SETTINGS_ME, {
        username: urlUsername || username || undefined,
        method: "GET",
        cache: "no-store",
      });
      
      let themeData = null;
      if (themeResponse.ok) {
        themeData = await themeResponse.json();
      }
      
      let settingsData = null;
      if (settingsResponse.ok) {
        settingsData = await settingsResponse.json();
      } else if (settingsResponse.status === 404 || settingsResponse.status === 401) {
        console.warn("⚠️ Personal settings not found, falling back to global defaults");
        const fallbackResponse = await apiRequest(API_ENDPOINTS.SETTINGS, {
          username: urlUsername || username || undefined,
          method: "GET",
          cache: "no-store",
        });
        if (fallbackResponse.ok) {
          settingsData = await fallbackResponse.json();
        }
      }
      
      if (!settingsData || settingsData.error) {
        const errorText = await settingsResponse.text().catch(() => "Unknown error");
        console.warn(`⚠️ Failed to load settings: ${settingsResponse.status} ${settingsResponse.statusText}`, errorText);
      }
      
      // ใช้สีจาก Theme Preferences ถ้ามี ไม่เช่นนั้นใช้จาก Settings หรือ default
      const menu = parseHeaderMenu(settingsData?.headerMenuItems);
      setSettings({
        headerLogoText: settingsData?.headerLogoText || defaultSettings.headerLogoText,
        headerBgColor: themeData?.headerBgColor || settingsData?.headerBgColor || defaultSettings.headerBgColor,
        headerTextColor: themeData?.headerTextColor || settingsData?.headerTextColor || defaultSettings.headerTextColor,
        headerLinks: toEditableLinks(menu.links, DEFAULT_HEADER_LINKS),
        headerCta: menu.cta || { label: "", href: "", enabled: false },
        footerLogoText: settingsData?.footerLogoText || defaultSettings.footerLogoText,
        footerDescription: settingsData?.footerDescription || defaultSettings.footerDescription,
        footerEmail: settingsData?.footerEmail || defaultSettings.footerEmail,
        footerLocation: settingsData?.footerLocation || defaultSettings.footerLocation,
        footerPhone: settingsData?.footerPhone || defaultSettings.footerPhone,
        footerBgColor: themeData?.footerBgColor || settingsData?.footerBgColor || defaultSettings.footerBgColor,
        footerTextColor: themeData?.footerTextColor || settingsData?.footerTextColor || defaultSettings.footerTextColor,
        footerLinks: toEditableLinks(settingsData?.footerLinks, DEFAULT_FOOTER_LINKS),
        footerShowLocation:
          settingsData?.footerShowLocation === undefined ? defaultSettings.footerShowLocation : Boolean(settingsData.footerShowLocation),
        footerShowEmail:
          settingsData?.footerShowEmail === undefined ? defaultSettings.footerShowEmail : Boolean(settingsData.footerShowEmail),
        footerShowPhone:
          settingsData?.footerShowPhone === undefined ? defaultSettings.footerShowPhone : Boolean(settingsData.footerShowPhone),
      });
    } catch (error) {
      console.error("Error loading settings:", error);
      if (isConnectionError(error)) {
        console.warn("⚠️ Backend may not be running.");
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * แสดงข้อความ
   */
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
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
        showMessage("error", "❌ กรุณาเข้าสู่ระบบก่อนบันทึก");
        setSaving(false);
        return;
      }

      // ตรวจสอบรูปแบบสีก่อนส่ง (ต้องเป็น #ffffff หรือ #ffffffff)
      const colorFields = ['headerBgColor', 'headerTextColor', 'footerBgColor', 'footerTextColor'];
      const invalidColors: string[] = [];
      for (const field of colorFields) {
        const color = settings[field as keyof HeaderFooterSettingsForm] as string;
        if (color && !/^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color)) {
          invalidColors.push(field);
        }
      }
      
      if (invalidColors.length > 0) {
        showMessage("error", `❌ สีต่อไปนี้ไม่ถูกต้อง (ต้องเป็นรูปแบบ #ffffff):\n${invalidColors.join(', ')}`);
        setSaving(false);
        return;
      }

      // บันทึกสีไปยัง Theme Preferences API
      const themeResponse = await apiRequest(API_ENDPOINTS.THEME_UPDATE, {
        username: urlUsername || username || undefined,
        method: "PUT",
        body: JSON.stringify({
          headerBgColor: settings.headerBgColor,
          headerTextColor: settings.headerTextColor,
          footerBgColor: settings.footerBgColor,
          footerTextColor: settings.footerTextColor,
        }),
      });

      // บันทึกข้อมูลอื่นๆ ไปยัง Settings API
      const settingsPayload = {
        headerLogoText: settings.headerLogoText,
        headerMenuItems: {
          links: settings.headerLinks.map(({ id, label, href, external }) => ({
            label,
            href,
            external,
          })),
          cta: settings.headerCta,
        },
        footerLogoText: settings.footerLogoText,
        footerDescription: settings.footerDescription,
        footerEmail: settings.footerEmail,
        footerLocation: settings.footerLocation,
        footerPhone: settings.footerPhone,
        footerLinks: settings.footerLinks.map(({ id, label, href, external }) => ({
          label,
          href,
          external,
        })),
        footerShowLocation: settings.footerShowLocation,
        footerShowEmail: settings.footerShowEmail,
        footerShowPhone: settings.footerShowPhone,
      };

      const settingsResponse = await apiRequest(API_ENDPOINTS.SETTINGS_ME, {
        username: urlUsername || username || undefined,
        method: "PUT",
        body: JSON.stringify(settingsPayload),
      });

      // ตรวจสอบผลลัพธ์
      let hasError = false;
      let errorMessage = "";

      if (!themeResponse.ok) {
        hasError = true;
        try {
          const errorData = await themeResponse.json().catch(() => ({}));
          if (errorData.message && Array.isArray(errorData.message)) {
            errorMessage += `Theme: ${errorData.message.join(", ")}\n`;
          } else if (errorData.message) {
            errorMessage += `Theme: ${errorData.message}\n`;
          } else {
            errorMessage += `Theme: HTTP ${themeResponse.status}\n`;
          }
        } catch {
          errorMessage += `Theme: HTTP ${themeResponse.status}\n`;
        }
      }

      if (!settingsResponse.ok) {
        hasError = true;
        try {
          const errorData = await settingsResponse.json().catch(() => ({}));
          if (errorData.message && Array.isArray(errorData.message)) {
            errorMessage += `Settings: ${errorData.message.join(", ")}`;
          } else if (errorData.message) {
            errorMessage += `Settings: ${errorData.message}`;
          } else {
            errorMessage += `Settings: HTTP ${settingsResponse.status}`;
          }
        } catch {
          errorMessage += `Settings: HTTP ${settingsResponse.status}`;
        }
      }

      if (hasError) {
        showMessage("error", `❌ เกิดข้อผิดพลาดในการบันทึก:\n${errorMessage}`);
      } else {
        showMessage("success", "✅ บันทึกการตั้งค่าสำเร็จ!");
        // Refresh settings ใน context เพื่อให้ Footer component อัปเดตข้อมูลใหม่
        try {
          await refreshSettings();
        } catch (error) {
          console.warn("⚠️ Failed to refresh settings context:", error);
        }
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      showMessage("error", "❌ เกิดข้อผิดพลาดในการบันทึก กรุณาตรวจสอบการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  };

  const toggleFooterPresetLink = (preset: FooterLink) => {
    setSettings((prev) => {
      const exists = prev.footerLinks.some((link) => link.href === preset.href);
      if (exists) {
        return {
          ...prev,
          footerLinks: prev.footerLinks.filter((link) => link.href !== preset.href),
        };
      }

      const nextLinks = [...prev.footerLinks.filter((link) => link.href !== preset.href), {
        id: preset.href,
        label: preset.label,
        href: preset.href,
        external: preset.external,
      }];

      const orderedLinks = FOOTER_PRESET_LINKS.filter((presetLink) =>
        nextLinks.some((link) => link.href === presetLink.href)
      ).map((presetLink) => {
        const match = nextLinks.find((link) => link.href === presetLink.href);
        return match || { id: presetLink.href, label: presetLink.label, href: presetLink.href };
      });

      return {
        ...prev,
        footerLinks: orderedLinks,
      };
    });
  };

  const isFooterPresetActive = (href: string) =>
    settings.footerLinks.some((link) => link.href === href);

  const togglePresetLink = (preset: HeaderMenuLink) => {
    setSettings((prev) => {
      const exists = prev.headerLinks.some((link) => link.href === preset.href);
      if (exists) {
        return {
          ...prev,
          headerLinks: prev.headerLinks.filter((link) => link.href !== preset.href),
        };
      }
      return {
        ...prev,
        headerLinks: [
          ...prev.headerLinks,
          { id: generateId(), label: preset.label, href: preset.href, external: preset.external },
        ],
      };
    });
  };

  const isPresetActive = (href: string) =>
    settings.headerLinks.some((link) => link.href === href);

  /**
   * Reset เป็นค่าเริ่มต้น
   */
  const handleReset = () => {
    if (confirm("คุณต้องการรีเซ็ตการตั้งค่าเป็นค่าเริ่มต้นหรือไม่?")) {
      setSettings(defaultSettings);
      showMessage("success", "🔄 รีเซ็ตเป็นค่าเริ่มต้นแล้ว");
    }
  };

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">🎨</span>
                จัดการ Header & Footer
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                ปรับแต่งเนื้อหาและรูปแบบของ Header และ Footer
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href={username ? `/${username}/admin` : "/admin/login"}
                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                ← กลับ
              </Link>
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

      {/* Message */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div
            className={`rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-100 text-green-800 border border-green-300"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {message.text}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Header Settings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">📋</span>
              Header Settings
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ข้อความโลโก้
                </label>
                <input
                  type="text"
                  value={settings.headerLogoText}
                  onChange={(e) => setSettings({ ...settings, headerLogoText: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="PORTFOLIO.PRO"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  สีพื้นหลัง Header
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="color"
                    value={settings.headerBgColor}
                    onChange={(e) => setSettings({ ...settings, headerBgColor: e.target.value })}
                    className="w-full h-12 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.headerBgColor}
                    onChange={(e) => setSettings({ ...settings, headerBgColor: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  สีตัวอักษร Header
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="color"
                    value={settings.headerTextColor}
                    onChange={(e) => setSettings({ ...settings, headerTextColor: e.target.value })}
                    className="w-full h-12 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.headerTextColor}
                    onChange={(e) => setSettings({ ...settings, headerTextColor: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="#1f2937"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">แสดง/ซ่อนเมนู</label>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                กดปุ่มเพื่อเลือกว่าจะแสดงเมนูใดบ้างใน Header
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESET_SECTIONS.map((section) => {
                  const active = isPresetActive(section.href);
                  return (
                    <button
                      key={section.href}
                      type="button"
                      onClick={() => togglePresetLink(section)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        active
                          ? "bg-blue-600 text-white shadow"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {section.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700">ปุ่ม CTA ใน Header</label>
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={settings.headerCta.enabled !== false}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        headerCta: { ...settings.headerCta, enabled: e.target.checked },
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  />
                  แสดงปุ่ม
                </label>
              </div>
              {settings.headerCta.enabled !== false && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={settings.headerCta.label}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        headerCta: { ...settings.headerCta, label: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="จ้างงานเลย"
                  />
                  <input
                    type="text"
                    value={settings.headerCta.href}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        headerCta: { ...settings.headerCta, href: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="/contact"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={!!settings.headerCta.external}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          headerCta: { ...settings.headerCta, external: e.target.checked },
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    เปิดในแท็บใหม่
                  </label>
                </div>
              )}
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold mb-2">Header Preview:</p>
              <div
                className="p-4 rounded-lg border-2 border-gray-200 flex flex-col gap-3"
                style={{ backgroundColor: settings.headerBgColor, color: settings.headerTextColor }}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="text-xl font-bold">
                    {settings.headerLogoText || "PORTFOLIO.PRO"}
                  </span>
                  <div className="flex gap-4 text-sm flex-wrap">
                    {settings.headerLinks.slice(0, 4).map((link) => (
                      <span key={link.id}>{link.label || "เมนู"}</span>
                    ))}
                  </div>
                  {settings.headerCta.enabled !== false && (
                    <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white">
                      {settings.headerCta.label || "CTA"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Settings */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">📄</span>
              Footer Settings
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  ข้อความโลโก้
                </label>
                <input
                  type="text"
                  value={settings.footerLogoText}
                  onChange={(e) => setSettings({ ...settings, footerLogoText: e.target.value })}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="PORTFOLIO.PRO"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  คำอธิบาย
                </label>
                <textarea
                  value={settings.footerDescription}
                  onChange={(e) => setSettings({ ...settings, footerDescription: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="พัฒนาและเรียนรู้เทคโนโลยีใหม่ ๆ อย่างต่อเนื่อง"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">อีเมล</label>
                  <input
                    type="email"
                    value={settings.footerEmail}
                    onChange={(e) => setSettings({ ...settings, footerEmail: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="hello@portfolio.pro"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">ที่อยู่</label>
                  <input
                    type="text"
                    value={settings.footerLocation}
                    onChange={(e) => setSettings({ ...settings, footerLocation: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Bangkok, Thailand"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.footerShowEmail}
                    onChange={(e) => setSettings({ ...settings, footerShowEmail: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                  />
                  แสดงอีเมล
                </label>
                <label className="flex items-center gap-3 text-sm font-semibold text-gray-700 bg-purple-50 border border-purple-100 rounded-xl px-4 py-3">
                  <input
                    type="checkbox"
                    checked={settings.footerShowLocation}
                    onChange={(e) => setSettings({ ...settings, footerShowLocation: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                  />
                  แสดงที่อยู่
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  สีพื้นหลัง Footer
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="color"
                    value={settings.footerBgColor}
                    onChange={(e) => setSettings({ ...settings, footerBgColor: e.target.value })}
                    className="w-full h-12 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.footerBgColor}
                    onChange={(e) => setSettings({ ...settings, footerBgColor: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="#1f2937"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  สีตัวอักษร Footer
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="color"
                    value={settings.footerTextColor}
                    onChange={(e) => setSettings({ ...settings, footerTextColor: e.target.value })}
                    className="w-full h-12 border-2 border-gray-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.footerTextColor}
                    onChange={(e) => setSettings({ ...settings, footerTextColor: e.target.value })}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8">
              <label className="text-sm font-semibold text-gray-700">ลิงก์ใน Footer</label>
              <p className="text-xs text-gray-500 mt-1 mb-3">
                กดปุ่มเพื่อเลือกว่าจะแสดงเมนูไหนบ้าง (เลือกได้หลายรายการ)
              </p>
              <div className="flex flex-wrap gap-2 mb-4">
                {FOOTER_PRESET_LINKS.map((preset) => {
                  const active = isFooterPresetActive(preset.href);
                  return (
                    <button
                      key={preset.href}
                      type="button"
                      onClick={() => toggleFooterPresetLink(preset)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                        active
                          ? "bg-purple-600 text-white shadow"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                <p className="text-sm font-semibold text-purple-900 mb-2">ลิงก์ที่จะแสดง</p>
                {settings.footerLinks.length ? (
                  <div className="flex flex-wrap gap-2">
                    {settings.footerLinks.map((link) => (
                      <span
                        key={link.href}
                        className="px-3 py-1 rounded-full bg-white text-purple-700 text-sm shadow-sm"
                      >
                        {link.label || link.href}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-purple-600">ยังไม่ได้เลือกเมนูใด</p>
                )}
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold mb-2">Footer Preview:</p>
              <div
                className="p-4 rounded-lg border-2 border-gray-200"
                style={{ backgroundColor: settings.footerBgColor, color: settings.footerTextColor }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  <div>
                    <h3 className="text-xl font-bold mb-2">
                      {settings.footerLogoText || "PORTFOLIO.PRO"}
                    </h3>
                    <p className="text-sm mt-2" style={{ opacity: 0.9 }}>
                      {settings.footerDescription || "คำอธิบาย..."}
                    </p>
                  </div>
                  <div className="flex md:justify-center">
                    <ul className="space-y-2 text-sm" style={{ opacity: 0.9 }}>
                      {settings.footerLinks.map((link) => (
                        <li key={link.id}>{link.label || "ลิงก์"}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-col items-start md:items-end gap-1 text-sm leading-tight">
                    {settings.footerShowEmail !== false && (
                      <p className="font-medium">
                        <span className="opacity-70 mr-1">อีเมล:</span>
                        <span className="break-all">{settings.footerEmail || "-"}</span>
                      </p>
                    )}
                    {settings.footerShowLocation !== false && (
                      <p className="font-medium">
                        <span className="opacity-70 mr-1">ที่อยู่:</span>
                        <span className="break-words">{settings.footerLocation || "-"}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Section - Copyright and Links */}
                <div
                  className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-6"
                  style={{ borderColor: settings.footerTextColor, opacity: 0.3 }}
                >
                  <p className="text-sm" style={{ opacity: 0.9 }}>
                    © {new Date().getFullYear()} {settings.footerLogoText || "PORTFOLIO.PRO"}. All rights reserved.
                  </p>
                  <div className="flex items-center gap-4">
                    {settings.footerLinks.slice(0, 2).map((link) => (
                      <span
                        key={`footer-bottom-${link.id}`}
                        className="text-sm"
                        style={{ opacity: 0.9 }}
                      >
                        {link.label || "ลิงก์"}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-end">
          <button
            onClick={handleReset}
            className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
          >
            🔄 รีเซ็ต
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "กำลังบันทึก..." : "💾 บันทึกการตั้งค่า"}
          </button>
        </div>
      </div>
    </div>
  );
}

