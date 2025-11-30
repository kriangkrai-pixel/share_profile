"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "../../../lib/api-config";
import { getUsernameFromToken, getLoggedInUsers, getTokenForUser } from "../../../lib/jwt-utils";

interface WidgetStyle {
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
  borderWidth?: string;
  alignment?: "left" | "center" | "right";
  flexDirection?: "row" | "column";
  padding?: string;
}

interface Widget {
  id: number;
  type: string;
  title: string | null;
  content: string | null;
  imageUrl: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  order: number;
  isVisible: boolean;
  settings: string | null;
}

interface Layout {
  id: number;
  name: string;
  isActive: boolean;
  widgets: Widget[];
}

export default function LayoutBuilder() {
  const router = useRouter();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<Widget | null>(null);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // State สำหรับ Upload รูปภาพ
  const [uploadingImage, setUploadingImage] = useState(false);

  // โหลดข้อมูล Layout
  useEffect(() => {
    // พยายามดึง username จาก token ที่ถูกต้อง
    // ตรวจสอบจาก loggedInUsers ก่อน
    const loggedInUsers = getLoggedInUsers();
    let currentUsername: string | null = null;
    
    // ถ้ามี user login อยู่คนเดียว ให้ใช้ user นั้น
    if (loggedInUsers.length === 1) {
      currentUsername = getUsernameFromToken(loggedInUsers[0]);
    } else if (loggedInUsers.length > 1) {
      // ถ้ามีหลายคน ให้ใช้คนแรก (หรืออาจจะต้องให้ user เลือก)
      currentUsername = getUsernameFromToken(loggedInUsers[0]);
    } else {
      // ถ้าไม่มี loggedInUsers ให้ใช้ token เก่า (backward compatibility)
      currentUsername = getUsernameFromToken();
    }
    
    setUsername(currentUsername);
    loadLayout(currentUsername || undefined);
  }, []);

  const buildLayoutUrl = (targetUsername?: string) => {
    const baseUrl = targetUsername
      ? API_ENDPOINTS.LAYOUT_USERNAME(targetUsername)
      : API_ENDPOINTS.LAYOUT;
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}includeHidden=true`;
  };

  const loadLayout = async (targetUsername?: string) => {
    try {
      setLoading(true);
      const usernameToUse = targetUsername ?? username ?? undefined;
      const response = await apiRequest(buildLayoutUrl(usernameToUse), {
        method: "GET",
        cache: "no-store",
        username: usernameToUse, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`❌ Failed to load layout: ${response.status} ${response.statusText}`, errorText);

        if (response.status === 429) {
          try {
            const parsed = JSON.parse(errorText);
            const retryAfter = Number(parsed?.retryAfter ?? 15);
            showMessage("error", parsed?.message || "จำนวนคำขอเกินจำกัด กรุณาลองใหม่");
            if (Number.isFinite(retryAfter) && retryAfter > 0) {
              setTimeout(() => loadLayout(usernameToUse), retryAfter * 1000);
            }
          } catch {
            showMessage("error", "จำนวนคำขอเกินจำกัด กรุณาลองใหม่");
          }
        } else {
          showMessage("error", "ไม่สามารถโหลดข้อมูลได้");
        }
        return;
      }
      
      const data = await response.json();

      if (data && !data.error) {
        setLayout(data);
        // เรียงลำดับ widgets ตาม order
        const sortedWidgets = [...(data.widgets || [])].sort((a, b) => a.order - b.order);
        setWidgets(sortedWidgets);
      }
    } catch (error) {
      console.error("Error loading layout:", error);
      if (isConnectionError(error)) {
        showMessage("error", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้");
      } else {
        showMessage("error", "ไม่สามารถโหลดข้อมูลได้");
      }
    } finally {
      setLoading(false);
    }
  };

  // บันทึกการเปลี่ยนแปลงทั้งหมด
  const handleSaveAll = async () => {
    if (!layout) return;

    try {
      setSaving(true);

      // บันทึก widgets ทั้งหมด
      for (const widget of widgets) {
        const widgetsEndpoint = username
          ? API_ENDPOINTS.WIDGETS_USERNAME(username)
          : API_ENDPOINTS.WIDGETS;
        const response = await apiRequest(widgetsEndpoint, {
          method: "PUT",
          body: JSON.stringify({
            id: widget.id,
            title: widget.title,
            content: widget.content,
            imageUrl: widget.imageUrl,
            order: widget.order,
            isVisible: widget.isVisible,
            settings: widget.settings,
          }),
          username: username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error");
          console.error(`❌ Failed to update widget ${widget.id}: ${response.status}`, errorText);
        }
      }

      // Log การแก้ไข
      try {
        await apiRequest(API_ENDPOINTS.EDIT_HISTORY, {
          method: "POST",
          body: JSON.stringify({
            action: "update",
            section: "layout",
            details: `อัปเดต Layout: ${layout.name}`,
          }),
          username: username || undefined, // ส่ง username เพื่อใช้ token ที่ถูกต้อง
        });
      } catch (error) {
        // Log error but don't block save
        console.warn("Failed to log edit history:", error);
      }

      showMessage("success", "✅ บันทึกสำเร็จ!");
      await loadLayout(username ?? undefined); // โหลดใหม่
    } catch (error) {
      console.error("Error saving:", error);
      showMessage("error", "❌ เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  // เลื่อน Widget ขึ้น
  const handleMoveUp = (index: number) => {
    if (index === 0) return; // ไม่สามารถเลื่อนตัวแรกขึ้นได้

    const newWidgets = [...widgets];
    // Swap order
    const temp = newWidgets[index].order;
    newWidgets[index].order = newWidgets[index - 1].order;
    newWidgets[index - 1].order = temp;

    // Swap positions
    [newWidgets[index], newWidgets[index - 1]] = [newWidgets[index - 1], newWidgets[index]];

    setWidgets(newWidgets);
  };

  // เลื่อน Widget ลง
  const handleMoveDown = (index: number) => {
    if (index === widgets.length - 1) return; // ไม่สามารถเลื่อนตัวสุดท้ายลงได้

    const newWidgets = [...widgets];
    // Swap order
    const temp = newWidgets[index].order;
    newWidgets[index].order = newWidgets[index + 1].order;
    newWidgets[index + 1].order = temp;

    // Swap positions
    [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];

    setWidgets(newWidgets);
  };

  // Toggle แสดง/ซ่อน Widget
  const handleToggleVisibility = (id: number) => {
    setWidgets(widgets.map(w => 
      w.id === id ? { ...w, isVisible: !w.isVisible } : w
    ));
  };

  // แก้ไข Widget
  const handleEditWidget = (widget: Widget) => {
    setSelectedWidget({ ...widget });
    setShowStyleEditor(false);
  };

  // อัปเดต Widget ที่เลือก
  const handleUpdateWidget = () => {
    if (!selectedWidget) return;

    setWidgets(widgets.map(w => 
      w.id === selectedWidget.id ? selectedWidget : w
    ));
    setSelectedWidget(null);
  };

  // Upload รูปภาพ
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedWidget || !e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    if (!username) {
      showMessage("error", "❌ ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง");
      return;
    }
    
    // ตรวจสอบประเภทไฟล์
    if (!file.type.startsWith("image/")) {
      showMessage("error", "❌ กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    // ตรวจสอบขนาดไฟล์ต้นฉบับ (จำกัดที่ 10MB)
    if (file.size > 10 * 1024 * 1024) {
      showMessage("error", "❌ ขนาดไฟล์ต้องไม่เกิน 10MB");
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
            showMessage("error", "❌ ไม่สามารถประมวลผลรูปภาพได้");
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

          // สร้าง URL พร้อม widgetId query parameter
          const ownerQuery = `owner=${encodeURIComponent(username)}`;
          const uploadUrl = selectedWidget.id 
            ? `${API_ENDPOINTS.UPLOAD_WIDGET}?widgetId=${selectedWidget.id}&${ownerQuery}`
            : `${API_ENDPOINTS.UPLOAD_WIDGET}?${ownerQuery}`;

          // อัปโหลดไปยัง backend โดยใช้ endpoint สำหรับ widget
          const response = await apiRequest(uploadUrl, {
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

          // Backend ส่งกลับมาเป็น full URL และบันทึกลง database แล้ว
          const imageUrl = data.imageUrl || data.url;
          if (imageUrl) {
            // อัปเดต state เพื่อแสดงผลทันที (แม้ว่าจะบันทึกลง database แล้ว)
            setSelectedWidget({
              ...selectedWidget,
              imageUrl: imageUrl,
            });
            
            // อัปเดต widgets state ด้วย
            setWidgets(widgets.map(w => 
              w.id === selectedWidget.id ? { ...w, imageUrl: imageUrl } : w
            ));
            
            showMessage("success", "✅ อัปโหลดรูปภาพส่วนตัวสำเร็จและบันทึกลงฐานข้อมูลแล้ว!");
          } else {
            showMessage("error", "❌ เกิดข้อผิดพลาดในการอัปโหลด: ไม่ได้รับ URL รูปภาพ");
          }
        } catch (error: any) {
          console.error("Error uploading image:", error);
          // แสดงข้อความ error ที่ชัดเจน
          const errorMessage = error.message || "เกิดข้อผิดพลาดในการอัปโหลด";
          showMessage("error", `❌ ${errorMessage}`);
        } finally {
          setUploadingImage(false);
        }
      };

      img.onerror = () => {
        showMessage("error", "❌ ไม่สามารถอ่านไฟล์รูปภาพได้");
        setUploadingImage(false);
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Error uploading image:", error);
      showMessage("error", `❌ ${error.message || "เกิดข้อผิดพลาดในการอัปโหลด"}`);
      setUploadingImage(false);
    }
  };

  // เปิด Style Editor
  const handleOpenStyleEditor = (widget: Widget) => {
    setSelectedWidget({ ...widget });
    setShowStyleEditor(true);
  };

  // อัปเดต Style
  const handleUpdateStyle = (key: string, value: string) => {
    if (!selectedWidget) return;

    try {
      let currentStyle: WidgetStyle = {};
      
      if (selectedWidget.settings) {
        const trimmed = selectedWidget.settings.trim();
        if (trimmed && (trimmed.startsWith("{") || trimmed.startsWith("["))) {
          const parsed = JSON.parse(trimmed);
          if (typeof parsed === "object" && !Array.isArray(parsed)) {
            currentStyle = parsed;
          }
        }
      }

      const updatedStyle = {
        ...currentStyle,
        [key]: value,
      };

      setSelectedWidget({
        ...selectedWidget,
        settings: JSON.stringify(updatedStyle),
      });
    } catch (error) {
      console.error("Error updating style:", error);
    }
  };

  // แสดงข้อความแจ้งเตือน
  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // แปลง type เป็นภาษาไทย
  const getWidgetTypeName = (type: string): string => {
    const typeMap: Record<string, string> = {
      hero: "หัวเรื่องหลัก",
      about: "เกี่ยวกับเรา",
      skills: "ทักษะ",
      education: "การศึกษา",
      experience: "ประสบการณ์",
      portfolio: "ผลงาน",
      contact: "ติดต่อ",
    };
    return typeMap[type] || type;
  };

  // แสดง Icon ตาม type
  const getWidgetIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
      hero: "🎯",
      about: "👤",
      skills: "⚡",
      education: "🎓",
      experience: "💼",
      portfolio: "📁",
      contact: "📧",
    };
    return iconMap[type] || "📄";
  };

  // Parse style จาก settings
  const parseWidgetStyle = (settings: string | null): WidgetStyle => {
    try {
      if (!settings) return {};
      const trimmed = settings.trim();
      if (!trimmed || (!trimmed.startsWith("{") && !trimmed.startsWith("["))) return {};
      
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
      return {};
    } catch (error) {
      return {};
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href={username ? `/${username}/admin` : "/admin/login"}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  🎨 จัดการเลย์เอาต์
                </h1>
                <p className="text-sm text-gray-600">
                  จัดเรียง Section และแก้ไขเนื้อหาของเว็บไซต์
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href={username ? `/${username}` : "/"}
                target="_blank"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                🌐 ดูหน้าเว็บ
              </Link>
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "กำลังบันทึก..." : "💾 บันทึกทั้งหมด"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Message Alert */}
      {message && (
        <div className={`fixed top-20 right-6 z-50 px-6 py-3 rounded-lg shadow-lg animate-fade-in ${
          message.type === "success" 
            ? "bg-green-500 text-white" 
            : "bg-red-500 text-white"
        }`}>
          {message.text}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* LEFT: Widget List */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                📋 รายการ Sections
                <span className="text-sm font-normal text-gray-500">
                  ({widgets.length} รายการ)
                </span>
              </h2>

              <div className="space-y-3">
                {widgets.map((widget, index) => {
                  const style = parseWidgetStyle(widget.settings);
                  
                  return (
                    <div
                      key={widget.id}
                      className={`border-2 rounded-xl p-4 transition-all ${
                        widget.isVisible
                          ? "border-blue-200 bg-white hover:border-blue-400 hover:shadow-md"
                          : "border-gray-200 bg-gray-50 opacity-60"
                      }`}
                    >
                      {/* Widget Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{getWidgetIcon(widget.type)}</span>
                          <div>
                            <h3 className="font-bold text-gray-900">
                              {getWidgetTypeName(widget.type)}
                            </h3>
                            <p className="text-xs text-gray-500">
                              ลำดับที่ {index + 1}
                            </p>
                          </div>
                        </div>

                        {/* Reorder Buttons */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="เลื่อนขึ้น"
                          >
                            ⬆️
                          </button>
                          <button
                            onClick={() => handleMoveDown(index)}
                            disabled={index === widgets.length - 1}
                            className="p-2 rounded-lg bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="เลื่อนลง"
                          >
                            ⬇️
                          </button>
                        </div>
                      </div>

                      {/* Widget Preview */}
                      <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                        {widget.title && (
                          <p className="font-semibold text-gray-800 mb-1 truncate">
                            {widget.title}
                          </p>
                        )}
                        {widget.content && (
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {widget.content}
                          </p>
                        )}
                        {widget.imageUrl && (
                          <div className="mt-2 relative w-full h-24 rounded-lg overflow-hidden">
                            <Image
                              src={widget.imageUrl}
                              alt={widget.title || "Image"}
                              fill
                              className="object-cover"
                            />
                          </div>
                        )}
                        
                        {/* Style Preview */}
                        {style && Object.keys(style).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {style.backgroundColor && (
                              <span className="text-xs px-2 py-1 bg-white rounded border border-gray-300">
                                🎨 {style.backgroundColor}
                              </span>
                            )}
                            {style.textColor && (
                              <span className="text-xs px-2 py-1 bg-white rounded border border-gray-300">
                                🖊️ {style.textColor}
                              </span>
                            )}
                            {style.alignment && (
                              <span className="text-xs px-2 py-1 bg-white rounded border border-gray-300">
                                📐 {style.alignment}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditWidget(widget)}
                          className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                        >
                          ✏️ แก้ไขเนื้อหา
                        </button>
                        <button
                          onClick={() => handleOpenStyleEditor(widget)}
                          className="flex-1 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                        >
                          🎨 ปรับสี
                        </button>
                        <button
                          onClick={() => handleToggleVisibility(widget.id)}
                          className={`px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                            widget.isVisible
                              ? "bg-green-500 text-white hover:bg-green-600"
                              : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                          }`}
                        >
                          {widget.isVisible ? "👁️" : "🚫"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {widgets.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-4xl mb-3">📭</p>
                  <p>ไม่มี Sections</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Editor Panel */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
            {!selectedWidget ? (
              <div className="bg-white rounded-xl shadow-md p-12 text-center">
                <p className="text-6xl mb-4">👈</p>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  เลือก Section ที่ต้องการแก้ไข
                </h3>
                <p className="text-gray-600">
                  คลิกปุ่ม "✏️ แก้ไขเนื้อหา" หรือ "🎨 ปรับสี" จากรายการด้านซ้าย
                </p>
              </div>
            ) : showStyleEditor ? (
              /* Style Editor */
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    🎨 ปรับแต่งสี & รูปแบบ
                  </h2>
                  <button
                    onClick={() => setShowStyleEditor(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Widget Info */}
                  <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">{getWidgetIcon(selectedWidget.type)}</span>
                      {getWidgetTypeName(selectedWidget.type)}
                    </p>
                  </div>

                  {/* Background Color */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🎨 สีพื้นหลัง
                    </label>
                    <input
                      type="color"
                      value={parseWidgetStyle(selectedWidget.settings).backgroundColor || "#ffffff"}
                      onChange={(e) => handleUpdateStyle("backgroundColor", e.target.value)}
                      className="w-full h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={parseWidgetStyle(selectedWidget.settings).backgroundColor || "#ffffff"}
                      onChange={(e) => handleUpdateStyle("backgroundColor", e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#ffffff"
                    />
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🖊️ สีข้อความ
                    </label>
                    <input
                      type="color"
                      value={parseWidgetStyle(selectedWidget.settings).textColor || "#000000"}
                      onChange={(e) => handleUpdateStyle("textColor", e.target.value)}
                      className="w-full h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={parseWidgetStyle(selectedWidget.settings).textColor || "#000000"}
                      onChange={(e) => handleUpdateStyle("textColor", e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#000000"
                    />
                  </div>

                  {/* Border Color */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🔲 สีกรอบ
                    </label>
                    <input
                      type="color"
                      value={parseWidgetStyle(selectedWidget.settings).borderColor || "#e5e7eb"}
                      onChange={(e) => handleUpdateStyle("borderColor", e.target.value)}
                      className="w-full h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={parseWidgetStyle(selectedWidget.settings).borderColor || "#e5e7eb"}
                      onChange={(e) => handleUpdateStyle("borderColor", e.target.value)}
                      className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="#e5e7eb"
                    />
                  </div>

                  {/* Border Width */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📏 ความหนากรอบ
                    </label>
                    <select
                      value={parseWidgetStyle(selectedWidget.settings).borderWidth || "0px"}
                      onChange={(e) => handleUpdateStyle("borderWidth", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="0px">ไม่มีกรอบ</option>
                      <option value="1px">1px - บาง</option>
                      <option value="2px">2px - ปานกลาง</option>
                      <option value="4px">4px - หนา</option>
                      <option value="8px">8px - หนามาก</option>
                    </select>
                  </div>

                  {/* Alignment */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📐 การจัดวาง
                    </label>
                    <select
                      value={parseWidgetStyle(selectedWidget.settings).alignment || "center"}
                      onChange={(e) => handleUpdateStyle("alignment", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="left">ชิดซ้าย</option>
                      <option value="center">กึ่งกลาง</option>
                      <option value="right">ชิดขวา</option>
                    </select>
                  </div>

                  {/* Flex Direction */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🔄 ทิศทางการแสดงผล
                    </label>
                    <select
                      value={parseWidgetStyle(selectedWidget.settings).flexDirection || "column"}
                      onChange={(e) => handleUpdateStyle("flexDirection", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="row">แนวนอน (Row)</option>
                      <option value="column">แนวตั้ง (Column)</option>
                    </select>
                  </div>

                  {/* Padding */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📦 ระยะห่างภายใน (Padding)
                    </label>
                    <select
                      value={parseWidgetStyle(selectedWidget.settings).padding || "1rem"}
                      onChange={(e) => handleUpdateStyle("padding", e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="0">ไม่มี</option>
                      <option value="0.5rem">เล็ก (0.5rem)</option>
                      <option value="1rem">ปานกลาง (1rem)</option>
                      <option value="2rem">ใหญ่ (2rem)</option>
                      <option value="4rem">ใหญ่มาก (4rem)</option>
                    </select>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleUpdateWidget}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-lg"
                    >
                      ✅ ใช้การตั้งค่านี้
                    </button>
                    <button
                      onClick={() => {
                        setSelectedWidget(null);
                        setShowStyleEditor(false);
                      }}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Content Editor */
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    ✏️ แก้ไขเนื้อหา
                  </h2>
                  <button
                    onClick={() => setSelectedWidget(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Widget Info */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                    <p className="font-semibold text-gray-900 flex items-center gap-2">
                      <span className="text-2xl">{getWidgetIcon(selectedWidget.type)}</span>
                      {getWidgetTypeName(selectedWidget.type)}
                    </p>
                  </div>

                  {/* Title */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📝 หัวข้อ (Title)
                    </label>
                    <input
                      type="text"
                      value={selectedWidget.title || ""}
                      onChange={(e) => setSelectedWidget({ ...selectedWidget, title: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ใส่หัวข้อ..."
                    />
                  </div>

                  {/* Content */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      📄 เนื้อหา (Content)
                    </label>
                    <textarea
                      value={selectedWidget.content || ""}
                      onChange={(e) => setSelectedWidget({ ...selectedWidget, content: e.target.value })}
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      placeholder="ใส่เนื้อหา..."
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🖼️ รูปภาพ
                    </label>
                    
                    {selectedWidget.imageUrl && (
                      <div className="mb-3 relative w-full h-48 rounded-lg overflow-hidden border-2 border-gray-200">
                        <Image
                          src={selectedWidget.imageUrl}
                          alt={selectedWidget.title || "Preview"}
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <div className={`px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors ${
                          uploadingImage ? "opacity-50 cursor-not-allowed" : ""
                        }`}>
                          {uploadingImage ? "กำลังอัปโหลด..." : "📁 เลือกรูปภาพ"}
                        </div>
                      </label>
                      
                      {selectedWidget.imageUrl && (
                        <button
                          onClick={() => setSelectedWidget({ ...selectedWidget, imageUrl: null })}
                          className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          title="ลบรูปภาพ"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    <input
                      type="url"
                      value={selectedWidget.imageUrl || ""}
                      onChange={(e) => setSelectedWidget({ ...selectedWidget, imageUrl: e.target.value })}
                      className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="หรือใส่ URL รูปภาพ..."
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleUpdateWidget}
                      className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium shadow-lg"
                    >
                      ✅ บันทึกการแก้ไข
                    </button>
                    <button
                      onClick={() => setSelectedWidget(null)}
                      className="px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Guide */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-md p-6 border-2 border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                💡 คำแนะนำ
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>ใช้ปุ่ม <strong>⬆️⬇️</strong> เพื่อเรียงลำดับ Section</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>คลิก <strong>✏️ แก้ไขเนื้อหา</strong> เพื่อเปลี่ยนข้อความและรูป</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>คลิก <strong>🎨 ปรับสี</strong> เพื่อเปลี่ยนสีและรูปแบบ</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>ใช้ปุ่ม <strong>👁️/🚫</strong> เพื่อแสดง/ซ่อน Section</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>•</span>
                  <span>อย่าลืม <strong>💾 บันทึกทั้งหมด</strong> เมื่อแก้ไขเสร็จ!</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

