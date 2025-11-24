export interface ThemePalette {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  textMuted: string;
  textOnPrimary: string;
  surface: string;
  background: string;
}

export interface ThemeNavLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface ThemeCallToAction {
  label: string;
  href: string;
  background?: string;
  color?: string;
  external?: boolean;
}

export interface ThemeHeaderConfig {
  logoText?: string;
  logoImage?: string;
  backgroundColor?: string;
  textColor?: string;
  links: ThemeNavLink[];
  cta?: ThemeCallToAction;
}

export interface ThemeFooterConfig {
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  links?: ThemeNavLink[];
  social?: Array<{ label: string; url: string }>;
  contactEmail?: string;
  contactLocation?: string;
  copyright?: string;
}

export interface ThemeComponentConfig {
  buttons: {
    shape: "pill" | "rounded" | "square";
    elevation: "none" | "soft" | "strong";
  };
  cards: {
    borderRadius: number;
    showShadow: boolean;
    overlayOpacity: number;
  };
}

export interface ThemeBackgroundConfig {
  type: "solid" | "gradient" | "image";
  value: string;
  overlay?: string;
}

export interface ThemeConfig {
  palette: ThemePalette;
  header: ThemeHeaderConfig;
  footer: ThemeFooterConfig;
  components: ThemeComponentConfig;
  background: ThemeBackgroundConfig;
  metadata?: {
    username?: string;
    updatedAt?: string;
  };
}

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
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
    updatedAt: new Date(2024, 0, 1).toISOString(),
  },
};

