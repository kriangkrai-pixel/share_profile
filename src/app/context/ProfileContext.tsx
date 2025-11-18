"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

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
  name: "เกรียงไกร ภูทองก้าน",
  email: "kik550123@gmail.com",
  phone: "091-826-6369",
  location: "Phuket, Thailand",
  description: "นักศึกษาปี 4 สาขาวิชาคอมพิวเตอร์ สนใจออกแบบระบบ พัฒนาเว็บไซต์ เขียนโปรแกรม และสร้างเกม พร้อมพัฒนาทักษะอย่างต่อเนื่อง",
  bio: "ฉันเป็นนักศึกษาปี 4 สาขาวิชาคอมพิวเตอร์ มหาวิทยาลัยราชภัฏภูเก็ต มีความสนใจด้านการออกแบบระบบ การพัฒนาเว็บไซต์ การเขียนโปรแกรม รวมถึงการสร้างเกม มีความสนใจในสิ่งใหม่ๆ และพร้อมพัฒนาทักษะในสายงานเทคโนโลยีอย่างต่อเนื่อง",
  achievement: "เคยทำโปรเจกต์เกี่ยวกับทางด้านเกมโดยใช้ Unreal Engine 5 และมีผลงานตีพิมพ์ในงานประชุมวิชาการระดับนานาชาติเรื่อง \"Development of Adventure Games and Puzzle Solving in Mysterious Museums\" ตีพิมพ์ IEEE Xplore",
  skills: ["HTML, CSS, JavaScript", "Unreal Engine (Blueprint)", "Game Design & Puzzle Logic"],
  education: {
    university: {
      field: "สาขาวิชาคอมพิวเตอร์",
      university: "มหาวิทยาลัยราชภัฏภูเก็ต",
      year: "ปี 4",
    },
    highschool: {
      field: "คณิต-อังกฤษ",
      school: "โรงเรียนเมืองถลาง",
      gpa: "3.03",
    },
  },
  experience: [
    {
      id: 1,
      title: "ออกแบบเว็บไซต์ด้วย WordPress",
      company: "บริษัท ภูเก็ตดีมีเดีย",
      location: "ภูเก็ต",
      period: "ปี พ.ศ. 2568 - พ.ศ. 2568",
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
  const fetchProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        next: { revalidate: 30 }, // Cache 30 วินาที
      });
      const data = await response.json();
      
      if (response.ok && !data.error) {
        setProfile(data);
        // เก็บข้อมูลใน localStorage เป็น backup
        localStorage.setItem("profileData", JSON.stringify(data));
      } else {
        // ถ้า API ไม่ทำงาน ให้ใช้ข้อมูลจาก localStorage เป็น fallback
        const saved = localStorage.getItem("profileData");
        if (saved) {
          try {
            const parsedData = JSON.parse(saved);
            setProfile(parsedData);
          } catch (e) {
            console.error("Failed to load profile data from localStorage:", e);
          }
        } else {
          // ถ้าไม่มีข้อมูลใน localStorage ใช้ default
          localStorage.setItem("profileData", JSON.stringify(defaultProfile));
        }
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      // Fallback to localStorage
      const saved = localStorage.getItem("profileData");
      if (saved) {
        try {
          const parsedData = JSON.parse(saved);
          setProfile(parsedData);
        } catch (e) {
          console.error("Failed to load profile data from localStorage:", e);
          // ใช้ default profile ถ้า localStorage ก็เสีย
          setProfile(defaultProfile);
        }
      } else {
        // ใช้ default profile
        setProfile(defaultProfile);
        localStorage.setItem("profileData", JSON.stringify(defaultProfile));
      }
    } finally {
      setLoading(false);
    }
  };

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

  const updateProfile = async (data: Partial<ProfileData>) => {
    try {
      // อัปเดตข้อมูลหลัก
      if (data.name || data.email || data.phone || data.location || data.description || data.bio || data.achievement || data.heroImage !== undefined || data.contactImage !== undefined) {
        await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone,
            location: data.location,
            description: data.description,
            bio: data.bio,
            achievement: data.achievement,
            heroImage: data.heroImage,
            contactImage: data.contactImage,
          }),
        });
      }

      // อัปเดตทักษะ
      if (data.skills) {
        await fetch("/api/profile/skills", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: data.skills }),
        });
      }

      // อัปเดตการศึกษา
      if (data.education) {
        await fetch("/api/profile/education", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ education: data.education }),
        });
      }

      // Refresh ข้อมูลจาก API เพื่อให้แน่ใจว่าข้อมูลตรงกับ database
      const response = await fetch("/api/profile", {
        next: { revalidate: 0 }, // Force fresh data after update
      });
      if (response.ok) {
        const updatedData = await response.json();
        if (!updatedData.error) {
          setProfile(updatedData);
          localStorage.setItem("profileData", JSON.stringify(updatedData));
          // Dispatch custom event เพื่อแจ้งให้หน้าอื่นรู้ว่ามีการอัปเดต
          window.dispatchEvent(new Event("profileUpdated"));
          return;
        }
      }

      // ถ้า refresh ไม่สำเร็จ ให้อัปเดต state ทันที
      setProfile((prev) => {
        const updated = { ...prev, ...data };
        localStorage.setItem("profileData", JSON.stringify(updated));
        window.dispatchEvent(new Event("profileUpdated"));
        return updated;
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      // อัปเดต state แม้ว่า API จะล้มเหลว
      setProfile((prev) => {
        const updated = { ...prev, ...data };
        localStorage.setItem("profileData", JSON.stringify(updated));
        window.dispatchEvent(new Event("profileUpdated"));
        return updated;
      });
    }
  };

  const refreshProfile = async () => {
    await fetchProfile();
  };

  const updatePortfolio = async (portfolio: ProfileData["portfolio"]) => {
    try {
      await fetch("/api/profile/portfolio", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portfolios: portfolio }),
      });

      // Refresh ข้อมูลจาก API เพื่อให้แน่ใจว่าข้อมูลตรงกับ database
      const response = await fetch("/api/profile");
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
  };

  const updateExperience = async (experience: ProfileData["experience"]) => {
    try {
      await fetch("/api/profile/experience", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experiences: experience }),
      });

      // Refresh ข้อมูลจาก API เพื่อให้แน่ใจว่าข้อมูลตรงกับ database
      const response = await fetch("/api/profile");
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
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, updatePortfolio, updateExperience, refreshProfile }}>
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

