"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);

  const validateUsername = (value: string): string => {
    if (!value) {
      return "กรุณากรอกชื่อผู้ใช้";
    }
    if (!/^[A-Z][a-zA-Z0-9_]{2,}$/.test(value)) {
      return "ชื่อผู้ใช้ต้องขึ้นต้นด้วยตัวอักษรพิมพ์ใหญ่และตามด้วยตัวอักษร ตัวเลข หรือ underscore อย่างน้อย 2 ตัว";
    }
    return "";
  };

  const validatePassword = (value: string): string => {
    if (!value) {
      return "กรุณากรอกรหัสผ่าน";
    }
    if (value.length < 6) {
      return "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
    }
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await apiRequest(API_ENDPOINTS.LOGIN, {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        // Handle validation errors
        if (errorData.message && Array.isArray(errorData.message)) {
          setError(errorData.message.join("\n"));
        } else {
          setError(errorData.message || errorData.error || "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }
        return;
      }

      const data = await response.json();

      // Redirect ไปที่ /[username]/admin
      const loggedInUsername = data.user?.username || username;
      
      if (loggedInUsername) {
        // บันทึก JWT token แยกตาม username เพื่อให้ login หลาย user พร้อมกันได้
        const { setTokenForUser } = await import("@/lib/jwt-utils");
        setTokenForUser(loggedInUsername, data.token);
        
        // เก็บเวลาที่ login สำหรับ user นี้
        localStorage.setItem(`adminLoginTime_${loggedInUsername}`, Date.now().toString());
        
        router.push(`/${loggedInUsername}/admin`);
      } else {
        // Fallback สำหรับกรณีที่ไม่มี username - redirect ไป login อีกครั้ง
        console.warn("⚠️ No username found in login response, redirecting to login");
        router.push("/admin/login");
      }
    } catch (err) {
      console.error("Error during login:", err);
      if (isConnectionError(err)) {
        setError("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและลองใหม่อีกครั้ง");
      } else {
        setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบ");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated background decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
      
      <div className="max-w-md w-full relative z-10">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 md:p-10 border-2 border-white/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4 transform hover:rotate-12 transition-transform duration-300">
              <span className="text-4xl">🔐</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Admin Login
            </h1>
            <p className="text-gray-600">เข้าสู่ระบบเพื่อจัดการเว็บไซต์ของคุณ</p>
            <p className="text-sm text-gray-500 mt-2">
              ยังไม่มีบัญชี?{" "}
              <Link
                href="/register"
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
              >
                สมัครสมาชิก
              </Link>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3 animate-fade-in">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-bold text-gray-700 mb-2">
                ชื่อผู้ใช้ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl">👤</span>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (usernameError) {
                      setUsernameError(validateUsername(e.target.value));
                    }
                  }}
                  onBlur={() => {
                    setUsernameError(validateUsername(username));
                  }}
                  className={`w-full rounded-xl border-2 ${
                    usernameError ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
                  } pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all`}
                  placeholder="กรอกชื่อผู้ใช้"
                />
              </div>
              {usernameError && (
                <div className="mt-2 p-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2 animate-fade-in">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <span>{usernameError}</span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2">
                รหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl">🔑</span>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) {
                      setPasswordError(validatePassword(e.target.value));
                    }
                  }}
                  onBlur={() => {
                    setPasswordError(validatePassword(password));
                  }}
                  className={`w-full rounded-xl border-2 ${
                    passwordError ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
                  } pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all`}
                  placeholder="กรอกรหัสผ่าน"
                />
              </div>
              {passwordError && (
                <div className="mt-2 p-3 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-2 animate-fade-in">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-300 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <span>เข้าสู่ระบบ</span>
                  <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600 justify-center">
              <span className="text-sm">🔒</span>
              <span>การเชื่อมต่อของคุณได้รับการปกป้องอย่างปลอดภัย</span>
            </div>
          </div>
        </div>

        {/* Back to Home Link */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors font-medium"
          >
            <span>←</span>
            <span>กลับไปหน้าแรก</span>
          </a>
        </div>
      </div>
    </div>
  );
}

