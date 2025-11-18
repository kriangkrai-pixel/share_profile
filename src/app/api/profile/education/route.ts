import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT - อัปเดตการศึกษา
export async function PUT(request: NextRequest) {
  try {
    const { education } = await request.json();

    let profile = await prisma.profile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลโปรไฟล์" },
        { status: 404 }
      );
    }

    // บันทึกค่าเก่าก่อนลบ
    const oldEducation = await prisma.education.findMany({
      where: { profileId: profile.id },
    });

    // ลบการศึกษาเดิม
    await prisma.education.deleteMany({
      where: { profileId: profile.id },
    });

    // เพิ่มการศึกษาใหม่
    const educationData = [];
    if (education.university) {
      educationData.push({
        type: "university",
        field: education.university.field,
        institution: education.university.university || education.university.institution,
        year: education.university.year,
        profileId: profile.id,
      });
    }
    if (education.highschool) {
      educationData.push({
        type: "highschool",
        field: education.highschool.field,
        institution: education.highschool.school || education.highschool.institution,
        gpa: education.highschool.gpa,
        profileId: profile.id,
      });
    }

    if (educationData.length > 0) {
      await prisma.education.createMany({
        data: educationData,
      });
    }

    // บันทึกประวัติการแก้ไข
    try {
      await prisma.editHistory.create({
        data: {
          page: "education",
          section: "all",
          action: "update",
          oldValue: JSON.stringify(oldEducation),
          newValue: JSON.stringify(educationData),
        },
      });
    } catch (historyError) {
      console.error("Error logging edit history:", historyError);
    }

    return NextResponse.json({ success: true, message: "อัปเดตการศึกษาสำเร็จ" });
  } catch (error) {
    console.error("Error updating education:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตการศึกษา" },
      { status: 500 }
    );
  }
}

