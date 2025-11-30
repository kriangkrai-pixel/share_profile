"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAdminSession } from "../../hooks/useAdminSession";
import { useProfile } from "../../context/ProfileContext";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "../../../lib/api-config";
import { getUsernameFromToken } from "../../../lib/jwt-utils";

interface Education {
  id: number;
  type: string;
  field: string;
  institution: string;
  location?: string;
  year?: string;
  gpa?: string;
  status?: string;
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
  const pathname = usePathname();
  
  // ดึง username จาก URL pathname (สำหรับ /[username]/admin/education-experience)
  const urlMatch = pathname?.match(/^\/([^/]+)\/admin\/education-experience/);
  const urlUsername = urlMatch ? urlMatch[1] : null;
  
  // ส่ง username ไปให้ useAdminSession เพื่อใช้ token ที่ถูกต้อง
  useAdminSession(urlUsername || undefined);
  const { profile, updateProfile, updateExperience, refreshProfile } = useProfile();
  const [authenticated, setAuthenticated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const isSavingRef = useRef(false); // ใช้ ref เพื่อป้องกัน useEffect override ค่าขณะกำลังบันทึก
  const isInitialLoadRef = useRef(true); // ใช้ ref เพื่อตรวจสอบว่าเป็นครั้งแรกที่โหลดหรือไม่

  // Education state - เปลี่ยนเป็น array-based
  const [educations, setEducations] = useState<Education[]>([]);
  const [editingEdu, setEditingEdu] = useState<Education | null>(null);
  const [showAddEdu, setShowAddEdu] = useState(false);
  const [newEdu, setNewEdu] = useState({
    type: "university",
    field: "",
    institution: "",
    location: "",
    year: "",
    gpa: "",
    status: "studying",
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
    // ใช้ token ตาม username จาก URL หรือ token เก่า
    let token: string | null = null;
    if (urlUsername) {
      const { getTokenForUser } = require("@/lib/jwt-utils");
      token = getTokenForUser(urlUsername);
    }
    
    if (!token) {
      token = localStorage.getItem("adminToken") || localStorage.getItem("authToken");
    }
    
    if (!token) {
      router.push("/admin/login");
    } else {
      setAuthenticated(true);
      // ดึง username จาก token ที่ถูกต้อง
      const currentUsername = getUsernameFromToken(urlUsername || undefined);
      setUsername(currentUsername);
      loadEducations();
      loadExperiences();
    }
  }, [router, urlUsername]);

  useEffect(() => {
    // อัปเดตข้อมูลประสบการณ์จาก profile context
    if (profile.experience) {
      setExperiences(profile.experience || []);
    }
    isInitialLoadRef.current = false;
  }, [profile.experience]);

  const loadEducations = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.EDUCATION, {
        method: "GET",
        cache: "no-store",
        username: urlUsername || username || undefined,
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(`⚠️ Failed to load educations: ${response.status} ${response.statusText}`, errorText);
        setEducations([]);
        return;
      }
      
      const data = await response.json();
      setEducations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading educations:", error);
      if (isConnectionError(error)) {
        console.warn("⚠️ Backend may not be running.");
      }
      setEducations([]);
    }
  };

  const loadExperiences = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.EXPERIENCE, {
        username: urlUsername || username || undefined,
        method: "GET",
        cache: "no-store",
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(`⚠️ Failed to load experiences: ${response.status} ${response.statusText}`, errorText);
        setExperiences([]);
        return;
      }
      
      const data = await response.json();
      setExperiences(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error loading experiences:", error);
      if (isConnectionError(error)) {
        console.warn("⚠️ Backend may not be running.");
      }
      setExperiences([]);
    }
  };

  const handleAddEducation = async () => {
    if (!newEdu.type || !newEdu.field || !newEdu.institution) {
      alert("กรุณากรอกประเภท สาขา และสถาบันให้ครบถ้วน");
      return;
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.EDUCATION, {
        method: "POST",
        body: JSON.stringify(newEdu),
        username: urlUsername || username || undefined,
      });

      if (response.ok) {
        await loadEducations();
        setNewEdu({
          type: "university",
          field: "",
          institution: "",
          location: "",
          year: "",
          gpa: "",
          status: "studying",
        });
        setShowAddEdu(false);
        alert("✅ เพิ่มการศึกษาสำเร็จ!");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to add education");
      }
    } catch (error: any) {
      console.error("Error adding education:", error);
      alert(`❌ เกิดข้อผิดพลาดในการเพิ่ม: ${error.message || error}`);
    }
  };

  const handleUpdateEducation = async () => {
    if (!editingEdu) return;
    
    if (!editingEdu.type || !editingEdu.field || !editingEdu.institution) {
      alert("กรุณากรอกประเภท สาขา และสถาบันให้ครบถ้วน");
      return;
    }

    try {
      const response = await apiRequest(`${API_ENDPOINTS.EDUCATION}/update`, {
        method: "PUT",
        body: JSON.stringify({
          id: editingEdu.id,
          education: {
            type: editingEdu.type,
            field: editingEdu.field,
            institution: editingEdu.institution,
            location: editingEdu.location || null,
            year: editingEdu.year || null,
            gpa: editingEdu.gpa || null,
            status: editingEdu.status || "studying",
          },
        }),
        username: urlUsername || username || undefined,
      });

      if (response.ok) {
        await loadEducations();
        setEditingEdu(null);
        alert("✅ อัปเดตการศึกษาสำเร็จ!");
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || "Failed to update education");
      }
    } catch (error: any) {
      console.error("Error updating education:", error);
      alert(`❌ เกิดข้อผิดพลาดในการอัปเดต: ${error.message || error}`);
    }
  };

  const handleDeleteEducation = async (id: number) => {
    if (!confirm("คุณต้องการลบการศึกษานี้หรือไม่?")) return;

    try {
      const response = await apiRequest(`${API_ENDPOINTS.EDUCATION}?id=${id}`, {
        method: "DELETE",
        username: urlUsername || username || undefined,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete");
      }

      const result = await response.json();
      
      if (result.success) {
        await loadEducations();
        alert("✅ ลบการศึกษาสำเร็จ!");
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error: any) {
      console.error("Error deleting education:", error);
      alert(`❌ เกิดข้อผิดพลาดในการลบ: ${error.message || error}`);
    }
  };

  const handleAddExperience = async () => {
    if (!newExp.title || !newExp.company) {
      alert("กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    try {
      const response = await apiRequest(API_ENDPOINTS.EXPERIENCE, {
        username: urlUsername || username || undefined,
        method: "POST",
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
      const response = await apiRequest(API_ENDPOINTS.EXPERIENCE, {
        username: urlUsername || username || undefined,
        method: "PUT",
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
      const response = await apiRequest(`${API_ENDPOINTS.EXPERIENCE}?id=${id}`, {
        method: "DELETE",
        username: urlUsername || username || undefined,
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
                href={username ? `/${username}/admin` : "/admin/login"}
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
              href={username ? `/${username}` : "/"}
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
                onClick={() => setShowAddEdu(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all"
              >
                ➕ เพิ่มการศึกษา
              </button>
            </div>

            {/* Education List */}
            <div className="space-y-4">
              {educations.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <span className="text-5xl mb-3 block">🎓</span>
                  <p className="text-gray-500 font-medium">ยังไม่มีข้อมูลการศึกษา</p>
                  <button
                    onClick={() => setShowAddEdu(true)}
                    className="mt-4 text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    + เพิ่มการศึกษาครั้งแรก
                  </button>
                </div>
              ) : (
                educations.map((edu) => (
                  <div
                    key={edu.id}
                    className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border-2 border-blue-200 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{edu.institution}</h3>
                          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                            {edu.type === "university" ? "🎓 มหาวิทยาลัย" : 
                             edu.type === "highschool" ? "🏫 มัธยมศึกษา" : 
                             edu.type === "vocational" ? "🏛️ อาชีวศึกษา" :
                             edu.type === "master" ? "🎓 ปริญญาโท" :
                             edu.type === "doctorate" ? "🎓 ปริญญาเอก" :
                             "📚 " + edu.type}
                          </span>
                          {edu.status === "graduated" && (
                            <span className="bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                              ✅ จบการศึกษาแล้ว
                            </span>
                          )}
                          {edu.status === "studying" && (
                            <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                              📖 กำลังศึกษา
                            </span>
                          )}
                        </div>
                        <p className="text-blue-600 font-semibold">{edu.field}</p>
                        {edu.location && (
                          <p className="text-gray-600 text-sm flex items-center gap-2 mt-1">
                            <span>📍</span>
                            {edu.location}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                          {edu.year && (
                            <span>📅 {edu.year}</span>
                          )}
                          {edu.gpa && (
                            <span>📊 GPA: {edu.gpa}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => setEditingEdu(edu)}
                          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                        >
                          ✏️ แก้ไข
                        </button>
                        <button
                          onClick={() => handleDeleteEducation(edu.id)}
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

      {/* Add Education Modal */}
      {showAddEdu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">➕ เพิ่มการศึกษาใหม่</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ประเภทการศึกษา *
                </label>
                <select
                  value={newEdu.type}
                  onChange={(e) => setNewEdu({ ...newEdu, type: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                >
                  <option value="university">🎓 มหาวิทยาลัย</option>
                  <option value="master">🎓 ปริญญาโท</option>
                  <option value="doctorate">🎓 ปริญญาเอก</option>
                  <option value="highschool">🏫 มัธยมศึกษา</option>
                  <option value="vocational">🏛️ อาชีวศึกษา</option>
                  <option value="other">📚 อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  สาขาวิชา *
                </label>
                <input
                  type="text"
                  value={newEdu.field}
                  onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="เช่น สาขาวิชาคอมพิวเตอร์"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  สถาบันการศึกษา *
                </label>
                <input
                  type="text"
                  value={newEdu.institution}
                  onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  placeholder="เช่น มหาวิทยาลัยราชภัฏภูเก็ต"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สถานที่ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newEdu.location}
                    onChange={(e) => setNewEdu({ ...newEdu, location: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="เช่น กรุงเทพฯ"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สถานะการศึกษา
                  </label>
                  <select
                    value={newEdu.status}
                    onChange={(e) => setNewEdu({ ...newEdu, status: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="studying">📖 กำลังศึกษา</option>
                    <option value="graduated">✅ จบการศึกษาแล้ว</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ปีการศึกษา (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newEdu.year}
                    onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="เช่น ปี 4 หรือ 2567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    เกรดเฉลี่ย GPA (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={newEdu.gpa}
                    onChange={(e) => setNewEdu({ ...newEdu, gpa: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                    placeholder="เช่น 3.50"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleAddEducation}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg"
              >
                ✅ เพิ่มการศึกษา
              </button>
              <button
                onClick={() => {
                  setShowAddEdu(false);
                  setNewEdu({
                    type: "university",
                    field: "",
                    institution: "",
                    location: "",
                    year: "",
                    gpa: "",
                    status: "studying",
                  });
                }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl"
              >
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Education Modal */}
      {editingEdu && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">✏️ แก้ไขการศึกษา</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  ประเภทการศึกษา *
                </label>
                <select
                  value={editingEdu.type}
                  onChange={(e) => setEditingEdu({ ...editingEdu, type: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                >
                  <option value="university">🎓 มหาวิทยาลัย</option>
                  <option value="master">🎓 ปริญญาโท</option>
                  <option value="doctorate">🎓 ปริญญาเอก</option>
                  <option value="highschool">🏫 มัธยมศึกษา</option>
                  <option value="vocational">🏛️ อาชีวศึกษา</option>
                  <option value="other">📚 อื่นๆ</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  สาขาวิชา *
                </label>
                <input
                  type="text"
                  value={editingEdu.field}
                  onChange={(e) => setEditingEdu({ ...editingEdu, field: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  สถาบันการศึกษา *
                </label>
                <input
                  type="text"
                  value={editingEdu.institution}
                  onChange={(e) => setEditingEdu({ ...editingEdu, institution: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สถานที่ (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={editingEdu.location || ""}
                    onChange={(e) => setEditingEdu({ ...editingEdu, location: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    สถานะการศึกษา
                  </label>
                  <select
                    value={editingEdu.status || "studying"}
                    onChange={(e) => setEditingEdu({ ...editingEdu, status: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="studying">📖 กำลังศึกษา</option>
                    <option value="graduated">✅ จบการศึกษาแล้ว</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    ปีการศึกษา (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={editingEdu.year || ""}
                    onChange={(e) => setEditingEdu({ ...editingEdu, year: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    เกรดเฉลี่ย GPA (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    value={editingEdu.gpa || ""}
                    onChange={(e) => setEditingEdu({ ...editingEdu, gpa: e.target.value })}
                    className="w-full rounded-xl border-2 border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleUpdateEducation}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl shadow-lg"
              >
                💾 บันทึกการเปลี่ยนแปลง
              </button>
              <button
                onClick={() => setEditingEdu(null)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 px-6 rounded-xl"
              >
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

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

