"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_ENDPOINTS, apiRequest } from "../../../lib/api-config";
import { getUsernameFromToken } from "../../../lib/jwt-utils";

type ThemeTokens = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
};

const DEFAULT_THEME: ThemeTokens = {
  primaryColor: "#3b82f6",
  secondaryColor: "#8b5cf6",
  accentColor: "#f59e0b",
  backgroundColor: "#ffffff",
  textColor: "#0f172a",
  headerBgColor: "#ffffff",
  headerTextColor: "#0f172a",
  footerBgColor: "#0f172a",
  footerTextColor: "#ffffff",
};

const COLOR_CONTROLS: Array<{
  key: keyof ThemeTokens;
  label: string;
  description: string;
}> = [
  {
    key: "primaryColor",
    label: "สีหลัก (Primary)",
    description: "ใช้กับปุ่มหลัก ไฮไลต์สำคัญ และองค์ประกอบเด่น",
  },
  {
    key: "secondaryColor",
    label: "สีรอง (Secondary)",
    description: "ใช้เป็นสีพื้นหลังรอง หรือส่วนประกอบเสริม",
  },
  {
    key: "accentColor",
    label: "สีเน้น (Accent)",
    description: "ใช้กับ Badge/CTA ที่ต้องการดึงดูดสายตา",
  },
  {
    key: "backgroundColor",
    label: "สีพื้นหลัง (Background)",
    description: "พื้นหลังหลักของหน้าโปรไฟล์",
  },
  {
    key: "textColor",
    label: "สีข้อความ (Text)",
    description: "สีตัวอักษรหลักเพื่อให้อ่านง่าย",
  },
  {
    key: "headerBgColor",
    label: "สีพื้นหลัง Header",
    description: "พื้นหลังส่วนบนของหน้าโปรไฟล์",
  },
  {
    key: "headerTextColor",
    label: "สีตัวอักษร Header",
    description: "ใช้กับเมนูและโลโก้ใน Header",
  },
  {
    key: "footerBgColor",
    label: "สีพื้นหลัง Footer",
    description: "พื้นหลังส่วนล่างของหน้าโปรไฟล์",
  },
  {
    key: "footerTextColor",
    label: "สีตัวอักษร Footer",
    description: "ใช้กับเนื้อหาและลิงก์ใน Footer",
  },
];

export default function ThemeSettingsPage() {
  const router = useRouter();
  const [tokens, setTokens] = useState<ThemeTokens>(DEFAULT_THEME);
  const [initialTokens, setInitialTokens] = useState<ThemeTokens>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const hasChanges = useMemo(
    () =>
      JSON.stringify(tokens) !== JSON.stringify(initialTokens),
    [tokens, initialTokens],
  );

  const fetchTheme = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest(API_ENDPOINTS.THEME_ME, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("โหลดธีมไม่สำเร็จ");
      }

      const data = await response.json();
      const resolved: ThemeTokens = {
        primaryColor: data.primaryColor || DEFAULT_THEME.primaryColor,
        secondaryColor: data.secondaryColor || DEFAULT_THEME.secondaryColor,
        accentColor: data.accentColor || DEFAULT_THEME.accentColor,
        backgroundColor: data.backgroundColor || DEFAULT_THEME.backgroundColor,
        textColor: data.textColor || DEFAULT_THEME.textColor,
        headerBgColor: data.headerBgColor || DEFAULT_THEME.headerBgColor,
        headerTextColor: data.headerTextColor || DEFAULT_THEME.headerTextColor,
        footerBgColor: data.footerBgColor || DEFAULT_THEME.footerBgColor,
        footerTextColor: data.footerTextColor || DEFAULT_THEME.footerTextColor,
      };
      setTokens(resolved);
      setInitialTokens(resolved);
    } catch (err: any) {
      console.error("Failed to load theme preference", err);
      setError(err?.message || "ไม่สามารถโหลดธีมได้");
      setTokens(DEFAULT_THEME);
      setInitialTokens(DEFAULT_THEME);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("authToken") || localStorage.getItem("adminToken");

    if (!token) {
      router.replace("/register");
      return;
    }

    setUsername(getUsernameFromToken());
    fetchTheme();
  }, [fetchTheme, router]);

  const handleColorChange = (key: keyof ThemeTokens, value: string) => {
    setTokens((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiRequest(API_ENDPOINTS.THEME_UPDATE, {
        method: "PUT",
        body: JSON.stringify(tokens),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message?.[0] || "บันทึกธีมไม่สำเร็จ");
      }

      setInitialTokens(tokens);
      setSuccess("บันทึกธีมสำเร็จ");
    } catch (err: any) {
      setError(err?.message || "ไม่สามารถบันทึกธีมได้");
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleReset = () => {
    if (!hasChanges) return;
    if (confirm("ต้องการรีเซ็ตกลับเป็นค่าเริ่มต้นหรือไม่?")) {
      setTokens(DEFAULT_THEME);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">กำลังโหลดธีมของคุณ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="bg-white/80 backdrop-blur border border-slate-100 rounded-3xl p-8 shadow-xl shadow-blue-100/40 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-30 bg-gradient-to-r from-blue-100 via-transparent to-purple-100" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-slate-500 font-semibold">
                Personalized Theme
              </p>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">
                ปรับธีมตามสไตล์ของคุณ
              </h1>
              <p className="text-slate-600 mt-3 max-w-2xl">
                เลือกชุดสีที่บ่งบอกความเป็นตัวเองได้อย่างอิสระ ระบบจะใช้สีเหล่านี้กับหน้าโปรไฟล์และองค์ประกอบหลักโดยอัตโนมัติ
              </p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/"
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition"
              >
                หน้าหลัก
              </Link>
              <Link
                href={username ? `/${username}` : "/"}
                target="_blank"
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition"
              >
                ดูหน้าโปรไฟล์
              </Link>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`rounded-2xl p-4 border ${
              error ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {error || success}
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            {COLOR_CONTROLS.map((control) => (
              <div key={control.key} className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{control.label}</h3>
                    <p className="text-sm text-slate-500">{control.description}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={tokens[control.key]}
                      onChange={(event) => handleColorChange(control.key, event.target.value)}
                      className="w-14 h-14 rounded-xl border border-slate-200 shadow-inner bg-white"
                      aria-label={control.label}
                    />
                    <input
                      type="text"
                      value={tokens[control.key]}
                      onChange={(event) => handleColorChange(control.key, event.target.value)}
                      className="w-28 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm text-slate-600"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
              <div
                className="px-6 py-4 flex items-center justify-between text-sm font-semibold uppercase tracking-[0.2em]"
                style={{ background: tokens.headerBgColor, color: tokens.headerTextColor }}
              >
                <span>Header Preview</span>
                <span>Menu • Menu • Menu</span>
              </div>
              <div
                className="p-6"
                style={{ background: tokens.backgroundColor, color: tokens.textColor }}
              >
                <p className="text-sm uppercase tracking-[0.35em]" style={{ color: tokens.accentColor }}>
                  Preview
                </p>
                <h2 className="text-2xl font-bold mt-3">Portfolio Headline</h2>
                <p className="mt-2 text-sm opacity-80">
                  โทนสีนี้ใช้กับข้อความ พื้นหลัง และเน้นจุดสำคัญต่าง ๆ
                </p>
                <div className="flex flex-wrap gap-3 mt-6">
                  <span
                    className="px-4 py-2 rounded-full text-sm font-semibold shadow"
                    style={{
                      background: tokens.primaryColor,
                      color: "#ffffff",
                    }}
                  >
                    Primary Button
                  </span>
                  <span
                    className="px-4 py-2 rounded-full text-sm font-semibold border"
                    style={{
                      borderColor: tokens.secondaryColor,
                      color: tokens.secondaryColor,
                    }}
                  >
                    Secondary
                  </span>
                  <span
                    className="px-4 py-2 rounded-full text-sm font-semibold"
                    style={{
                      background: `${tokens.accentColor}25`,
                      color: tokens.accentColor,
                    }}
                  >
                    Accent Tag
                  </span>
                </div>
              </div>
              <div
                className="px-6 py-4 text-sm font-medium"
                style={{ background: tokens.footerBgColor, color: tokens.footerTextColor }}
              >
                Footer Preview — © {new Date().getFullYear()}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm space-y-4">
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleSave}
                  disabled={!hasChanges || saving}
                  className={`px-4 py-2 rounded-xl text-white font-semibold shadow-lg transition ${
                    saving || !hasChanges
                      ? "bg-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:shadow-blue-500/40"
                  }`}
                >
                  {saving ? "กำลังบันทึก..." : "บันทึกธีม"}
                </button>
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition"
                >
                  รีเซ็ตเป็นค่าเริ่มต้น
                </button>
                <button
                  onClick={fetchTheme}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-white transition"
                >
                  โหลดจากฐานข้อมูล
                </button>
              </div>
              <p className="text-xs text-slate-500">
                ธีมจะถูกบันทึกกับบัญชีของคุณและถูกนำไปใช้กับหน้าโปรไฟล์โดยอัตโนมัติ
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

