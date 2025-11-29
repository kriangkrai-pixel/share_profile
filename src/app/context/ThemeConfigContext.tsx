"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";

type ButtonShape = "pill" | "rounded" | "square";
type ButtonElevation = "none" | "soft" | "strong";
type BackgroundType = "solid" | "gradient" | "image";

interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  surface: string;
  background: string;
}

interface ThemeNavLink {
  label: string;
  href: string;
  external?: boolean;
}

interface ThemeCTA {
  label: string;
  href: string;
  background?: string;
  color?: string;
  external?: boolean;
}

interface ThemeHeaderConfig {
  logoText?: string;
  logoImage?: string;
  backgroundColor?: string;
  textColor?: string;
  links?: ThemeNavLink[];
  cta?: ThemeCTA;
}

interface ThemeFooterConfig {
  [x: string]: string | ThemeNavLink[] | Array<{ label: string; url: string }> | undefined;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  links?: ThemeNavLink[];
  social?: Array<{ label: string; url: string }>;
  contactEmail?: string;
  contactLocation?: string;
  copyright?: string;
}

interface ThemeComponentsConfig {
  buttons: {
    shape: ButtonShape;
    elevation: ButtonElevation;
  };
  cards: {
    borderRadius: number;
    showShadow: boolean;
    overlayOpacity: number;
  };
}

interface ThemeBackgroundConfig {
  type: BackgroundType;
  value: string;
  overlay?: string;
}

export interface ThemeConfig {
  palette: ThemePalette;
  header: ThemeHeaderConfig;
  footer: ThemeFooterConfig;
  components: ThemeComponentsConfig;
  background: ThemeBackgroundConfig;
  metadata?: {
    username?: string;
    updatedAt?: string;
  };
}

const DEFAULT_THEME_CONFIG: ThemeConfig = {
  palette: {
    primary: "#2563eb",
    secondary: "#1d4ed8",
    accent: "#f97316",
    text: "#111827",
    textMuted: "#6b7280",
    textOnPrimary: "#ffffff",
    surface: "#ffffff",
    background: "#f8fafc",
  },
  header: {
    logoText: "PORTFOLIO.PRO",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
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
      background: "#2563eb",
      color: "#ffffff",
    },
  },
  footer: {
    text: "ช่วยคุณนำเสนอโปรไฟล์และผลงานอย่างมืออาชีพ",
    backgroundColor: "#0f172a",
    textColor: "#ffffff",
    links: [
      { label: "งานทั้งหมด", href: "/#portfolio" },
      { label: "ประสบการณ์", href: "/#experience" },
      { label: "ติดต่อ", href: "/#contact" },
    ],
    social: [
      { label: "GitHub", url: "https://github.com" },
      { label: "LinkedIn", url: "https://www.linkedin.com" },
    ],
    contactEmail: "hello@portfolio.pro",
    contactLocation: "Bangkok, Thailand",
    copyright: "All rights reserved.",
  },
  components: {
    buttons: {
      shape: "pill",
      elevation: "soft",
    },
    cards: {
      borderRadius: 24,
      showShadow: true,
      overlayOpacity: 0.35,
    },
  },
  background: {
    type: "gradient",
    value: "linear-gradient(135deg, #e0f2fe 0%, #f5f3ff 50%, #fefce8 100%)",
    overlay: "rgba(255, 255, 255, 0.85)",
  },
  metadata: {
    username: "default",
  },
};

interface ThemeConfigContextValue {
  theme: ThemeConfig;
  isLoading: boolean;
  error?: string;
  activeUsername: string;
  refreshTheme: (usernameOverride?: string) => Promise<void>;
}

const ThemeConfigContext = createContext<ThemeConfigContextValue | undefined>(undefined);

const STORAGE_PREFIX = "theme-config:";
const RESERVED_SEGMENTS = new Set(["admin", "register", "login", "api", "_next", "static"]);
const DEFAULT_USERNAME = "default";

const mergeTheme = (theme?: Partial<ThemeConfig>): ThemeConfig => {
  if (!theme) {
    return DEFAULT_THEME_CONFIG;
  }

  return {
    ...DEFAULT_THEME_CONFIG,
    ...theme,
    palette: {
      ...DEFAULT_THEME_CONFIG.palette,
      ...(theme.palette || {}),
    },
    header: {
      ...DEFAULT_THEME_CONFIG.header,
      ...(theme.header || {}),
      links: theme.header?.links ?? DEFAULT_THEME_CONFIG.header.links,
      cta: theme.header?.cta ?? DEFAULT_THEME_CONFIG.header.cta,
    },
    footer: {
      ...DEFAULT_THEME_CONFIG.footer,
      ...(theme.footer || {}),
      links: theme.footer?.links ?? DEFAULT_THEME_CONFIG.footer.links,
      social: theme.footer?.social ?? DEFAULT_THEME_CONFIG.footer.social,
    },
    components: {
      ...DEFAULT_THEME_CONFIG.components,
      ...(theme.components || {}),
      buttons: {
        ...DEFAULT_THEME_CONFIG.components.buttons,
        ...(theme.components?.buttons || {}),
      },
      cards: {
        ...DEFAULT_THEME_CONFIG.components.cards,
        ...(theme.components?.cards || {}),
      },
    },
    background: {
      ...DEFAULT_THEME_CONFIG.background,
      ...(theme.background || {}),
    },
    metadata: {
      ...DEFAULT_THEME_CONFIG.metadata,
      ...(theme.metadata || {}),
    },
  };
};

const resolveUsernameFromPath = (pathname?: string): string => {
  if (!pathname || pathname === "/") {
    return DEFAULT_USERNAME;
  }

  const segments = pathname
    .split("/")
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean);

  if (!segments.length) {
    return DEFAULT_USERNAME;
  }

  const first = segments[0];
  if (RESERVED_SEGMENTS.has(first)) {
    return DEFAULT_USERNAME;
  }

  return first;
};

export function ThemeConfigProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME_CONFIG);
  const [activeUsername, setActiveUsername] = useState(DEFAULT_USERNAME);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const activeUsernameRef = useRef(DEFAULT_USERNAME);

  const getStorageKey = (username: string) => `${STORAGE_PREFIX}${username}`;

  const fetchTheme = useCallback(
    async (usernameOverride?: string) => {
      const username = usernameOverride || activeUsernameRef.current || DEFAULT_USERNAME;
      activeUsernameRef.current = username;
      setActiveUsername(username);
      setIsLoading(true);
      setError(undefined);

      try {
        if (typeof window !== "undefined") {
          const cachedRaw = localStorage.getItem(getStorageKey(username));
          if (cachedRaw) {
            try {
              const cachedTheme = JSON.parse(cachedRaw);
              setTheme(mergeTheme(cachedTheme));
            } catch {
              // ignore parsing errors for cache
            }
          }
        }

        const endpoint =
          username === DEFAULT_USERNAME
            ? API_ENDPOINTS.THEME_DEFAULT
            : API_ENDPOINTS.THEME_CONFIG(username);

        const response = await apiRequest(endpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`โหลดธีมไม่สำเร็จ (${response.status})`);
        }

        const data = await response.json();
        const nextTheme = mergeTheme(data?.theme ?? data);
        setTheme(nextTheme);

        if (typeof window !== "undefined") {
          localStorage.setItem(getStorageKey(username), JSON.stringify(nextTheme));
        }
      } catch (err: any) {
        if (!isConnectionError(err)) {
          setError(err?.message || "ไม่สามารถโหลดธีมได้");
        } else {
          setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ใช้ธีมเริ่มต้นแทน");
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const username = resolveUsernameFromPath(pathname);
    activeUsernameRef.current = username;
    setActiveUsername(username);
    fetchTheme(username);
  }, [pathname, fetchTheme]);

  const value = useMemo<ThemeConfigContextValue>(
    () => ({
      theme,
      isLoading,
      error,
      activeUsername,
      refreshTheme: fetchTheme,
    }),
    [theme, isLoading, error, activeUsername, fetchTheme]
  );

  return <ThemeConfigContext.Provider value={value}>{children}</ThemeConfigContext.Provider>;
}

export function useThemeConfig() {
  const context = useContext(ThemeConfigContext);
  if (!context) {
    throw new Error("useThemeConfig must be used within a ThemeConfigProvider");
  }
  return context;
}

