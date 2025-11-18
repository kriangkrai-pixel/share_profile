import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - ดึงประสบการณ์ทั้งหมด
export async function GET() {
  try {
    const profile = await prisma.profile.findFirst({
      include: { experiences: true },
    });

    if (!profile) {
      return NextResponse.json([]);
    }

    return NextResponse.json(profile.experiences);
  } catch (error) {
    console.error("Error fetching experiences:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// POST - เพิ่มประสบการณ์ใหม่
export async function POST(request: NextRequest) {
  try {
    const { title, company, location, period, description } = await request.json();

    let profile = await prisma.profile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลโปรไฟล์" },
        { status: 404 }
      );
    }

    const experience = await prisma.experience.create({
      data: {
        title,
        company,
        location,
        period,
        description,
        profileId: profile.id,
      },
    });

    return NextResponse.json({ success: true, experience });
  } catch (error) {
    console.error("Error creating experience:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเพิ่มประสบการณ์" },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตประสบการณ์ทั้งหมด
export async function PUT(request: NextRequest) {
  try {
    const { experiences } = await request.json();

    let profile = await prisma.profile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลโปรไฟล์" },
        { status: 404 }
      );
    }

    // บันทึกค่าเก่าก่อนลบ
    const oldExperiences = await prisma.experience.findMany({
      where: { profileId: profile.id },
    });

    // ลบประสบการณ์เดิมทั้งหมด
    await prisma.experience.deleteMany({
      where: { profileId: profile.id },
    });

    // เพิ่มประสบการณ์ใหม่ทั้งหมด
    if (experiences && experiences.length > 0) {
      await prisma.experience.createMany({
        data: experiences.map((exp: any) => ({
          title: exp.title,
          company: exp.company,
          location: exp.location,
          period: exp.period,
          description: exp.description,
          profileId: profile.id,
        })),
      });
    }

    // บันทึกประวัติการแก้ไข
    try {
      await prisma.editHistory.create({
        data: {
          page: "experience",
          section: "all",
          action: "update",
          oldValue: JSON.stringify(oldExperiences),
          newValue: JSON.stringify(experiences || []),
        },
      });
    } catch (historyError) {
      console.error("Error logging edit history:", historyError);
    }

    return NextResponse.json({ success: true, message: "อัปเดตประสบการณ์สำเร็จ" });
  } catch (error) {
    console.error("Error updating experiences:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตประสบการณ์" },
      { status: 500 }
    );
  }
}

// DELETE - ลบประสบการณ์
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "ไม่พบ ID" },
        { status: 400 }
      );
    }

    // บันทึกค่าเก่าก่อนลบ
    const oldExperience = await prisma.experience.findUnique({
      where: { id: parseInt(id) },
    });

    if (!oldExperience) {
      return NextResponse.json(
        { error: "ไม่พบประสบการณ์" },
        { status: 404 }
      );
    }

    // ลบประสบการณ์
    await prisma.experience.delete({
      where: { id: parseInt(id) },
    });

    // บันทึกประวัติการแก้ไข
    try {
      await prisma.editHistory.create({
        data: {
          page: "experience",
          section: oldExperience.title,
          action: "delete",
          oldValue: JSON.stringify(oldExperience),
          newValue: null,
        },
      });
    } catch (historyError) {
      console.error("Error logging edit history:", historyError);
    }

    return NextResponse.json({ 
      success: true, 
      message: "ลบประสบการณ์สำเร็จ" 
    });
  } catch (error) {
    console.error("Error deleting experience:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบประสบการณ์" },
      { status: 500 }
    );
  }
}
