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
 * - อัปโหลดรูปภาพแบบ Base64
 * - ลิงก์ไปหน้ารายละเอียด
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAdminSession } from "../../hooks/useAdminSession";

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
  useAdminSession();
  const [authenticated, setAuthenticated] = useState(false);
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthenticated(true);
      loadPortfolios();
    }
  }, [router]);

  /**
   * โหลดรายการผลงานทั้งหมดจาก API
   */
  const loadPortfolios = async () => {
    try {
      const response = await fetch("/api/profile");
      
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
   * อัปโหลดรูปภาพ - แปลงเป็น Base64
   */
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("ขนาดไฟล์ต้องไม่เกิน 5MB");
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, image: reader.result as string });
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
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
      const url = editingPortfolio
        ? "/api/profile/portfolio"
        : "/api/profile/portfolio";
      
      const method = editingPortfolio ? "PUT" : "POST";
      
      const body = editingPortfolio
        ? { ...formData, id: editingPortfolio.id }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        // บันทึกประวัติ
        await fetch("/api/admin/edit-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: "Portfolio",
            action: editingPortfolio ? "update" : "create",
            itemId: editingPortfolio?.id,
            newValue: formData.title,
          }),
        });

        await loadPortfolios();
        handleCloseModal();
        alert(editingPortfolio ? "✅ แก้ไขผลงานสำเร็จ!" : "✅ เพิ่มผลงานสำเร็จ!");
      } else {
        alert("❌ เกิดข้อผิดพลาดในการบันทึก");
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
      const response = await fetch(`/api/profile/portfolio?id=${id}`, {
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
                href="/admin"
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
                href="/"
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

