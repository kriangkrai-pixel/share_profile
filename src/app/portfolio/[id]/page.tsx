"use client";

/**
 * Portfolio Detail Page - หน้ารายละเอียดผลงาน
 * 
 * คืออะไร:
 * - หน้าแสดงรายละเอียดของผลงานแต่ละชิ้น
 * 
 * เอาไว้ทำไร:
 * - แสดงรายละเอียดผลงานแบบเต็ม
 * - แสดงรูปภาพขนาดใหญ่
 * - แสดงลิงก์ไปยังโปรเจค (ถ้ามี)
 * - เพิ่มปุ่มกลับไปหน้าแรก
 * 
 * ฟีเจอร์:
 * - Dynamic Route [id]
 * - แสดงรูปภาพแบบ Lightbox
 * - Responsive Design
 * - แสดง 404 ถ้าไม่พบผลงาน
 */

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";

interface Portfolio {
  id: number;
  title: string;
  description: string;
  image?: string;
  link?: string;
}

function PortfolioDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams?.get("username") || "";
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  // สร้างลิงก์กลับไปหน้า profile หรือหน้าแรก
  const backLink = username ? `/${username}#portfolio` : "/#portfolio";
  const contactLink = username ? `/${username}#contact` : "/#contact";

  useEffect(() => {
    loadPortfolio();
  }, [params.id, username]);

  /**
   * โหลดข้อมูลผลงานจาก API
   */
  const loadPortfolio = async () => {
    try {
      // ใช้ CONTENT_USERNAME ถ้ามี username parameter, ถ้าไม่มีให้ใช้ PROFILE (backward compatibility)
      const apiEndpoint = username 
        ? API_ENDPOINTS.CONTENT_USERNAME(username)
        : API_ENDPOINTS.PROFILE;
      
      const response = await apiRequest(apiEndpoint, {
        method: "GET",
        cache: "no-store",
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(`⚠️ Failed to load portfolio: ${response.status} ${response.statusText}`, errorText);
        setNotFound(true);
        return;
      }
      
      const data = await response.json();
      
      if (data.portfolio && Array.isArray(data.portfolio)) {
        const found = data.portfolio.find(
          (item: Portfolio) => item.id === parseInt(params.id as string)
        );
        
        if (found) {
          setPortfolio(found);
        } else {
          setNotFound(true);
        }
      } else {
        setNotFound(true);
      }
    } catch (error) {
      console.error("Error loading portfolio:", error);
      if (isConnectionError(error)) {
        console.warn("⚠️ Backend may not be running.");
      }
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (notFound || !portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-9xl mb-6 block">❌</span>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            ไม่พบผลงาน
          </h1>
          <p className="text-gray-600 mb-8">
            ผลงานที่คุณค้นหาอาจถูกลบหรือไม่มีอยู่ในระบบ
          </p>
          <Link
            href={backLink}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
          >
            <span>←</span>
            <span>กลับไปหน้าแรก</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg border-b-2 border-blue-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={backLink}
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-2 transition-colors"
            >
              <span className="text-xl">←</span>
              <span>กลับไปหน้าแรก</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-2xl">📂</span>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                รายละเอียดผลงาน
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border-2 border-blue-100">
          {/* Portfolio Image */}
          {portfolio.image && (
            <div className="relative w-full h-[400px] md:h-[500px] bg-gradient-to-br from-blue-100 to-purple-100">
              <Image
                src={portfolio.image}
                alt={portfolio.title}
                fill
                className="object-contain p-8"
                priority
              />
              <div className="absolute top-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                ผลงาน #{portfolio.id}
              </div>
            </div>
          )}

          {/* Portfolio Info */}
          <div className="p-8 md:p-12">
            {/* Title */}
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {portfolio.title}
            </h2>

            {/* Description */}
            <div className="prose max-w-none mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-6 border-2 border-blue-100">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span>📝</span>
                  คำอธิบาย
                </h3>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-lg">
                  {portfolio.description}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              {portfolio.link && (
                <a
                  href={portfolio.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all text-center inline-flex items-center justify-center gap-2 group"
                >
                  <span>🔗</span>
                  <span>ดูโปรเจค</span>
                  <span className="transform group-hover:translate-x-1 transition-transform">→</span>
                </a>
              )}
              <Link
                href={contactLink}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 px-8 rounded-xl shadow-lg transition-all text-center inline-flex items-center justify-center gap-2"
              >
                <span>📧</span>
                <span>ติดต่อสอบถาม</span>
              </Link>
            </div>

            {/* Additional Info */}
            <div className="mt-12 pt-8 border-t-2 border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span>💼</span>
                    ประเภท
                  </h4>
                  <p className="text-gray-700">
                    Web Development & Design
                  </p>
                </div>
                <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                  <h4 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <span>✨</span>
                    สถานะ
                  </h4>
                  <p className="text-gray-700">
                    เสร็จสมบูรณ์
                  </p>
                </div>
              </div>
            </div>

            {/* Call to Action */}
            <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
              <h3 className="text-2xl font-bold mb-3">
                สนใจผลงานชิ้นนี้หรือไม่?
              </h3>
              <p className="mb-6 text-blue-100">
                ติดต่อเราเพื่อหารือเกี่ยวกับโปรเจคของคุณ
              </p>
              <Link
                href={contactLink}
                className="inline-flex items-center gap-2 bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
              >
                <span>📨</span>
                <span>ส่งข้อความ</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Back Button (Mobile) */}
        <div className="mt-8 text-center md:hidden">
          <Link
            href={backLink}
            className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 font-bold py-3 px-6 rounded-xl shadow-lg transition-all border-2 border-gray-200"
          >
            <span>←</span>
            <span>กลับไปหน้าแรก</span>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2025 Portfolio. All rights reserved.
          </p>
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 font-semibold mt-2 inline-block"
          >
            กลับหน้าแรก
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function PortfolioDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <PortfolioDetailContent />
    </Suspense>
  );
}

