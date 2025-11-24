"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const validateUsername = (value: string): string | undefined => {
    if (!value) {
      return "กรุณากรอกชื่อผู้ใช้";
    }
    if (!/^[A-Z][a-zA-Z0-9_]{2,}$/.test(value)) {
      return "ชื่อผู้ใช้ต้องขึ้นต้นด้วยตัวอักษรพิมพ์ใหญ่และตามด้วยตัวอักษร ตัวเลข หรือ underscore อย่างน้อย 2 ตัว";
    }
    return undefined;
  };

  const validateEmail = (value: string): string | undefined => {
    if (!value) {
      return "กรุณากรอกอีเมล";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return "รูปแบบอีเมลไม่ถูกต้อง";
    }
    return undefined;
  };

  const validatePassword = (value: string): string | undefined => {
    if (!value) {
      return "กรุณากรอกรหัสผ่าน";
    }
    if (value.length < 6) {
      return "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร";
    }
    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/.test(value)) {
      return "รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ ตัวอักษรพิมพ์เล็ก และตัวเลขอย่างน้อย 1 ตัว";
    }
    return undefined;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    if (errors.username) {
      setErrors({ ...errors, username: validateUsername(value) });
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);
    if (errors.email) {
      setErrors({ ...errors, email: validateEmail(value) });
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPassword(value);
    if (errors.password) {
      setErrors({ ...errors, password: validatePassword(value) });
    }
    if (errors.confirmPassword && confirmPassword) {
      setErrors({
        ...errors,
        confirmPassword: value !== confirmPassword ? "รหัสผ่านไม่ตรงกัน" : undefined,
      });
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (value && password) {
      setErrors({
        ...errors,
        confirmPassword: value !== password ? "รหัสผ่านไม่ตรงกัน" : undefined,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validate all fields
    const usernameError = validateUsername(username);
    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const confirmPasswordError =
      !confirmPassword
        ? "กรุณายืนยันรหัสผ่าน"
        : confirmPassword !== password
        ? "รหัสผ่านไม่ตรงกัน"
        : undefined;

    if (usernameError || emailError || passwordError || confirmPasswordError) {
      setErrors({
        username: usernameError,
        email: emailError,
        password: passwordError,
        confirmPassword: confirmPasswordError,
      });
      return;
    }

    setLoading(true);

    try {
      const response = await apiRequest(API_ENDPOINTS.REGISTER, {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
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
          setError(errorData.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
        }
        return;
      }

      const data = await response.json();

      // Store JWT token
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("adminToken", data.token); // Keep for backward compatibility
      router.push("/admin");
    } catch (err: any) {
      console.error("Error during registration:", err);
      if (isConnectionError(err) || err?.isConnectionError) {
        const apiUrl = err?.apiBaseUrl || API_ENDPOINTS.REGISTER;
        setError(
          `ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้\n\n` +
          `URL: ${apiUrl}\n\n` +
          `กรุณาตรวจสอบว่า:\n` +
          `1. Backend server กำลังทำงานอยู่ (พอร์ต 3001)\n` +
          `2. การเชื่อมต่ออินเทอร์เน็ตทำงานปกติ\n\n` +
          `วิธีแก้ไข: รันคำสั่ง "cd backend && npm run start:dev" ใน terminal`
        );
      } else {
        setError("เกิดข้อผิดพลาดในการสมัครสมาชิก");
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
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg mb-4 transform hover:rotate-12 transition-transform duration-300">
              <span className="text-4xl">✨</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
              สมัครสมาชิก
            </h1>
            <p className="text-gray-600">สร้างบัญชีใหม่เพื่อเริ่มใช้งาน</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3 animate-fade-in">
              <span className="text-xl flex-shrink-0">⚠️</span>
              <span className="whitespace-pre-line">{error}</span>
            </div>
          )}

          {/* Register Form */}
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
                  onChange={handleUsernameChange}
                  onBlur={() => {
                    setErrors({ ...errors, username: validateUsername(username) });
                  }}
                  className={`w-full rounded-xl border-2 bg-white pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.username
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-green-500 focus:ring-green-200"
                  }`}
                  placeholder="Username (ต้องขึ้นต้นด้วยตัวพิมพ์ใหญ่)"
                />
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{errors.username}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                ตัวอย่าง: Admin, User123, MyName
              </p>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-bold text-gray-700 mb-2">
                อีเมล <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl">📧</span>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  onBlur={() => {
                    setErrors({ ...errors, email: validateEmail(email) });
                  }}
                  className={`w-full rounded-xl border-2 bg-white pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.email
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-green-500 focus:ring-green-200"
                  }`}
                  placeholder="example@email.com"
                />
              </div>
              {errors.email && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{errors.email}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                ตัวอย่าง: user@example.com
              </p>
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
                  onChange={handlePasswordChange}
                  onBlur={() => {
                    setErrors({ ...errors, password: validatePassword(password) });
                  }}
                  className={`w-full rounded-xl border-2 bg-white pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.password
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-green-500 focus:ring-green-200"
                  }`}
                  placeholder="รหัสผ่าน (ต้องมีตัวพิมพ์ใหญ่, ตัวพิมพ์เล็ก, และตัวเลข)"
                />
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{errors.password}</span>
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                ต้องมีตัวอักษรพิมพ์ใหญ่ ตัวอักษรพิมพ์เล็ก และตัวเลขอย่างน้อย 1 ตัว
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-bold text-gray-700 mb-2">
                ยืนยันรหัสผ่าน <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl">🔒</span>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  onBlur={() => {
                    if (confirmPassword) {
                      setErrors({
                        ...errors,
                        confirmPassword:
                          confirmPassword !== password ? "รหัสผ่านไม่ตรงกัน" : undefined,
                      });
                    }
                  }}
                  className={`w-full rounded-xl border-2 bg-white pl-12 pr-4 py-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                    errors.confirmPassword
                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                      : "border-gray-300 focus:border-green-500 focus:ring-green-200"
                  }`}
                  placeholder="ยืนยันรหัสผ่าน"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <span>⚠️</span>
                  <span>{errors.confirmPassword}</span>
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 disabled:transform-none disabled:hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-300 flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>กำลังสมัครสมาชิก...</span>
                </>
              ) : (
                <>
                  <span>สมัครสมาชิก</span>
                  <span className="text-xl group-hover:translate-x-1 transition-transform">→</span>
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 pt-6 border-t-2 border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              มีบัญชีอยู่แล้ว?{" "}
              <Link
                href="/admin/login"
                className="text-green-600 hover:text-green-700 font-semibold transition-colors"
              >
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>

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
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-600 hover:text-green-600 transition-colors font-medium"
          >
            <span>←</span>
            <span>กลับไปหน้าแรก</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

