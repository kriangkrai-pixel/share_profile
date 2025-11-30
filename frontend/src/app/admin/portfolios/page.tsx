"use client";

/**
 * Admin Portfolios Management - จัดการผลงาน
 * 
 * คืออะไร:
 * - หน้าสำหรับจัดการผลงาน (Portfolio) ทั้งหมด
 * 
 * เอาไว้ทำไร:
 * - เพิ่มผลงานใหม่
 * - แก้ไขผลงานที่มีอยู่
 * - ลบผลงาน
 * - อัปโหลดรูปภาพประกอบผลงาน
 * 
 * ฟีเจอร์:
 * - แสดงรายการผลงานทั้งหมด
 * - Modal สำหรับเพิ่ม/แก้ไข
 * - อัปโหลดรูปภาพไปยัง S3 (เก็บเป็น URL/path แทน Base64)
 * - ลิงก์ไปหน้ารายละเอียด
 */

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAdminSession } from "../../hooks/useAdminSession";
import { API_ENDPOINTS, apiRequest } from "../../../lib/api-config";
import { getUsernameFromToken } from "../../../lib/jwt-utils";

interface Portfolio {
  id: number;
  title: string;
  description: string;
  image?: string;
  link?: string;
  createdAt: string;
  updatedAt: string;
}

export default function PortfoliosPage() {
  const router = useRouter();
  const pathname = usePathname();
  
  // ดึง username จาก URL pathname (สำหรับ /[username]/admin/portfolios)
  const urlMatch = pathname?.match(/^\/([^/]+)\/admin\/portfolios/);
  const urlUsername = urlMatch ? urlMatch[1] : null;
  
  // Debug: log pathname และ urlUsername
  console.log("🔍 Portfolios Page - pathname:", pathname, "urlUsername:", urlUsername);
  
  // ส่ง username ไปให้ useAdminSession เพื่อใช้ token ที่ถูกต้อง
  useAdminSession(urlUsername || undefined);
  const [authenticated, setAuthenticated] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState<Portfolio | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    link: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    // สร้าง async function ภายใน useEffect
    const initializeData = async () => {
      console.log("🚀 Initializing Portfolios Page - urlUsername:", urlUsername);
      
      // ใช้ token ตาม username จาก URL หรือ token เก่า
      let token: string | null = null;
      if (urlUsername) {
        const { getTokenForUser } = require("@/lib/jwt-utils");
        token = getTokenForUser(urlUsername);
        console.log("🔑 Token for", urlUsername, ":", token ? "found" : "not found");
      }
      
      if (!token) {
        token = localStorage.getItem("adminToken") || localStorage.getItem("authToken");
        console.log("🔑 Using fallback token:", token ? "found" : "not found");
      }
      
      if (!token) {
        console.warn("⚠️ No token found, redirecting to login");
        router.push("/admin/login");
        return;
      }
      
      setAuthenticated(true);
      // ดึง username จาก token ที่ถูกต้อง
      const currentUsername = getUsernameFromToken(urlUsername || undefined);
      console.log("👤 Current username from token:", currentUsername, "urlUsername:", urlUsername);
      setUsername(currentUsername);
      
      // ใช้ urlUsername เป็นหลัก (เพราะมาจาก URL)
      const targetUsername = urlUsername || currentUsername;
      console.log("🎯 Target username for loading portfolios:", targetUsername);
      
      if (targetUsername) {
        await loadPortfolios();
      } else {
        console.warn("⚠️ No username found, redirecting to login");
        router.push("/admin/login");
      }
    };

    // เรียกใช้ async function
    initializeData();
  }, [router, urlUsername]);

  /**
   * โหลดรายการผลงานทั้งหมดจาก API
   */
  const loadPortfolios = async () => {
    try {
      const targetUsername = urlUsername || username;
      console.log("🔄 Loading portfolios for username:", targetUsername);
      
      const response = await apiRequest(API_ENDPOINTS.PROFILE, {
        method: "GET",
        username: targetUsername || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }
      
      const data = await response.json();
      setPortfolios(Array.isArray(data.portfolio) ? data.portfolio : []);
    } catch (error) {
      console.error("Error loading portfolios:", error);
      setPortfolios([]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * เปิด Modal สำหรับเพิ่มผลงานใหม่
   */
  const handleOpenAddModal = () => {
    setFormData({ title: "", description: "", image: "", link: "" });
    setShowAddModal(true);
    setEditingPortfolio(null);
  };

  /**
   * เปิด Modal สำหรับแก้ไขผลงาน
   */
  const handleOpenEditModal = (portfolio: Portfolio) => {
    setFormData({
      title: portfolio.title,
      description: portfolio.description,
      image: portfolio.image || "",
      link: portfolio.link || "",
    });
    setEditingPortfolio(portfolio);
    setShowAddModal(true);
  };

  /**
   * ปิด Modal และ Clear Form
   */
  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingPortfolio(null);
    setFormData({ title: "", description: "", image: "", link: "" });
  };

  /**
   * อัปโหลดรูปภาพ - Resize และ Compress อัตโนมัติ แล้วอัปโหลดไปยัง S3
   * - ขนาดสูงสุด: 1920x1920 px
   * - ขนาดไฟล์เป้าหมาย: 200 KB
   * - เก็บเป็น URL/path แทน Base64 (เพื่อลดขนาด database)
   */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องไม่เกิน 10MB");
      return;
    }

    if (!username) {
      alert("❌ ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง");
      return;
    }

    setUploadingImage(true);

    try {
      // สร้าง Image object เพื่อ resize และ compress
      const img = new window.Image();
      const reader = new window.FileReader();

      reader.onload = (e) => {
        if (e.target?.result) {
          img.src = e.target.result as string;
        }
      };

      img.onload = async () => {
        try {
          // กำหนดขนาดสูงสุด
          const MAX_WIDTH = 1920;
          const MAX_HEIGHT = 1920;
          const TARGET_FILE_SIZE = 200 * 1024; // 200 KB

          let width = img.width;
          let height = img.height;

          // คำนวณขนาดใหม่โดยรักษาสัดส่วน
          if (width > MAX_WIDTH) {
            height = (height * MAX_WIDTH) / width;
            width = MAX_WIDTH;
          }

          if (height > MAX_HEIGHT) {
            width = (width * MAX_HEIGHT) / height;
            height = MAX_HEIGHT;
          }

          // สร้าง canvas เพื่อ resize
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            alert("ไม่สามารถประมวลผลรูปภาพได้");
            setUploadingImage(false);
            return;
          }

          // วาดรูปลง canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Compress รูปภาพ
          let quality = 0.9;
          let compressedBlob: Blob | null = null;

          const compressImage = (): Promise<Blob> => {
            return new Promise((resolve) => {
              canvas.toBlob(
                (blob) => {
                  if (!blob) {
                    resolve(new Blob());
                    return;
                  }

                  // ถ้าขนาดยังใหญ่เกินไป ลด quality ลง
                  if (blob.size > TARGET_FILE_SIZE && quality > 0.1) {
                    quality -= 0.1;
                    compressImage().then(resolve);
                  } else {
                    resolve(blob);
                  }
                },
                "image/jpeg",
                quality
              );
            });
          };

          compressedBlob = await compressImage();
          const finalSize = (compressedBlob.size / 1024).toFixed(2);
          console.log(`✅ รูปภาพ compressed: ${Math.round(width)}x${Math.round(height)}, ${finalSize} KB, quality: ${quality.toFixed(1)}`);

          // สร้าง FormData จาก compressed blob
          const formData = new FormData();
          formData.append("file", compressedBlob, file.name);
          formData.append("owner", username);

          // อัปโหลดไปยัง backend
          const response = await apiRequest(API_ENDPOINTS.UPLOAD_PORTFOLIO, {
            method: "POST",
            body: formData,
            username: username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
          });

          // ตรวจสอบ response และ parse JSON
          let data;
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              data = await response.json();
            } catch (jsonError) {
              const text = await response.text();
              throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
            }
          } else {
            const text = await response.text();
            throw new Error(text || `HTTP ${response.status}: ${response.statusText}`);
          }

          if (!response.ok) {
            // แสดงข้อความ error จาก backend
            const errorMessage = data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`;
            throw new Error(errorMessage);
          }

          // Backend ส่งกลับมาเป็น proxy URL
          const imageUrl = data.imageUrl || data.url;
          if (imageUrl) {
            // เก็บ URL แทน Base64
            setFormData({ ...formData, image: imageUrl });
            alert("✅ อัปโหลดรูปภาพสำเร็จ!");
          } else {
            throw new Error("ไม่ได้รับ URL รูปภาพ");
          }
        } catch (error: any) {
          console.error("Error uploading image:", error);
          // แสดงข้อความ error ที่ชัดเจน
          const errorMessage = error.message || "เกิดข้อผิดพลาดในการอัปโหลด";
          alert(`❌ ${errorMessage}`);
        } finally {
          setUploadingImage(false);
        }
      };

      img.onerror = () => {
        alert("❌ ไม่สามารถอ่านไฟล์รูปภาพได้");
        setUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      alert(`❌ ${error.message || "เกิดข้อผิดพลาดในการอัปโหลด"}`);
      setUploadingImage(false);
    }
  };

  /**
   * บันทึกผลงาน (เพิ่มหรือแก้ไข)
   */
  const handleSave = async () => {
    // Validation
    if (!formData.title.trim() || !formData.description.trim()) {
      alert("กรุณากรอกชื่อและคำอธิบายผลงาน");
      return;
    }

    setSaving(true);
    try {
      let response;
      
      if (editingPortfolio) {
        // แก้ไข: ส่ง array ของ portfolios ทั้งหมดที่อัปเดตแล้ว
        const updatedPortfolios = portfolios.map(p => 
          p.id === editingPortfolio.id 
            ? { 
                title: formData.title, 
                description: formData.description, 
                image: formData.image, 
                link: formData.link 
              }
            : { 
                title: p.title, 
                description: p.description, 
                image: p.image, 
                link: p.link 
              }
        );
        
        response = await apiRequest(API_ENDPOINTS.PORTFOLIO, {
          username: urlUsername || username || undefined,
          method: "PUT",
          body: JSON.stringify({ portfolios: updatedPortfolios }),
        });
      } else {
        // เพิ่มใหม่: ส่ง single object
        response = await apiRequest(API_ENDPOINTS.PORTFOLIO, {
          username: urlUsername || username || undefined,
          method: "POST",
          body: JSON.stringify(formData),
        });
      }

      if (response.ok) {
        // บันทึกประวัติ
        try {
          await apiRequest(API_ENDPOINTS.EDIT_HISTORY, {
            username: urlUsername || username || undefined,
            method: "POST",
            body: JSON.stringify({
              page: "Portfolio",
              action: editingPortfolio ? "update" : "create",
              itemId: editingPortfolio?.id,
              newValue: formData.title,
            }),
          });
        } catch (historyError) {
          console.warn("Failed to log edit history:", historyError);
          // ไม่ต้อง throw error เพราะ save หลักสำเร็จแล้ว
        }

        await loadPortfolios();
        handleCloseModal();
        alert(editingPortfolio ? "✅ แก้ไขผลงานสำเร็จ!" : "✅ เพิ่มผลงานสำเร็จ!");
      } else {
        let errorMessage = "Unknown error";
        try {
          const errorData = await response.json();
          console.error("Error response:", errorData);
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (parseError) {
          console.error("Failed to parse error response");
          errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        }
        alert(`❌ เกิดข้อผิดพลาดในการบันทึก: ${errorMessage}`);
      }
    } catch (error) {
      console.error("Error saving portfolio:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  /**
   * ลบผลงาน
   */
  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`คุณต้องการลบผลงาน "${title}" หรือไม่?`)) return;

    try {
      const response = await apiRequest(`${API_ENDPOINTS.PORTFOLIO}?id=${id}`, {
        username: urlUsername || username || undefined,
        method: "DELETE",
      });

      if (response.ok) {
        // Edit history ถูกบันทึกใน API แล้ว
        await loadPortfolios();
        alert("✅ ลบผลงานสำเร็จ!");
      } else {
        const error = await response.json();
        alert(`❌ ${error.error || "เกิดข้อผิดพลาดในการลบ"}`);
      }
    } catch (error) {
      console.error("Error deleting portfolio:", error);
      alert("❌ เกิดข้อผิดพลาดในการลบ");
    }
  };

  if (!authenticated) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-orange-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href={username ? `/${username}/admin` : "/admin/login"}
                className="text-orange-600 hover:text-orange-700 text-sm font-medium inline-flex items-center gap-2 mb-2"
              >
                <span>←</span>
                <span>กลับไปหน้า Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">💼</span>
                จัดการผลงาน
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                เพิ่ม แก้ไข และลบผลงานของคุณ
              </p>
            </div>

            <div className="flex gap-3">
              <Link
                href={username ? `/${username}` : "/"}
                target="_blank"
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                🌐 ดูหน้าเว็บ
              </Link>
              <button
                onClick={handleOpenAddModal}
                className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                ➕ เพิ่มผลงาน
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Portfolio Grid */}
        {portfolios.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border-2 border-orange-100">
            <span className="text-6xl mb-4 block">📦</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">ยังไม่มีผลงาน</h3>
            <p className="text-gray-600 mb-6">เริ่มต้นเพิ่มผลงานของคุณเลย!</p>
            <button
              onClick={handleOpenAddModal}
              className="bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg transition-all"
            >
              ➕ เพิ่มผลงานแรก
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {portfolios.map((portfolio, index) => (
              <div
                key={portfolio.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-orange-100 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Image */}
                {portfolio.image ? (
                  <div className="relative h-48 bg-gradient-to-br from-orange-100 to-pink-100">
                    <Image
                      src={portfolio.image}
                      alt={portfolio.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-orange-100 to-pink-100 flex items-center justify-center">
                    <span className="text-6xl">🖼️</span>
                  </div>
                )}

                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
                    {portfolio.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {portfolio.description}
                  </p>

                  {portfolio.link && (
                    <a
                      href={portfolio.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-orange-600 hover:text-orange-700 text-sm font-semibold inline-flex items-center gap-1 mb-4"
                    >
                      <span>ดูเพิ่มเติม</span>
                      <span>→</span>
                    </a>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={() => handleOpenEditModal(portfolio)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg font-bold text-sm transition-all"
                    >
                      ✏️ แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(portfolio.id, portfolio.title)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-bold text-sm transition-all"
                    >
                      🗑️ ลบ
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">{editingPortfolio ? "✏️" : "➕"}</span>
              {editingPortfolio ? "แก้ไขผลงาน" : "เพิ่มผลงานใหม่"}
            </h2>

            <div className="space-y-4">
              {/* ชื่อผลงาน */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ชื่อผลงาน *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="เช่น เว็บไซต์ E-commerce"
                />
              </div>

              {/* คำอธิบาย */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  คำอธิบายผลงาน *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={5}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="อธิบายรายละเอียดผลงาน..."
                />
              </div>

              {/* ลิงก์ */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ลิงก์ผลงาน (ถ้ามี)
                </label>
                <input
                  type="url"
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  placeholder="https://example.com"
                />
              </div>

              {/* รูปภาพ */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  รูปภาพผลงาน
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="w-full bg-gradient-to-r from-orange-600 to-pink-600 hover:from-orange-700 hover:to-pink-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg disabled:opacity-50 mb-3"
                >
                  {uploadingImage ? "กำลังอัปโหลด..." : "🖼️ อัปโหลดรูปภาพ"}
                </button>

                {formData.image && (
                  <>
                    <button
                      onClick={() => setFormData({ ...formData, image: "" })}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl mb-3"
                    >
                      🗑️ ลบรูปภาพ
                    </button>
                    <div className="bg-gray-50 p-4 rounded-xl border-2 border-gray-200">
                      <p className="text-xs text-gray-600 mb-2 font-semibold">ตัวอย่าง:</p>
                      <div className="relative h-48 w-full">
                        <Image
                          src={formData.image}
                          alt="Preview"
                          fill
                          className="object-cover rounded-lg"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
              <button
                onClick={handleCloseModal}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl"
              >
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

