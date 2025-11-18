"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { useProfile } from "../../context/ProfileContext";

interface Education {
  id: number;
  type: string;
  field: string;
  institution: string;
  year?: string;
  gpa?: string;
}

interface Experience {
  id: number;
  title: string;
  company: string;
  location: string;
  period: string;
  description?: string;
}

export default function EducationExperiencePage() {
  const router = useRouter();
  useAdminSession();
  const { profile, updateProfile, updateExperience } = useProfile();
  const [authenticated, setAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Education form
  const [educationData, setEducationData] = useState({
    university: {
      field: profile.education.university.field,
      university: profile.education.university.university,
      year: profile.education.university.year,
    },
    highschool: {
      field: profile.education.highschool.field,
      school: profile.education.highschool.school,
      gpa: profile.education.highschool.gpa,
    },
  });

  // Experience state
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [editingExp, setEditingExp] = useState<Experience | null>(null);
  const [showAddExp, setShowAddExp] = useState(false);
  const [newExp, setNewExp] = useState({
    title: "",
    company: "",
    location: "",
    period: "",
    description: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("adminToken");
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthenticated(true);
      loadExperiences();
    }
  }, [router]);

  useEffect(() => {
    setEducationData({
      university: {
        field: profile.education.university.field,
        university: profile.education.university.university,
        year: profile.education.university.year,
      },
      highschool: {
        field: profile.education.highschool.field,
        school: profile.education.highschool.school,
        gpa: profile.education.highschool.gpa,
      },
    });
    setExperiences(profile.experience || []);
  }, [profile]);

  const loadExperiences = async () => {
    try {
      const response = await fetch("/api/profile/experience");
      const data = await response.json();
      setExperiences(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading experiences:", error);
    }
  };

  const handleSaveEducation = async () => {
    setSaving(true);
    try {
      await updateProfile({
        education: educationData,
      });

      await fetch("/api/admin/edit-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page: "Education",
          action: "update",
          newValue: "Updated education information",
        }),
      });

      window.dispatchEvent(new Event("profileUpdated"));
      alert("✅ บันทึกข้อมูลการศึกษาสำเร็จ!");
    } catch (error) {
      console.error("Error saving:", error);
      alert("❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const handleAddExperience = async () => {
    if (!newExp.title || !newExp.company) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const response = await fetch("/api/profile/experience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newExp),
      });

      if (response.ok) {
        await loadExperiences();
        setNewExp({
          title: "",
          company: "",
          location: "",
          period: "",
          description: "",
        });
        setShowAddExp(false);
        alert("✅ เพิ่มประสบการณ์สำเร็จ!");
      }
    } catch (error) {
      console.error("Error adding experience:", error);
      alert("❌ เกิดข้อผิดพลาดในการเพิ่ม");
    }
  };

  const handleUpdateExperience = async () => {
    if (!editingExp) return;

    try {
      const response = await fetch("/api/profile/experience", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingExp),
      });

      if (response.ok) {
        await loadExperiences();
        setEditingExp(null);
        alert("✅ อัปเดตประสบการณ์สำเร็จ!");
      }
    } catch (error) {
      console.error("Error updating experience:", error);
      alert("❌ เกิดข้อผิดพลาดในการอัปเดต");
    }
  };

  const handleDeleteExperience = async (id: number) => {
    if (!confirm("คุณต้องการลบประสบการณ์นี้หรือไม่?")) return;

    try {
      const response = await fetch(`/api/profile/experience?id=${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      const result = await response.json();
      
      if (result.success) {
        await loadExperiences();
        alert("✅ ลบประสบการณ์สำเร็จ!");
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error: any) {
      console.error("Error deleting experience:", error);
      alert(`❌ เกิดข้อผิดพลาดในการลบ: ${error.message || error}`);
    }
  };

  if (!authenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-lg border-b-2 border-green-200 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                href="/admin"
                className="text-green-600 hover:text-green-700 text-sm font-medium inline-flex items-center gap-2 mb-2"
              >
                <span>←</span>
                <span>กลับไปหน้า Dashboard</span>
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-3">
                <span className="text-4xl">🎓</span>
                การศึกษาและประสบการณ์
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                จัดการข้อมูลการศึกษาและประสบการณ์การทำงาน
              </p>
            </div>

            <Link
              href="/"
              target="_blank"
              className="bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
            >
              🌐 ดูหน้าเว็บ
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* การศึกษา */}
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-blue-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">📚</span>
                ประวัติการศึกษา
              </h2>
              <button
                onClick={handleSaveEducation}
                disabled={saving}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? "กำลังบันทึก..." : "💾 บันทึก"}
              </button>
            </div>

            {/* มหาวิทยาลัย */}
            <div className="bg-blue-50 rounded-xl p-6 mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🎓 มหาวิทยาลัย</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สาขาวิชา
                  </label>
                  <input
                    type="text"
                    value={educationData.university.field}
                    onChange={(e) =>
                      setEducationData({
                        ...educationData,
                        university: { ...educationData.university, field: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    มหาวิทยาลัย
                  </label>
                  <input
                    type="text"
                    value={educationData.university.university}
                    onChange={(e) =>
                      setEducationData({
                        ...educationData,
                        university: { ...educationData.university, university: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ปีการศึกษา
                  </label>
                  <input
                    type="text"
                    value={educationData.university.year}
                    onChange={(e) =>
                      setEducationData({
                        ...educationData,
                        university: { ...educationData.university, year: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* มัธยม */}
            <div className="bg-purple-50 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">🏫 มัธยมศึกษา</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    แผนการเรียน
                  </label>
                  <input
                    type="text"
                    value={educationData.highschool.field}
                    onChange={(e) =>
                      setEducationData({
                        ...educationData,
                        highschool: { ...educationData.highschool, field: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    โรงเรียน
                  </label>
                  <input
                    type="text"
                    value={educationData.highschool.school}
                    onChange={(e) =>
                      setEducationData({
                        ...educationData,
                        highschool: { ...educationData.highschool, school: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    เกรดเฉลี่ย (GPA)
                  </label>
                  <input
                    type="text"
                    value={educationData.highschool.gpa}
                    onChange={(e) =>
                      setEducationData({
                        ...educationData,
                        highschool: { ...educationData.highschool, gpa: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ประสบการณ์การทำงาน */}
        <div>
          <div className="bg-white rounded-2xl shadow-lg p-6 border-2 border-green-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <span className="text-3xl">💼</span>
                ประสบการณ์การทำงาน
              </h2>
              <button
                onClick={() => setShowAddExp(true)}
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                ➕ เพิ่มประสบการณ์
              </button>
            </div>

            {/* Experience List */}
            <div className="space-y-4">
              {experiences.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <span className="text-5xl mb-3 block">📋</span>
                  <p className="text-gray-500 font-medium">ยังไม่มีประสบการณ์</p>
                  <button
                    onClick={() => setShowAddExp(true)}
                    className="mt-4 text-green-600 hover:text-green-700 font-semibold"
                  >
                    + เพิ่มประสบการณ์แรก
                  </button>
                </div>
              ) : (
                experiences.map((exp, index) => (
                  <div
                    key={exp.id}
                    className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{exp.title}</h3>
                        <p className="text-green-600 font-semibold">{exp.company}</p>
                        <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                          <span>📍</span>
                          {exp.location}
                        </p>
                        <p className="text-gray-500 text-sm mt-1">{exp.period}</p>
                        {exp.description && (
                          <p className="text-gray-700 text-sm mt-3 pt-3 border-t border-gray-200">
                            {exp.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingExp(exp)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          ✏️ แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          🗑️ ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Experience Modal */}
      {showAddExp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">➕ เพิ่มประสบการณ์ใหม่</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ตำแหน่งงาน *
                </label>
                <input
                  type="text"
                  value={newExp.title}
                  onChange={(e) => setNewExp({ ...newExp, title: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                  placeholder="เช่น Full Stack Developer"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  บริษัท/องค์กร *
                </label>
                <input
                  type="text"
                  value={newExp.company}
                  onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                  placeholder="เช่น ABC Company"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สถานที่
                  </label>
                  <input
                    type="text"
                    value={newExp.location}
                    onChange={(e) => setNewExp({ ...newExp, location: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                    placeholder="เช่น กรุงเทพฯ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ช่วงเวลา
                  </label>
                  <input
                    type="text"
                    value={newExp.period}
                    onChange={(e) => setNewExp({ ...newExp, period: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                    placeholder="เช่น 2020 - 2023"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  คำอธิบาย (ถ้ามี)
                </label>
                <textarea
                  value={newExp.description}
                  onChange={(e) => setNewExp({ ...newExp, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-green-500 focus:outline-none"
                  placeholder="รายละเอียดงานที่ทำ..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddExperience}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg"
              >
                ✅ เพิ่มประสบการณ์
              </button>
              <button
                onClick={() => {
                  setShowAddExp(false);
                  setNewExp({ title: "", company: "", location: "", period: "", description: "" });
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl"
              >
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Experience Modal */}
      {editingExp && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">✏️ แก้ไขประสบการณ์</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ตำแหน่งงาน *
                </label>
                <input
                  type="text"
                  value={editingExp.title}
                  onChange={(e) => setEditingExp({ ...editingExp, title: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  บริษัท/องค์กร *
                </label>
                <input
                  type="text"
                  value={editingExp.company}
                  onChange={(e) => setEditingExp({ ...editingExp, company: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สถานที่
                  </label>
                  <input
                    type="text"
                    value={editingExp.location}
                    onChange={(e) => setEditingExp({ ...editingExp, location: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ช่วงเวลา
                  </label>
                  <input
                    type="text"
                    value={editingExp.period}
                    onChange={(e) => setEditingExp({ ...editingExp, period: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  คำอธิบาย (ถ้ามี)
                </label>
                <textarea
                  value={editingExp.description || ""}
                  onChange={(e) => setEditingExp({ ...editingExp, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateExperience}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg"
              >
                💾 บันทึกการเปลี่ยนแปลง
              </button>
              <button
                onClick={() => setEditingExp(null)}
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

