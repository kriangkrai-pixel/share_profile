"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
  Suspense,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";
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
const RESERVED_PATH_SEGMENTS = new Set([
  "admin",
  "register",
  "login",
  "portfolio",
  "contact",
  "api",
  "_next",
]);

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

function SiteSettingsProviderInner({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const queryOwner = searchParams?.get("username")?.trim() || null;
  const pathSegments = pathname?.split("/").filter(Boolean) ?? [];
  const firstSegment = pathSegments[0];
  const pathOwner =
    firstSegment && !RESERVED_PATH_SEGMENTS.has(firstSegment) ? firstSegment : null;
  const ownerParam = queryOwner || pathOwner;
  const storageKey = ownerParam ? `${STORAGE_KEY}:${ownerParam}` : STORAGE_KEY;
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();

  const loadFromCache = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem(storageKey);
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
  }, [storageKey]);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);
    try {
      let data: any = null;

      if (ownerParam) {
        const ownerResponse = await apiRequest(API_ENDPOINTS.SETTINGS_USERNAME(ownerParam), {
          method: "GET",
          cache: "no-store",
          username: ownerParam, // ส่ง username เพื่อให้ใช้ token ที่ถูกต้อง
        });
        if (ownerResponse.ok) {
          data = await ownerResponse.json();
        } else if (ownerResponse.status !== 404) {
          console.warn(`⚠️ Failed to load owner settings (${ownerResponse.status})`);
        }
      }

      if (!data) {
        const personalResponse = await apiRequest(API_ENDPOINTS.SETTINGS_ME, {
          method: "GET",
          cache: "no-store",
          username: ownerParam || undefined, // ส่ง username ถ้ามี เพื่อให้ใช้ token ที่ถูกต้อง
        });

        if (personalResponse.ok) {
          data = await personalResponse.json();
        } else {
          if (personalResponse.status !== 401 && personalResponse.status !== 404) {
            console.warn(`⚠️ Failed to load personal settings (${personalResponse.status})`);
          }
          const fallbackResponse = await apiRequest(API_ENDPOINTS.SETTINGS, {
            method: "GET",
            cache: "no-store",
            username: ownerParam || undefined, // ส่ง username ถ้ามี เพื่อให้ใช้ token ที่ถูกต้อง
          });
          if (!fallbackResponse.ok) {
            throw new Error(`โหลดการตั้งค่าไม่สำเร็จ (${fallbackResponse.status})`);
          }
          data = await fallbackResponse.json();
        }
      }
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
        localStorage.setItem(storageKey, JSON.stringify(safeSettings));
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
  }, [loadFromCache, ownerParam, storageKey]);

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

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh' }} />}>
      <SiteSettingsProviderInner>{children}</SiteSettingsProviderInner>
    </Suspense>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (!context) {
    throw new Error("useSiteSettings must be used within a SiteSettingsProvider");
  }
  return context;
}

