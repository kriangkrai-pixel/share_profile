import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Enable caching
export const revalidate = 30; // Cache for 30 seconds

// GET - ดึงข้อมูลโปรไฟล์
export async function GET() {
  try {
    // ดึงข้อมูลโปรไฟล์แรก (พร้อม relations - optimized)
    let profile = await prisma.profile.findFirst({
      include: {
        skills: {
          select: { id: true, name: true },
          orderBy: { id: 'asc' },
        },
        education: {
          select: { 
            id: true, 
            type: true, 
            field: true, 
            institution: true, 
            location: true,
            year: true, 
            gpa: true 
          },
          orderBy: { id: 'asc' },
        },
        experiences: {
          select: { 
            id: true, 
            title: true, 
            company: true, 
            location: true, 
            period: true, 
            description: true 
          },
          orderBy: { id: 'desc' },
        },
        portfolios: {
          select: { 
            id: true, 
            title: true, 
            description: true, 
            image: true, 
            link: true 
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!profile) {
      // สร้างโปรไฟล์เริ่มต้น (พร้อม relations)
      profile = await prisma.profile.create({
        data: {
          name: "เกรียงไกร ภูทองก้าน",
          email: "kik550123@gmail.com",
          phone: "091-826-6369",
          location: "Phuket, Thailand",
          description: "นักศึกษาปี 4 สาขาวิชาคอมพิวเตอร์ สนใจออกแบบระบบ พัฒนาเว็บไซต์ เขียนโปรแกรม และสร้างเกม พร้อมพัฒนาทักษะอย่างต่อเนื่อง",
          bio: "ฉันเป็นนักศึกษาปี 4 สาขาวิชาคอมพิวเตอร์ มหาวิทยาลัยราชภัฏภูเก็ต มีความสนใจด้านการออกแบบระบบ การพัฒนาเว็บไซต์ การเขียนโปรแกรม รวมถึงการสร้างเกม มีความสนใจในสิ่งใหม่ๆ และพร้อมพัฒนาทักษะในสายงานเทคโนโลยีอย่างต่อเนื่อง",
          achievement: "เคยทำโปรเจกต์เกี่ยวกับทางด้านเกมโดยใช้ Unreal Engine 5 และมีผลงานตีพิมพ์ในงานประชุมวิชาการระดับนานาชาติเรื่อง \"Development of Adventure Games and Puzzle Solving in Mysterious Museums\" ตีพิมพ์ IEEE Xplore",
          skills: {
            create: [
              { name: "HTML, CSS, JavaScript" },
              { name: "Unreal Engine (Blueprint)" },
              { name: "Game Design & Puzzle Logic" },
            ],
          },
          education: {
            create: [
              {
                type: "university",
                field: "สาขาวิชาคอมพิวเตอร์",
                institution: "มหาวิทยาลัยราชภัฏภูเก็ต",
                year: "ปี 4",
              },
              {
                type: "highschool",
                field: "คณิต-อังกฤษ",
                institution: "โรงเรียนเมืองถลาง",
                gpa: "3.03",
              },
            ],
          },
          experiences: {
            create: [
              {
                title: "ออกแบบเว็บไซต์ด้วย WordPress",
                company: "บริษัท ภูเก็ตดีมีเดีย",
                location: "ภูเก็ต",
                period: "ปี พ.ศ. 2568 - พ.ศ. 2568",
              },
            ],
          },
          portfolios: {
            create: [
              { title: "โปรเจกต์ที่ 1", description: "คำอธิบายโปรเจกต์" },
              { title: "โปรเจกต์ที่ 2", description: "คำอธิบายโปรเจกต์" },
              { title: "โปรเจกต์ที่ 3", description: "คำอธิบายโปรเจกต์" },
            ],
          },
        },
        include: {
          skills: true,
          education: true,
          experiences: true,
          portfolios: true,
        },
      });
    }

    // แปลงข้อมูลให้ตรงกับ interface
    const university = profile.education.find((e) => e.type === "university");
    const highschool = profile.education.find((e) => e.type === "highschool");
    
    const profileData = {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        description: profile.description,
        bio: profile.bio,
        achievement: profile.achievement,
        heroImage: profile.heroImage || undefined,
        contactImage: profile.contactImage || undefined,
        skills: profile.skills.map((s: { name: string }) => s.name),
        education: {
          university: {
            field: university?.field || "",
            university: university?.institution || "",
            year: university?.year || "",
          },
          highschool: {
            field: highschool?.field || "",
            school: highschool?.institution || "",
            gpa: highschool?.gpa || "",
          },
        },
        experience: profile.experiences.map((exp: { id: number; title: string; company: string; location: string; period: string; description?: string | null }) => ({
          id: exp.id,
          title: exp.title,
          company: exp.company,
          location: exp.location,
          period: exp.period,
          description: exp.description || undefined,
        })),
        portfolio: profile.portfolios.map((port: { id: number; title: string; description: string; image?: string | null; link?: string | null }) => ({
          id: port.id,
          title: port.title,
          description: port.description,
          image: port.image || undefined,
          link: port.link || undefined,
        })),
      };

    return NextResponse.json(profileData);
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    
    // ตรวจสอบว่าเป็น database connection error หรือไม่
    if (error.code === 'P1001' || error.message?.includes('connect')) {
      return NextResponse.json(
        { 
          error: "ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้ กรุณาตรวจสอบการตั้งค่า DATABASE_URL",
          details: "Database connection failed. Please check your .env file and ensure MySQL is running."
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: "เกิดข้อผิดพลาดในการดึงข้อมูล",
        details: error.message || "Unknown error"
      },
      { status: 500 }
    );
  } finally {
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      // Ignore disconnect errors
    }
  }
}

// PUT - อัปเดตข้อมูลโปรไฟล์หลัก
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, location, description, bio, achievement, heroImage, contactImage } = body;

    let profile = await prisma.profile.findFirst();

    if (!profile) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลโปรไฟล์" },
        { status: 404 }
      );
    }

    // บันทึกค่าเก่าก่อนอัปเดต
    const oldValues = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      description: profile.description,
      bio: profile.bio,
      achievement: profile.achievement,
      heroImage: profile.heroImage,
      contactImage: profile.contactImage,
    };

    // เตรียมข้อมูลที่จะอัปเดต (เฉพาะฟิลด์ที่ส่งมา)
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (location !== undefined) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (bio !== undefined) updateData.bio = bio;
    if (achievement !== undefined) updateData.achievement = achievement;
    if (heroImage !== undefined) updateData.heroImage = heroImage;
    if (contactImage !== undefined) updateData.contactImage = contactImage;

    profile = await prisma.profile.update({
      where: { id: profile.id },
      data: updateData,
      include: {
        skills: true,
        education: true,
        experiences: true,
        portfolios: true,
      },
    });

    // บันทึกประวัติการแก้ไข
    try {
      await prisma.editHistory.create({
        data: {
          page: "profile",
          section: "main",
          action: "update",
          oldValue: JSON.stringify(oldValues),
          newValue: JSON.stringify({ name, email, phone, location, description, bio, achievement, heroImage: heroImage ? "updated" : undefined, contactImage: contactImage ? "updated" : undefined }),
        },
      });
    } catch (historyError) {
      console.error("Error logging edit history:", historyError);
      // ไม่ throw error เพื่อไม่ให้กระทบการทำงานหลัก
    }

    return NextResponse.json({ success: true, message: "อัปเดตข้อมูลสำเร็จ" });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตข้อมูล" },
      { status: 500 }
    );
  }
}

