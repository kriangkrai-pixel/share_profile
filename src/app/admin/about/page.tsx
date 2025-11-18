"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { useProfile } from "../../context/ProfileContext";

export default function AboutPage() {
  const router = useRouter();
  useAdminSession();
  const { profile, updateProfile } = useProfile();
  const [authenticated, setAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: profile.name,
    description: profile.description,
    bio: profile.bio,
    achievement: profile.achievement,
    skills: profile.skills.join("\n"),
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthenticated(true);
    }
  }, [router]);

  useEffect(() => {
    setFormData({
      name: profile.name,
      description: profile.description,
      bio: profile.bio,
      achievement: profile.achievement,
      skills: profile.skills.join("\n"),
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
    });
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const skillsArray = formData.skills
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s);

      await updateProfile({
        name: formData.name,
        description: formData.description,
        bio: formData.bio,
        achievement: formData.achievement,
        skills: skillsArray,
        email: formData.email,
        phone: formData.phone,
        location: formData.location,
      });

      // Log history
      await fetch("/api/admin/edit-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "About",
          action: "update",
          newValue: "Updated profile information",
        }),
      });

      window.dispatchEvent(new Event("profileUpdated"));
      alert("✅ บันทึกข้อมูลสำเร็จ!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-purple-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-purple-600 hover:text-purple-700 text-sm font-medium inline-flex items-center gap-2 mb-2"
              >
                <span>←</span>
                <span>กลับไปหน้า Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">👤</span>
                เกี่ยวกับเรา
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                แก้ไขข้อมูลส่วนตัว ประวัติ และทักษะ
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
                onClick={handleSave}
                disabled={saving}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* ข้อมูลส่วนตัว */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-purple-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              ข้อมูลส่วนตัว
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ชื่อ-นามสกุล
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="ระบุชื่อ-นามสกุล"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  คำอธิบายสั้นๆ (Hero Section)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
                  placeholder="คำอธิบายสั้นๆ เกี่ยวกับตัวคุณ"
                />
              </div>
            </div>
          </div>

          {/* ประวัติส่วนตัว */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-pink-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">📖</span>
              ประวัติส่วนตัว
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Bio (ประวัติ)
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={6}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="เขียนประวัติส่วนตัวของคุณ"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ความสำเร็จ (Achievement)
                </label>
                <textarea
                  value={formData.achievement}
                  onChange={(e) =>
                    setFormData({ ...formData, achievement: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-200"
                  placeholder="ความสำเร็จที่ภาคภูมิใจ"
                />
              </div>
            </div>
          </div>

          {/* ทักษะ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              ทักษะ (Skills)
            </h2>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                รายการทักษะ (แต่ละบรรทัดคือ 1 ทักษะ)
              </label>
              <textarea
                value={formData.skills}
                onChange={(e) =>
                  setFormData({ ...formData, skills: e.target.value })
                }
                rows={10}
                className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-sm"
                placeholder="JavaScript&#10;TypeScript&#10;React&#10;Next.js&#10;..."
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 เขียนทักษะแต่ละอันขึ้นบรรทัดใหม่
              </p>
            </div>
          </div>

          {/* ข้อมูลติดต่อ */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">📧</span>
              ข้อมูลติดต่อ
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  อีเมล
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="example@mail.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  เบอร์โทร
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="0XX-XXX-XXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ที่อยู่
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200"
                  placeholder="จังหวัด, ประเทศ"
                />
              </div>
            </div>
          </div>

          {/* Save Button (Sticky) */}
          <div className="sticky bottom-8 flex justify-center">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold py-4 px-12 rounded-full shadow-2xl transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none"
            >
              {saving ? "กำลังบันทึก..." : "💾 บันทึกทั้งหมด"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

