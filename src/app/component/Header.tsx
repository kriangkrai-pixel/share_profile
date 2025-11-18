"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Header() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // ซ่อน Header ในหน้า admin
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  // ปิดเมนูเมื่อคลิกลิงก์
  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  // ฟังก์ชันสำหรับ scroll ไปยัง section
  const scrollToSection = (sectionId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    closeMenu(); // ปิดเมนูเมื่อคลิก
    
    if (pathname === "/") {
      // ถ้า sectionId เป็น "#" หรือว่าง ให้ scroll ไปยังด้านบน
      if (sectionId === "#" || sectionId === "") {
        window.history.pushState(null, "", "/");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      
      // ถ้าอยู่หน้าแรก ให้ scroll ไปยัง section
      const element = document.getElementById(sectionId);
      if (element) {
        // อัปเดต URL hash
        window.history.pushState(null, "", `#${sectionId}`);
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      // ถ้าอยู่หน้าอื่น ให้ไปหน้าแรกแล้ว scroll
      if (sectionId === "#" || sectionId === "") {
        window.location.href = "/";
      } else {
        window.location.href = `/#${sectionId}`;
      }
    }
  };

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex items-center justify-between p-4">
        {/* โลโก้ */}
        <Link 
          href="/" 
          onClick={closeMenu}
          className="text-xl md:text-2xl font-bold text-gray-800 hover:text-blue-600 transition-colors"
        >
          KRIANGKRAI.P
        </Link>

        {/* Hamburger Button (Mobile) */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="md:hidden flex flex-col items-center justify-center w-10 h-10 space-y-1.5 focus:outline-none"
          aria-label="Toggle menu"
        >
          <span
            className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${
              isMenuOpen ? "rotate-45 translate-y-2" : ""
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${
              isMenuOpen ? "opacity-0" : ""
            }`}
          ></span>
          <span
            className={`block w-6 h-0.5 bg-gray-800 transition-all duration-300 ${
              isMenuOpen ? "-rotate-45 -translate-y-2" : ""
            }`}
          ></span>
        </button>

        {/* เมนู Desktop */}
        <nav className="hidden md:block">
          <ul className="flex space-x-6 text-gray-700 font-medium">
            {pathname === "/" ? (
              // ถ้าอยู่หน้าแรก แสดง section links
              <>
                <li>
                  <button
                    onClick={(e) => scrollToSection("", e)}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    หน้าแรก
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("about")}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    เกี่ยวกับฉัน
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("portfolio")}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    ผลงาน
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    ติดต่อ
                  </button>
                </li>
              </>
            ) : pathname === "/Contact" ? (
              // ถ้าอยู่หน้า Contact
              <>
                <li>
                  <Link
                    href="/"
                    className="hover:text-blue-600 transition-colors duration-300"
                  >
                    หน้าแรก
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    ติดต่อ
                  </button>
                </li>
              </>
            ) : (
              // หน้าอื่นๆ
              <>
                <li>
                  <Link
                    href="/"
                    className="hover:text-blue-600 transition-colors duration-300"
                  >
                    หน้าแรก
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("about")}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    เกี่ยวกับฉัน
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("portfolio")}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    ผลงาน
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="hover:text-blue-600 transition-colors duration-300 cursor-pointer"
                  >
                    ติดต่อ
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* เมนู Mobile */}
        <nav
          className={`md:hidden absolute top-full left-0 right-0 bg-white shadow-lg transition-all duration-300 ease-in-out ${
            isMenuOpen
              ? "max-h-screen opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <ul className="flex flex-col text-gray-700 font-medium">
            {pathname === "/" ? (
              // ถ้าอยู่หน้าแรก แสดง section links
              <>
                <li className="border-b border-gray-100">
                  <button
                    onClick={(e) => scrollToSection("", e)}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    หน้าแรก
                  </button>
                </li>
                <li className="border-b border-gray-100">
                  <button
                    onClick={() => scrollToSection("about")}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    เกี่ยวกับฉัน
                  </button>
                </li>
                <li className="border-b border-gray-100">
                  <button
                    onClick={() => scrollToSection("portfolio")}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    ผลงาน
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    ติดต่อ
                  </button>
                </li>
              </>
            ) : pathname === "/Contact" ? (
              // ถ้าอยู่หน้า Contact
              <>
                <li className="border-b border-gray-100">
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="block w-full px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    หน้าแรก
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    ติดต่อ
                  </button>
                </li>
              </>
            ) : (
              // หน้าอื่นๆ
              <>
                <li className="border-b border-gray-100">
                  <Link
                    href="/"
                    onClick={closeMenu}
                    className="block w-full px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    หน้าแรก
                  </Link>
                </li>
                <li className="border-b border-gray-100">
                  <button
                    onClick={() => scrollToSection("about")}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    เกี่ยวกับฉัน
                  </button>
                </li>
                <li className="border-b border-gray-100">
                  <button
                    onClick={() => scrollToSection("portfolio")}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    ผลงาน
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="w-full text-left px-6 py-4 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-300"
                  >
                    ติดต่อ
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>
      </div>

      {/* Overlay เมื่อเปิดเมนูบนมือถือ */}
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
