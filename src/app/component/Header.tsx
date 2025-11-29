"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useThemeConfig } from "../context/ThemeConfigContext";
import { useSiteSettings } from "../context/SiteSettingsContext";

const RESERVED_PATH_SEGMENTS = new Set(["admin", "register", "login", "portfolio", "contact", "api", "_next"]);

export default function Header() {
  const pathname = usePathname();
  const { theme } = useThemeConfig();
  const { settings, isLoading: siteSettingsLoading } = useSiteSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathSegments = useMemo(() => pathname?.split("/").filter(Boolean) ?? [], [pathname]);
  const ownerSegment = useMemo(() => {
    const firstSegment = pathSegments[0];
    if (!firstSegment || RESERVED_PATH_SEGMENTS.has(firstSegment)) {
      return null;
    }
    return firstSegment;
  }, [pathSegments]);
  const ownerBasePath = ownerSegment ? `/${ownerSegment}` : "/";
  const isPrimaryOwnerPage = ownerSegment ? pathname === ownerBasePath : pathname === "/";

  const headerTheme = theme.header;
  const palette = theme.palette;
  const headerMenu = settings.headerMenuItems;
  const navLinks = useMemo(() => {
    const rawLinks = headerMenu?.links?.length ? headerMenu.links : headerTheme.links || [];
    return rawLinks.filter((link) => {
      const href = link.href?.trim();
      if (!href) return false;
      return href !== "/#skills" && href !== "#skills";
    });
  }, [headerMenu?.links, headerTheme.links]);

  const ctaButton = useMemo(() => {
    const cta = headerMenu?.cta;
    if (!cta || cta.enabled === false) return null;
    if (!cta.label?.trim() || !cta.href?.trim()) return null;
    return cta;
  }, [headerMenu?.cta]);

  const withVarFallback = (variable: string, fallback: string) => `var(${variable}, ${fallback})`;

  const colors = useMemo(() => {
    const bgFallback = settings.headerBgColor || headerTheme.backgroundColor || palette.surface || "#ffffff";
    const textFallback = settings.headerTextColor || headerTheme.textColor || palette.text || "#1f2937";
    return {
      background: withVarFallback("--header-bg", bgFallback),
      text: withVarFallback("--header-text", textFallback),
    };
  }, [
    settings.headerBgColor,
    settings.headerTextColor,
    headerTheme.backgroundColor,
    headerTheme.textColor,
    palette.surface,
    palette.text,
  ]);

  // ซ่อน Header ในหน้า admin ทั้งหมด (รวม /admin และ /[username]/admin)
  if (
    pathname?.startsWith("/admin") || 
    pathname === "/register" ||
    pathname?.includes("/admin")
  ) {
    return null;
  }

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const scrollToSection = (href: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    closeMenu();

    const target = href.replace("/#", "").replace("#", "");

    if (isPrimaryOwnerPage) {
      if (!target) {
        window.history.pushState(null, "", ownerBasePath);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const element = document.getElementById(target);
      if (element) {
        const newUrl = ownerBasePath === "/" ? `#${target}` : `${ownerBasePath}#${target}`;
        window.history.pushState(null, "", newUrl);
        element.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }

      const fallbackUrl = ownerBasePath === "/" ? `/#${target}` : `${ownerBasePath}#${target}`;
      window.location.href = fallbackUrl;
    } else {
      const destination =
        ownerBasePath === "/"
          ? target
            ? `/#${target}`
            : "/"
          : target
            ? `${ownerBasePath}#${target}`
            : ownerBasePath;
      window.location.href = destination;
    }
  };

  const isSectionLink = (href: string) =>
    href?.startsWith("#") || href?.startsWith("/#");

  const renderNavButton = (
    link: { label: string; href: string; external?: boolean },
    variant: "desktop" | "mobile"
  ) => {
    if (isSectionLink(link.href)) {
      return (
        <button
          key={`${variant}-${link.label}`}
          onClick={(e) => scrollToSection(link.href, e)}
          className={
            variant === "desktop"
              ? "hover:text-blue-600 transition-colors duration-300 cursor-pointer"
              : "w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
          }
          style={{ color: colors.text }}
        >
          {link.label}
        </button>
      );
    }

    return (
      <Link
        key={`${variant}-${link.label}`}
        href={link.href || "/"}
        target={link.external ? "_blank" : undefined}
        rel={link.external ? "noopener noreferrer" : undefined}
        onClick={closeMenu}
        className={
          variant === "desktop"
            ? "hover:text-blue-600 transition-colors duration-300"
            : "block w-full px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
        }
        style={{ color: colors.text }}
      >
        {link.label}
      </Link>
    );
  };

  const logoText = settings.headerLogoText || headerTheme.logoText || "PORTFOLIO.PRO";

  const logo = (
    <Link
      href="/"
      onClick={closeMenu}
      className="flex items-center gap-3 text-xl md:text-2xl font-bold hover:text-blue-600 transition-colors"
      style={{ color: colors.text }}
    >
      {headerTheme.logoImage ? (
        <Image
          src={headerTheme.logoImage}
          alt={logoText || "Logo"}
          width={120}
          height={40}
          className="h-10 w-auto object-contain"
          priority
        />
      ) : (
        <span aria-live="polite">{siteSettingsLoading ? "กำลังโหลด..." : logoText}</span>
      )}
    </Link>
  );

  return (
    <header
      className="shadow-md sticky top-0 z-50"
      style={{ backgroundColor: colors.background }}
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        {logo}

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col items-center justify-center w-10 h-10 space-y-1.5 focus:outline-none"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 transition-all duration-300 ${
              isMenuOpen ? "rotate-45 translate-y-2" : ""
            }`}
            style={{ backgroundColor: colors.text }}
          ></span>
          <span
            className={`block w-6 h-0.5 transition-all duration-300 ${
              isMenuOpen ? "opacity-0" : ""
            }`}
            style={{ backgroundColor: colors.text }}
          ></span>
          <span
            className={`block w-6 h-0.5 transition-all duration-300 ${
              isMenuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
            style={{ backgroundColor: colors.text }}
          ></span>
        </button>

        <nav className="hidden md:block">
          <ul className="flex items-center space-x-6 font-medium" style={{ color: colors.text }}>
            {navLinks.map((link) => (
              <li key={`desktop-${link.label}`}>{renderNavButton(link, "desktop")}</li>
            ))}
            {ctaButton && (
              <li>
                {isSectionLink(ctaButton.href) ? (
                  <button
                    onClick={(e) => scrollToSection(ctaButton.href, e)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-medium"
                  >
                    {ctaButton.label}
                  </button>
                ) : (
                  <Link
                    href={ctaButton.href}
                    target={ctaButton.external ? "_blank" : undefined}
                    rel={ctaButton.external ? "noopener noreferrer" : undefined}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 font-medium"
                  >
                    {ctaButton.label}
                  </Link>
                )}
              </li>
            )}
          </ul>
        </nav>

        <nav
          className={`md:hidden absolute top-full left-0 right-0 shadow-lg transition-all duration-300 ease-in-out ${
            isMenuOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 overflow-hidden"
          }`}
          style={{ backgroundColor: colors.background }}
        >
          <ul className="flex flex-col font-medium" style={{ color: colors.text }}>
            {navLinks.map((link) => (
              <li key={`mobile-${link.label}`} className="border-b border-gray-100">
                {renderNavButton(link, "mobile")}
              </li>
            ))}
            {ctaButton && (
              <li className="border-b border-gray-100 last:border-b-0">
                {isSectionLink(ctaButton.href) ? (
                  <button
                    onClick={(e) => scrollToSection(ctaButton.href, e)}
                    className="w-full text-left px-6 py-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-300 font-medium"
                  >
                    {ctaButton.label}
                  </button>
                ) : (
                  <Link
                    href={ctaButton.href}
                    target={ctaButton.external ? "_blank" : undefined}
                    rel={ctaButton.external ? "noopener noreferrer" : undefined}
                    onClick={closeMenu}
                    className="block w-full px-6 py-4 bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-300 font-medium"
                  >
                    {ctaButton.label}
                  </Link>
                )}
              </li>
            )}
          </ul>
        </nav>
      </div>

      {isMenuOpen && (
        <div
          onClick={closeMenu}
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 -z-10"
          style={{ top: "64px" }}
        ></div>
      )}
    </header>
  );
}
