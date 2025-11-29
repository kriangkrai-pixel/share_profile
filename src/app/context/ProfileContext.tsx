"use client";

// เพิ่ม useMemo/useCallback เพื่อลดการ re-render ที่ไม่จำเป็น
import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from "react";
import { API_ENDPOINTS, apiRequest, isConnectionError } from "@/lib/api-config";

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  description: string;
  bio: string;
  achievement: string;
  skills: string[];
  heroImage?: string;
  contactImage?: string;
  education: {
    university: {
      field: string;
      university: string;
      year: string;
      gpa?: string; // GPA สำหรับมหาวิทยาลัย (เมื่อจบการศึกษาแล้ว)
      status?: string; // "studying" หรือ "graduated"
    };
    highschool: {
      field: string;
      school: string;
      gpa: string;
    };
  };
  experience: Array<{
    id: number;
    title: string;
    company: string;
    location: string;
    period: string;
    description?: string;
  }>;
  portfolio: Array<{
    id: number;
    title: string;
    description: string;
    image?: string;
    link?: string;
  }>;
}

const defaultProfile: ProfileData = {
  name: "Example User",
  email: "example@example.com",
  phone: "000-000-0000",
  location: "Bangkok, Thailand",
  description: "Full Stack Developer สนใจออกแบบระบบ พัฒนาเว็บไซต์ เขียนโปรแกรม และสร้างแอปพลิเคชัน พร้อมพัฒนาทักษะอย่างต่อเนื่อง",
  bio: "นักพัฒนาเว็บไซต์ที่มีประสบการณ์ในการสร้างเว็บแอปพลิเคชันที่ทันสมัยและมีประสิทธิภาพ มีความสนใจในสิ่งใหม่ๆ และพร้อมพัฒนาทักษะในสายงานเทคโนโลยีอย่างต่อเนื่อง",
  achievement: "มีประสบการณ์ในการพัฒนาโปรเจกต์ต่างๆ และพร้อมพัฒนาทักษะอย่างต่อเนื่อง",
  skills: ["HTML, CSS, JavaScript", "React", "Node.js"],
  education: {
    university: {
      field: "สาขาเทคโนโลยีสารสนเทศ",
      university: "มหาวิทยาลัยตัวอย่าง",
      year: "ปี 4",
      status: "studying",
    },
    highschool: {
      field: "คณิต-อังกฤษ",
      school: "โรงเรียนตัวอย่าง",
      gpa: "3.00",
    },
  },
  experience: [
    {
      id: 1,
      title: "Frontend Developer",
      company: "บริษัทตัวอย่าง",
      location: "กรุงเทพฯ",
      period: "ปี พ.ศ. 2568 - ปัจจุบัน",
    },
  ],
  portfolio: [
    { id: 1, title: "โปรเจกต์ที่ 1", description: "คำอธิบายโปรเจกต์" },
    { id: 2, title: "โปรเจกต์ที่ 2", description: "คำอธิบายโปรเจกต์" },
    { id: 3, title: "โปรเจกต์ที่ 3", description: "คำอธิบายโปรเจกต์" },
  ],
};

interface ProfileContextType {
  profile: ProfileData;
  updateProfile: (data: Partial<ProfileData>) => void;
  updatePortfolio: (portfolio: ProfileData["portfolio"]) => void;
  updateExperience: (experience: ProfileData["experience"]) => void;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [loading, setLoading] = useState(true);

  // ฟังก์ชันสำหรับโหลดข้อมูลจาก API
  // ใช้ useCallback เพื่อให้ reference ของ function คงที่
  const fetchProfile = useCallback(async () => {
    console.log("📥 Fetching profile data from API...");

    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        const response = await apiRequest(API_ENDPOINTS.PROFILE, {
          method: "GET",
          cache: "no-store",
        });
        
        console.log("📥 Fetch response status:", response.status, response.ok);
        
        if (response.status === 429) {
          attempt += 1;
          const retryAfterHeader = response.headers.get("Retry-After");
          const retryAfterSeconds = retryAfterHeader ? parseFloat(retryAfterHeader) : NaN;
          const waitMs = !Number.isNaN(retryAfterSeconds)
            ? retryAfterSeconds * 1000
            : 500 * attempt;
          console.warn(`⚠️ Received 429 (attempt ${attempt}/${maxRetries}). Retrying in ${waitMs}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("📥 Fetch response data:", data ? "received" : "null", data?.error ? "has error" : "no error");
        
        // ตรวจสอบว่าเป็น error object หรือไม่ และมีข้อมูลที่จำเป็นหรือไม่
        if (!data.error && data.name !== undefined) {
          console.log("✅ Setting profile state with fresh data from API");
          setProfile(data);
          // เก็บข้อมูลใน localStorage เป็น backup
          localStorage.setItem("profileData", JSON.stringify(data));
          console.log("✅ Profile state updated successfully");
        } else {
          console.warn("⚠️ API response has error or missing data, using localStorage fallback");
          // ถ้า API ไม่ทำงาน ให้ใช้ข้อมูลจาก localStorage เป็น fallback
          const saved = localStorage.getItem("profileData");
          if (saved) {
            try {
              const parsedData = JSON.parse(saved);
              console.log("📦 Using cached profile data from localStorage");
              setProfile(parsedData);
            } catch (e) {
              console.error("❌ Failed to load profile data from localStorage:", e);
              setProfile(defaultProfile);
            }
          } else {
            // ถ้าไม่มีข้อมูลใน localStorage ใช้ default
            console.log("📦 Using default profile data");
            localStorage.setItem("profileData", JSON.stringify(defaultProfile));
            setProfile(defaultProfile);
          }
        }

        setLoading(false);
        return;
      } catch (error: any) {
        // Handle connection errors gracefully without logging as errors
        if (isConnectionError(error)) {
          // Connection errors are expected when backend is down - use fallback silently
          if (process.env.NODE_ENV === 'development') {
            console.warn("⚠️ Backend connection failed. Using cached profile data.");
          }
          break;
        }

        // ถ้าเกิด error อย่างอื่น และยังเหลือ retry ให้ลองใหม่
        if (attempt < maxRetries) {
          attempt += 1;
          console.warn(`⚠️ Fetch profile failed (attempt ${attempt}/${maxRetries}). Retrying...`, error);
          await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
          continue;
        }

        console.error("❌ Error fetching profile:", error);
        break;
      } finally {
        // จะออกหลัง return หรือ break ซึ่ง setLoading=false จะ set ภายหลัง loop (ด้านล่าง)
      }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem("profileData");
    if (saved) {
      try {
        const parsedData = JSON.parse(saved);
        console.log("📦 Using cached profile data from localStorage (error fallback)");
        setProfile(parsedData);
      } catch (e) {
        console.error("❌ Failed to load profile data from localStorage:", e);
        // ใช้ default profile ถ้า localStorage ก็เสีย
        setProfile(defaultProfile);
      }
    } else {
      // ใช้ default profile
      console.log("📦 Using default profile data (no cache)");
      setProfile(defaultProfile);
      localStorage.setItem("profileData", JSON.stringify(defaultProfile));
    }

    setLoading(false);
  }, []); // ไม่มี dependencies เพราะใช้แค่ setProfile และ setLoading ซึ่งเป็น stable functions จาก useState

  useEffect(() => {
    fetchProfile();

    // Listen for storage events (เมื่อมีการเปลี่ยนแปลงจากแท็บอื่น)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "profileData" && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setProfile(newData);
        } catch (error) {
          console.error("Failed to parse storage data:", error);
        }
      }
    };

    // Listen for custom event (สำหรับการอัปเดตในแท็บเดียวกัน)
    const handleProfileUpdate = () => {
      fetchProfile();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("profileUpdated", handleProfileUpdate);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("profileUpdated", handleProfileUpdate);
    };
  }, []);

  // ใช้ useCallback เพื่อไม่ให้สร้าง function ใหม่ทุกครั้ง
  const updateProfile = useCallback(async (data: Partial<ProfileData>) => {
    console.log("🔄 Starting profile update with data:", Object.keys(data));
    try {
      // อัปเดตข้อมูลหลัก
      if (data.name || data.email || data.phone || data.location || data.description || data.bio || data.achievement || data.heroImage !== undefined || data.contactImage !== undefined) {
        // เตรียมข้อมูลที่จะส่งไป API โดยกรอง undefined และ empty string ที่ไม่จำเป็น
        const updatePayload: any = {};
        if (data.name !== undefined) updatePayload.name = data.name || '';
        if (data.email !== undefined) updatePayload.email = data.email || '';
        if (data.phone !== undefined) updatePayload.phone = data.phone || '';
        if (data.location !== undefined) updatePayload.location = data.location || '';
        if (data.description !== undefined) updatePayload.description = data.description || '';
        if (data.bio !== undefined) updatePayload.bio = data.bio || '';
        if (data.achievement !== undefined) updatePayload.achievement = data.achievement || '';
        // สำหรับ heroImage และ contactImage: ส่งเฉพาะเมื่อมีค่า (ไม่ใช่ empty string)
        if (data.heroImage !== undefined) {
          updatePayload.heroImage = (data.heroImage && data.heroImage.trim()) ? data.heroImage : null;
        }
        if (data.contactImage !== undefined) {
          updatePayload.contactImage = (data.contactImage && data.contactImage.trim()) ? data.contactImage : null;
        }

        console.log("📤 Sending profile update request:", Object.keys(updatePayload));
        const response = await apiRequest(API_ENDPOINTS.PROFILE, {
          method: "PUT",
          body: JSON.stringify(updatePayload),
        });
        if (!response.ok) {
          // พยายามดึง error message จาก response
          let errorMessage = `Failed to update profile: ${response.status}`;
          try {
            const errorData = await response.json();
            if (errorData.message) {
              if (Array.isArray(errorData.message)) {
                errorMessage = errorData.message.join(', ');
              } else {
                errorMessage = errorData.message;
              }
            }
          } catch (e) {
            // ถ้า parse JSON ไม่ได้ ให้ใช้ error message เริ่มต้น
          }
          console.error("❌ Profile update failed:", errorMessage);
          throw new Error(errorMessage);
        }
        console.log("✅ Profile update successful");
      }

      // อัปเดตทักษะ
      if (data.skills) {
        console.log("📤 Updating skills:", data.skills.length, "items");
        const response = await apiRequest(API_ENDPOINTS.SKILLS, {
          method: "PUT",
          body: JSON.stringify({ skills: data.skills }),
        });
        if (!response.ok) {
          console.error("❌ Skills update failed:", response.status);
          throw new Error(`Failed to update skills: ${response.status}`);
        }
        console.log("✅ Skills update successful");
      }

      // อัปเดตการศึกษา
      if (data.education) {
        console.log("📤 Updating education");
        const response = await apiRequest(API_ENDPOINTS.EDUCATION, {
          method: "PUT",
          body: JSON.stringify({ education: data.education }),
        });
        if (!response.ok) {
          console.error("❌ Education update failed:", response.status);
          throw new Error(`Failed to update education: ${response.status}`);
        }
        console.log("✅ Education update successful");
      }

      // Refresh ข้อมูลจาก API เพื่อให้แน่ใจว่าข้อมูลตรงกับ database
      // ใช้ fetchProfile() โดยตรงเพื่อให้แน่ใจว่าข้อมูลถูกอัปเดต
      console.log("🔄 Refreshing profile data from API...");
      
      let refreshSuccess = false;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (!refreshSuccess && retryCount <= maxRetries) {
        try {
          const response = await apiRequest(API_ENDPOINTS.PROFILE, {
            method: "GET",
            cache: "no-store",
          });
          console.log(`📥 Refresh attempt ${retryCount + 1} - response status:`, response.status, response.ok);
          
          if (response.ok) {
            const updatedData = await response.json();
            console.log("📥 Refresh response data:", updatedData ? "received" : "null", updatedData?.error ? "has error" : "no error");
            
            // ตรวจสอบว่าเป็น error object หรือไม่
            if (updatedData && !updatedData.error && updatedData.name !== undefined) {
              console.log("✅ Updating profile state with fresh data from API");
              setProfile(updatedData);
              localStorage.setItem("profileData", JSON.stringify(updatedData));
              // Dispatch custom event เพื่อแจ้งให้หน้าอื่นรู้ว่ามีการอัปเดต
              window.dispatchEvent(new Event("profileUpdated"));
              console.log("✅ Profile state updated successfully");
              refreshSuccess = true;
              return;
            } else {
              console.warn("⚠️ Refresh response invalid:", updatedData?.error || "missing required fields");
            }
          } else {
            console.warn(`⚠️ Refresh attempt ${retryCount + 1} failed with status:`, response.status);
          }
        } catch (refreshError) {
          console.warn(`⚠️ Refresh attempt ${retryCount + 1} error:`, refreshError);
        }
        
        retryCount++;
        if (!refreshSuccess && retryCount <= maxRetries) {
          console.log(`🔄 Retrying refresh (${retryCount}/${maxRetries})...`);
          // รอสักครู่ก่อน retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // ถ้า refresh ไม่สำเร็จ ให้อัปเดต state ทันทีด้วยข้อมูลที่ส่งมา
      console.log("⚠️ Refresh failed after retries, updating state with provided data");
      setProfile((prev) => {
        const updated = { ...prev, ...data };
        localStorage.setItem("profileData", JSON.stringify(updated));
        window.dispatchEvent(new Event("profileUpdated"));
        console.log("✅ Profile state updated with provided data (fallback)");
        return updated;
      });
    } catch (error: any) {
      console.error("❌ Error updating profile:", error);
      
      // ถ้าเป็น validation error (400) ให้แสดง error message ที่ชัดเจน
      if (error?.message?.includes("Failed to update profile: 400")) {
        // ไม่ throw error อีกครั้ง แต่ให้อัปเดต state เพื่อเก็บข้อมูลไว้
        // และให้ caller จัดการ error message เอง
        console.warn("⚠️ Validation error occurred, but keeping local state updated");
      }
      
      // อัปเดต state แม้ว่า API จะล้มเหลว เพื่อให้ข้อมูลไม่หายไป
      // แต่จะ throw error ต่อไปเพื่อให้ caller รู้ว่ามีปัญหา
      console.log("🔄 Updating state with provided data despite error (fallback)");
      setProfile((prev) => {
        const updated = { ...prev, ...data };
        localStorage.setItem("profileData", JSON.stringify(updated));
        window.dispatchEvent(new Event("profileUpdated"));
        console.log("✅ Profile state updated with provided data (error fallback)");
        return updated;
      });
      
      // Throw error ต่อไปเพื่อให้ caller รู้ว่ามีปัญหา
      throw error;
    }
  }, []);

  // memoize refreshProfile เพื่อไม่ให้ consumer re-render โดยไม่จำเป็น
  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  // memoize updatePortfolio
  const updatePortfolio = useCallback(async (portfolio: ProfileData["portfolio"]) => {
    try {
      const portfolioResponse = await apiRequest(API_ENDPOINTS.PORTFOLIO, {
        method: "PUT",
        body: JSON.stringify({ portfolios: portfolio }),
      });
      if (!portfolioResponse.ok) {
        throw new Error(`Failed to update portfolio: ${portfolioResponse.status}`);
      }

      // Refresh ข้อมูลจาก API เพื่อให้แน่ใจว่าข้อมูลตรงกับ database
      const response = await apiRequest(API_ENDPOINTS.PROFILE, {
        method: "GET",
      });
      if (response.ok) {
        const updatedData = await response.json();
        if (!updatedData.error) {
          setProfile(updatedData);
          localStorage.setItem("profileData", JSON.stringify(updatedData));
          return;
        }
      }

      // ถ้า refresh ไม่สำเร็จ ให้อัปเดต state ทันที
      setProfile((prev) => {
        const updated = { ...prev, portfolio };
        localStorage.setItem("profileData", JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error("Error updating portfolio:", error);
      setProfile((prev) => {
        const updated = { ...prev, portfolio };
        localStorage.setItem("profileData", JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  // memoize updateExperience
  const updateExperience = useCallback(async (experience: ProfileData["experience"]) => {
    try {
      const experienceResponse = await apiRequest(API_ENDPOINTS.EXPERIENCE, {
        method: "PUT",
        body: JSON.stringify({ experiences: experience }),
      });
      if (!experienceResponse.ok) {
        throw new Error(`Failed to update experience: ${experienceResponse.status}`);
      }

      // Refresh ข้อมูลจาก API เพื่อให้แน่ใจว่าข้อมูลตรงกับ database
      const response = await apiRequest(API_ENDPOINTS.PROFILE, {
        method: "GET",
      });
      if (response.ok) {
        const updatedData = await response.json();
        if (!updatedData.error) {
          setProfile(updatedData);
          localStorage.setItem("profileData", JSON.stringify(updatedData));
          return;
        }
      }

      // ถ้า refresh ไม่สำเร็จ ให้อัปเดต state ทันที
      setProfile((prev) => {
        const updated = { ...prev, experience };
        localStorage.setItem("profileData", JSON.stringify(updated));
        return updated;
      });
    } catch (error) {
      console.error("Error updating experience:", error);
      setProfile((prev) => {
        const updated = { ...prev, experience };
        localStorage.setItem("profileData", JSON.stringify(updated));
        return updated;
      });
    }
  }, []);

  // ใช้ useMemo เพื่อหลีกเลี่ยงการสร้าง object context ใหม่ทุกครั้ง
  const contextValue = useMemo(
    () => ({
      profile,
      updateProfile,
      updatePortfolio,
      updateExperience,
      refreshProfile,
    }),
    [profile, updateProfile, updatePortfolio, updateExperience, refreshProfile]
  );

  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
}

