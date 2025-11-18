"use client";

/**
 * Live Editor - แก้ไขหน้าเว็บแบบ Real-time
 * 
 * คืออะไร:
 * - หน้าสำหรับแก้ไขเนื้อหาและจัดเรียงหน้าเว็บ
 * 
 * เอาไว้ทำไร:
 * - แก้ไขข้อความทั้งหมด
 * - เปลี่ยนรูปภาพ
 * - จัดเรียง Section
 * - ดูตัวอย่างแบบ Real-time
 * 
 * ฟีเจอร์:
 * - Live Preview ข้างๆ
 * - แก้ไข Hero, About, Skills, Education, Portfolio, Contact
 * - อัปโหลดรูปภาพ
 * - เรียงลำดับ Section
 * - บันทึกครั้งเดียว
 */

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAdminSession } from "../../hooks/useAdminSession";
import { useProfile } from "../../context/ProfileContext";

interface SectionOrder {
  id: string;
  name: string;
  enabled: boolean;
}

export default function LiveEditorPage() {
  const router = useRouter();
  useAdminSession();
  const { profile, updateProfile, refreshProfile } = useProfile();
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Current tab
  const [activeTab, setActiveTab] = useState<"hero" | "about" | "skills" | "education" | "portfolio" | "contact">("hero");
  
  // Preview mode
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  
  // Form data
  const [formData, setFormData] = useState({
    // Hero
    name: "",
    description: "",
    heroImage: "",
    
    // About
    bio: "",
    achievement: "",
    
    // Skills
    skills: [] as string[],
    
    // Education (read-only, edit in another page)
    
    // Contact
    email: "",
    phone: "",
    location: "",
    contactImage: "",
  });
  
  // Section order
  const [sections, setSections] = useState<SectionOrder[]>([
    { id: "hero", name: "🏠 Hero", enabled: true },
    { id: "about", name: "👤 เกี่ยวกับ", enabled: true },
    { id: "skills", name: "⚡ ทักษะ", enabled: true },
    { id: "education", name: "🎓 การศึกษา", enabled: true },
    { id: "portfolio", name: "💼 ผลงาน", enabled: true },
    { id: "contact", name: "📧 ติดต่อ", enabled: true },
  ]);
  
  // Image uploading states
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingContact, setUploadingContact] = useState(false);
  const heroFileRef = useRef<HTMLInputElement>(null);
  const contactFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthenticated(true);
      loadData();
    }
  }, [router]);

  const loadData = async () => {
    await refreshProfile();
    setFormData({
      name: profile.name || "",
      description: profile.description || "",
      heroImage: profile.heroImage || "",
      bio: profile.bio || "",
      achievement: profile.achievement || "",
      skills: profile.skills || [],
      email: profile.email || "",
      phone: profile.phone || "",
      location: profile.location || "",
      contactImage: profile.contactImage || "",
    });
    setLoading(false);
  };

  // Image upload
  const handleImageUpload = async (file: File, type: "hero" | "contact") => {
    if (type === "hero") setUploadingHero(true);
    else setUploadingContact(true);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (type === "hero") {
        setFormData({ ...formData, heroImage: base64 });
      } else {
        setFormData({ ...formData, contactImage: base64 });
      }
      if (type === "hero") setUploadingHero(false);
      else setUploadingContact(false);
    };
    reader.readAsDataURL(file);
  };

  // Add/Remove skill
  const handleAddSkill = () => {
    const skill = prompt("เพิ่มทักษะ:");
    if (skill && skill.trim()) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skill.trim()],
      });
    }
  };

  const handleRemoveSkill = (index: number) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter((_, i) => i !== index),
    });
  };

  // Save all changes
  const handleSaveAll = async () => {
    if (!confirm("คุณต้องการบันทึกการเปลี่ยนแปลงทั้งหมดหรือไม่?")) return;

    setSaving(true);
    try {
      await updateProfile({
        name: formData.name,
        description: formData.description,
        heroImage: formData.heroImage,
        bio: formData.bio,
        achievement: formData.achievement,
        skills: formData.skills,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
        contactImage: formData.contactImage,
      });

      alert("✅ บันทึกสำเร็จ! รีเฟรชหน้าเว็บเพื่อดูการเปลี่ยนแปลง");
      await refreshProfile();
    } catch (error) {
      console.error("Error saving:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-blue-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-2 mb-2"
              >
                <span>←</span>
                <span>กลับไปหน้า Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">✏️</span>
                Live Editor
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                แก้ไขเนื้อหาและดูตัวอย่างแบบ Real-time
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/"
                target="_blank"
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                🌐 ดูหน้าเว็บ
              </Link>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>กำลังบันทึก...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>บันทึกทั้งหมด</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 mb-6 flex gap-2 overflow-x-auto">
          {[
            { id: "hero", name: "🏠 Hero", icon: "🏠" },
            { id: "about", name: "👤 เกี่ยวกับ", icon: "👤" },
            { id: "skills", name: "⚡ ทักษะ", icon: "⚡" },
            { id: "education", name: "🎓 การศึกษา", icon: "🎓" },
            { id: "portfolio", name: "💼 ผลงาน", icon: "💼" },
            { id: "contact", name: "📧 ติดต่อ", icon: "📧" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } font-bold py-3 px-6 rounded-xl transition-all whitespace-nowrap`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Editor Panel */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-blue-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span>✏️</span>
              แก้ไข{" "}
              {activeTab === "hero" && "Hero"}
              {activeTab === "about" && "เกี่ยวกับ"}
              {activeTab === "skills" && "ทักษะ"}
              {activeTab === "education" && "การศึกษา"}
              {activeTab === "portfolio" && "ผลงาน"}
              {activeTab === "contact" && "ติดต่อ"}
            </h2>

            {/* Hero Editor */}
            {activeTab === "hero" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ชื่อ *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="ชื่อของคุณ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    คำอธิบาย *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="คำอธิบายสั้นๆ เกี่ยวกับคุณ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    รูปภาพ Hero
                  </label>
                  {formData.heroImage && (
                    <div className="mb-4">
                      <Image
                        src={formData.heroImage}
                        alt="Hero"
                        width={200}
                        height={200}
                        className="rounded-lg border-4 border-blue-500 shadow-lg object-cover"
                      />
                    </div>
                  )}
                  <input
                    ref={heroFileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "hero");
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => heroFileRef.current?.click()}
                    disabled={uploadingHero}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-50"
                  >
                    {uploadingHero ? "กำลังอัปโหลด..." : "📷 เลือกรูป"}
                  </button>
                </div>
              </div>
            )}

            {/* About Editor */}
            {activeTab === "about" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ประวัติ (Bio) *
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    rows={6}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="เขียนเกี่ยวกับตัวคุณ..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ความสำเร็จ / ผลงานเด่น
                  </label>
                  <textarea
                    value={formData.achievement}
                    onChange={(e) =>
                      setFormData({ ...formData, achievement: e.target.value })
                    }
                    rows={4}
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="ความสำเร็จที่คุณภูมิใจ..."
                  />
                </div>
              </div>
            )}

            {/* Skills Editor */}
            {activeTab === "skills" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-600">
                    จำนวนทักษะ: {formData.skills.length}
                  </p>
                  <button
                    onClick={handleAddSkill}
                    className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                  >
                    <span>➕</span>
                    <span>เพิ่มทักษะ</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.skills.map((skill, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border-2 border-gray-200"
                    >
                      <span className="flex-1 font-medium">{skill}</span>
                      <button
                        onClick={() => handleRemoveSkill(index)}
                        className="bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-lg transition-all text-sm"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Education Editor */}
            {activeTab === "education" && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">🎓</span>
                <p className="text-gray-600 mb-4">
                  แก้ไขข้อมูลการศึกษาและประสบการณ์
                </p>
                <Link
                  href="/admin/education-experience"
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-all"
                >
                  ไปที่หน้าจัดการการศึกษา →
                </Link>
              </div>
            )}

            {/* Portfolio Editor */}
            {activeTab === "portfolio" && (
              <div className="text-center py-12">
                <span className="text-6xl mb-4 block">💼</span>
                <p className="text-gray-600 mb-4">
                  จัดการผลงานของคุณ
                </p>
                <Link
                  href="/admin/portfolios"
                  className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg transition-all"
                >
                  ไปที่หน้าจัดการผลงาน →
                </Link>
              </div>
            )}

            {/* Contact Editor */}
            {activeTab === "contact" && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    อีเมล *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="example@mail.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    เบอร์โทร *
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="012-345-6789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ที่อยู่ *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="จังหวัด, ประเทศ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    รูปภาพ Contact
                  </label>
                  {formData.contactImage && (
                    <div className="mb-4">
                      <Image
                        src={formData.contactImage}
                        alt="Contact"
                        width={120}
                        height={120}
                        className="rounded-full border-4 border-blue-500 shadow-lg object-cover"
                      />
                    </div>
                  )}
                  <input
                    ref={contactFileRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(file, "contact");
                    }}
                    className="hidden"
                  />
                  <button
                    onClick={() => contactFileRef.current?.click()}
                    disabled={uploadingContact}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-6 rounded-lg transition-all disabled:opacity-50"
                  >
                    {uploadingContact ? "กำลังอัปโหลด..." : "📷 เลือกรูป"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-100 overflow-hidden sticky top-24">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>👁️</span>
                ตัวอย่าง
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`${
                    previewMode === "desktop"
                      ? "bg-white text-purple-500"
                      : "bg-purple-400 text-white"
                  } font-bold py-1 px-3 rounded-lg transition-all text-sm`}
                >
                  🖥️ Desktop
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`${
                    previewMode === "mobile"
                      ? "bg-white text-purple-500"
                      : "bg-purple-400 text-white"
                  } font-bold py-1 px-3 rounded-lg transition-all text-sm`}
                >
                  📱 Mobile
                </button>
              </div>
            </div>

            <div
              className={`${
                previewMode === "mobile" ? "max-w-sm mx-auto" : ""
              } bg-gray-100 p-4 overflow-y-auto`}
              style={{ maxHeight: "calc(100vh - 250px)" }}
            >
              <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                {/* Preview based on active tab */}
                {activeTab === "hero" && (
                  <div className="p-8 bg-gradient-to-br from-blue-50 to-purple-50">
                    <div className="text-center">
                      {formData.heroImage && (
                        <Image
                          src={formData.heroImage}
                          alt="Hero"
                          width={150}
                          height={150}
                          className="rounded-full border-4 border-blue-500 mx-auto mb-4 object-cover"
                        />
                      )}
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        สวัสดี ผม {formData.name || "..."}
                      </h1>
                      <p className="text-gray-700">
                        {formData.description || "..."}
                      </p>
                    </div>
                  </div>
                )}

                {activeTab === "about" && (
                  <div className="p-8">
                    <h2 className="text-2xl font-bold text-blue-600 mb-4">
                      เกี่ยวกับฉัน
                    </h2>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <p className="text-gray-700">
                        {formData.bio || "ยังไม่มีข้อมูล..."}
                      </p>
                    </div>
                    {formData.achievement && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-gray-700">{formData.achievement}</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "skills" && (
                  <div className="p-8">
                    <h2 className="text-2xl font-bold text-blue-600 mb-4">
                      ทักษะ
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {formData.skills.map((skill, index) => (
                        <div
                          key={index}
                          className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-sm font-semibold"
                        >
                          ✓ {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "contact" && (
                  <div className="p-8">
                    <h2 className="text-2xl font-bold text-blue-600 mb-4">
                      ติดต่อ
                    </h2>
                    <div className="text-center mb-4">
                      {formData.contactImage && (
                        <Image
                          src={formData.contactImage}
                          alt="Contact"
                          width={100}
                          height={100}
                          className="rounded-full border-4 border-blue-500 mx-auto mb-2 object-cover"
                        />
                      )}
                      <h3 className="font-bold text-lg">{formData.name}</h3>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p>
                        <span className="font-semibold">📧 อีเมล:</span>{" "}
                        {formData.email || "..."}
                      </p>
                      <p>
                        <span className="font-semibold">📱 โทร:</span>{" "}
                        {formData.phone || "..."}
                      </p>
                      <p>
                        <span className="font-semibold">📍 ที่อยู่:</span>{" "}
                        {formData.location || "..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

