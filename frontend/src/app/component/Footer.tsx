"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useThemeConfig } from "../context/ThemeConfigContext";
import { useSiteSettings } from "../context/SiteSettingsContext";

export default function Footer() {
  const pathname = usePathname();
  const { theme } = useThemeConfig();
  const { settings, isLoading: settingsLoading, error: settingsError } = useSiteSettings();
  const footerTheme = theme.footer;
  const palette = theme.palette;

  // ซ่อน Footer ในหน้า admin ทั้งหมด (รวม /admin และ /[username]/admin)
  if (pathname?.startsWith("/admin") || pathname?.includes("/admin")) {
    return null;
  }

  const year = new Date().getFullYear();
  const navLinks =
    settings.footerLinks?.length > 0 ? settings.footerLinks : footerTheme.links || [];
  const backgroundColor = `var(--footer-bg, ${
    settings.footerBgColor || footerTheme.backgroundColor || palette.primary
  })`;
  const textColor = `var(--footer-text, ${
    settings.footerTextColor || footerTheme.textColor || palette.textOnPrimary || "#ffffff"
  })`;

  const displayName = settings.footerLogoText || theme.header.logoText || "-";
  const displayDescription =
    settings.footerDescription || footerTheme.text || "-";
  const displayEmail =
    settings.footerShowEmail === false
      ? undefined
      : settings.footerEmail || footerTheme.contactEmail || "hello@portfolio.pro";
  const displayLocation =
    settings.footerShowLocation === false ? undefined : settings.footerLocation || footerTheme.contactLocation;
  const displayPhone =
    settings.footerShowPhone === false
      ? undefined
      : settings.footerPhone?.trim()
      ? settings.footerPhone
      : footerTheme.contactPhone || "080-000-1234";

  return (
    <footer className="mt-12 border-t" style={{ backgroundColor }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div>
            <h2
              className="text-xl font-bold"
              style={{ color: textColor }}
              aria-live="polite"
              title={settingsError || undefined}
            >
              {settingsLoading ? "กำลังโหลด..." : displayName}
            </h2>
            <p className="mt-2" style={{ color: textColor, opacity: 0.9 }} aria-live="polite">
              {settingsLoading ? "กำลังโหลดข้อมูล..." : displayDescription}
            </p>
          </div>

          <div className="flex md:justify-center">
            <ul className="space-y-2" style={{ color: textColor, opacity: 0.9 }}>
              {navLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="hover:opacity-100 transition-opacity"
                    style={{ color: textColor }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="flex flex-col items-start md:items-end gap-1 text-sm leading-tight"
            style={{ color: textColor }}
          >
            {displayEmail && (
              <p className="font-medium" aria-label="อีเมล">
                <span className="opacity-70 mr-1">อีเมล:</span>
                <span className="break-all">{settingsLoading ? "กำลังโหลด..." : displayEmail}</span>
              </p>
            )}
            {displayLocation && (
              <p className="font-medium" aria-label="ที่อยู่">
                <span className="opacity-70 mr-1">ที่อยู่:</span>
                <span className="break-words">{settingsLoading ? "กำลังโหลด..." : displayLocation}</span>
              </p>
            )}
          </div>
        </div>

        <div
          className="mt-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t pt-6"
          style={{ borderColor: textColor, opacity: 0.3 }}
        >
          <p className="text-sm" style={{ color: textColor, opacity: 0.9 }}>
            © {year} {displayName}. {footerTheme.copyright || "All rights reserved."}
          </p>
          <div className="flex items-center gap-4">
            {navLinks.slice(0, 2).map((link) => (
              <Link
                key={`footer-bottom-${link.label}`}
                href={link.href}
                className="text-sm hover:opacity-100 transition-opacity"
                style={{ color: textColor, opacity: 0.9 }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
