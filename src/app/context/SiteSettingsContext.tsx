"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";

export type HeaderMenuLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type HeaderCta = {
  label: string;
  href: string;
  external?: boolean;
  enabled?: boolean;
};

export interface HeaderMenuConfig {
  links: HeaderMenuLink[];
  cta?: HeaderCta;
}

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export interface SiteSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
  headerLogoText: string;
  headerMenuItems: HeaderMenuConfig;
  footerLogoText: string;
  footerDescription: string;
  footerEmail: string;
  footerLocation: string;
  footerPhone: string;
  footerLinks: FooterLink[];
  footerShowLocation: boolean;
  footerShowEmail: boolean;
  footerShowPhone: boolean;
}

const DEFAULT_HEADER_MENU: HeaderMenuConfig = {
  links: [
    { label: "หน้าแรก", href: "/#hero" },
    { label: "เกี่ยวกับฉัน", href: "/#about" },
    { label: "ทักษะ", href: "/#skills" },
    { label: "ผลงาน", href: "/#portfolio" },
    { label: "ติดต่อ", href: "/#contact" },
  ],
  cta: {
    label: "จ้างงานเลย",
    href: "/contact",
    enabled: true,
  },
};

const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: "งานทั้งหมด", href: "/#portfolio" },
  { label: "ประสบการณ์", href: "/#experience" },
  { label: "ติดต่อ", href: "/#contact" },
];

const DEFAULT_SITE_SETTINGS: SiteSettings = {
  primaryColor: "#3b82f6",
  secondaryColor: "#8b5cf6",
  accentColor: "#10b981",
  backgroundColor: "#ffffff",
  textColor: "#1f2937",
  headerBgColor: "#ffffff",
  headerTextColor: "#1f2937",
  footerBgColor: "#1f2937",
  footerTextColor: "#ffffff",
  headerLogoText: "PORTFOLIO.PRO",
  headerMenuItems: DEFAULT_HEADER_MENU,
  footerLogoText: "PORTFOLIO.PRO",
  footerDescription: "ช่วยคุณนำเสนอโปรไฟล์และผลงานอย่างมืออาชีพ",
  footerEmail: "hello@portfolio.pro",
  footerLocation: "Bangkok, Thailand",
  footerPhone: "080-000-1234",
  footerLinks: DEFAULT_FOOTER_LINKS,
  footerShowLocation: true,
  footerShowEmail: true,
  footerShowPhone: true,
};

interface SiteSettingsContextValue {
  settings: SiteSettings;
  isLoading: boolean;
  error?: string;
  refreshSettings: () => Promise<void>;
}

const STORAGE_KEY = "site-settings";

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadFromCache = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setSettings({
          ...DEFAULT_SITE_SETTINGS,
          ...parsed,
          headerMenuItems: {
            ...DEFAULT_SITE_SETTINGS.headerMenuItems,
            ...(parsed.headerMenuItems || {}),
            links:
              parsed.headerMenuItems?.links?.length > 0
                ? parsed.headerMenuItems.links
                : DEFAULT_SITE_SETTINGS.headerMenuItems.links,
          },
          footerLinks:
            parsed.footerLinks?.length > 0 ? parsed.footerLinks : DEFAULT_SITE_SETTINGS.footerLinks,
          footerShowLocation:
            parsed.footerShowLocation === undefined
              ? DEFAULT_SITE_SETTINGS.footerShowLocation
              : Boolean(parsed.footerShowLocation),
          footerShowEmail:
            parsed.footerShowEmail === undefined
              ? DEFAULT_SITE_SETTINGS.footerShowEmail
              : Boolean(parsed.footerShowEmail),
          footerShowPhone:
            parsed.footerShowPhone === undefined
              ? DEFAULT_SITE_SETTINGS.footerShowPhone
              : Boolean(parsed.footerShowPhone),
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      const response = await apiRequest(API_ENDPOINTS.SETTINGS, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`โหลดการตั้งค่าไม่สำเร็จ (${response.status})`);
      }

      const data = await response.json();
      const safeSettings: SiteSettings = {
        ...DEFAULT_SITE_SETTINGS,
        ...data,
        headerMenuItems: {
          ...DEFAULT_SITE_SETTINGS.headerMenuItems,
          ...(data.headerMenuItems || {}),
          links:
            data.headerMenuItems?.links?.length > 0
              ? data.headerMenuItems.links
              : DEFAULT_SITE_SETTINGS.headerMenuItems.links,
        },
        footerLinks:
          data.footerLinks?.length > 0 ? data.footerLinks : DEFAULT_SITE_SETTINGS.footerLinks,
        footerShowLocation:
          data.footerShowLocation === undefined
            ? DEFAULT_SITE_SETTINGS.footerShowLocation
            : Boolean(data.footerShowLocation),
        footerShowEmail:
          data.footerShowEmail === undefined
            ? DEFAULT_SITE_SETTINGS.footerShowEmail
            : Boolean(data.footerShowEmail),
        footerShowPhone:
          data.footerShowPhone === undefined
            ? DEFAULT_SITE_SETTINGS.footerShowPhone
            : Boolean(data.footerShowPhone),
      };
      setSettings(safeSettings);
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSettings));
      }
    } catch (err: any) {
      if (isConnectionError(err)) {
        setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ใช้ค่าล่าสุดแทน");
        loadFromCache();
      } else {
        setError(err?.message || "ไม่สามารถโหลดการตั้งค่าได้");
      }
    } finally {
      setIsLoading(false);
    }
  }, [loadFromCache]);

  useEffect(() => {
    loadFromCache();
    fetchSettings();
  }, [fetchSettings, loadFromCache]);

  const refreshSettings = useCallback(async () => {
    await fetchSettings();
  }, [fetchSettings]);

  const value = useMemo<SiteSettingsContextValue>(
    () => ({
      settings,
      isLoading,
      error,
      refreshSettings,
    }),
    [settings, isLoading, error, refreshSettings],
  );

  return (
    <SiteSettingsContext.Provider value={value}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
  }
  return context;
}

