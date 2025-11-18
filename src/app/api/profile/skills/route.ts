import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT - อัปเดตทักษะ
export async function PUT(request: NextRequest) {
  try {
    const { skills } = await request.json();

    let profile = await prisma.profile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลโปรไฟล์" },
        { status: 404 }
      );
    }

    // ลบทักษะเดิม
    await prisma.skill.deleteMany({
      where: { profileId: profile.id },
    });

    // เพิ่มทักษะใหม่
    if (skills && skills.length > 0) {
      await prisma.skill.createMany({
        data: skills.map((skill: string) => ({
          name: skill,
          profileId: profile.id,
        })),
      });
    }

    return NextResponse.json({ success: true, message: "อัปเดตทักษะสำเร็จ" });
  } catch (error) {
    console.error("Error updating skills:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตทักษะ" },
      { status: 500 }
    );
  }
}

