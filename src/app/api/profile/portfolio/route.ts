import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - เพิ่มผลงานใหม่
export async function POST(request: NextRequest) {
  try {
    const { title, description, image, link } = await request.json();

    let profile = await prisma.profile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลโปรไฟล์" },
        { status: 404 }
      );
    }

    const portfolio = await prisma.portfolio.create({
      data: {
        title,
        description,
        image,
        link,
        profileId: profile.id,
      },
    });

    return NextResponse.json({ success: true, portfolio });
  } catch (error) {
    console.error("Error creating portfolio:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเพิ่มผลงาน" },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตผลงานทั้งหมด
export async function PUT(request: NextRequest) {
  try {
    const { portfolios } = await request.json();

    let profile = await prisma.profile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลโปรไฟล์" },
        { status: 404 }
      );
    }

    // บันทึกค่าเก่าก่อนลบ
    const oldPortfolios = await prisma.portfolio.findMany({
      where: { profileId: profile.id },
    });

    // ลบผลงานเดิมทั้งหมด
    await prisma.portfolio.deleteMany({
      where: { profileId: profile.id },
    });

    // เพิ่มผลงานใหม่ทั้งหมด
    if (portfolios && portfolios.length > 0) {
      await prisma.portfolio.createMany({
        data: portfolios.map((port: any) => ({
          title: port.title,
          description: port.description,
          image: port.image,
          link: port.link,
          profileId: profile.id,
        })),
      });
    }

    // บันทึกประวัติการแก้ไข
    try {
      await prisma.editHistory.create({
        data: {
          page: "portfolio",
          section: "all",
          action: "update",
          oldValue: JSON.stringify(oldPortfolios),
          newValue: JSON.stringify(portfolios || []),
        },
      });
    } catch (historyError) {
      console.error("Error logging edit history:", historyError);
    }

    return NextResponse.json({ success: true, message: "อัปเดตผลงานสำเร็จ" });
  } catch (error) {
    console.error("Error updating portfolios:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดตผลงาน" },
      { status: 500 }
    );
  }
}

// DELETE - ลบผลงาน
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID ผลงาน" },
        { status: 400 }
      );
    }

    // ดึงข้อมูลผลงานก่อนลบ (สำหรับ edit history)
    const portfolio = await prisma.portfolio.findUnique({
      where: { id: parseInt(id) },
    });

    if (!portfolio) {
      return NextResponse.json(
        { error: "ไม่พบผลงานที่ต้องการลบ" },
        { status: 404 }
      );
    }

    // ลบผลงาน
    await prisma.portfolio.delete({
      where: { id: parseInt(id) },
    });

    // บันทึกประวัติการแก้ไข
    try {
      await prisma.editHistory.create({
        data: {
          page: "portfolio",
          section: "item",
          action: "delete",
          oldValue: JSON.stringify(portfolio),
          newValue: JSON.stringify({ deleted: true }),
        },
      });
    } catch (historyError) {
      console.error("Error logging edit history:", historyError);
    }

    return NextResponse.json({ 
      success: true, 
      message: "ลบผลงานสำเร็จ" 
    });
  } catch (error) {
    console.error("Error deleting portfolio:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบผลงาน" },
      { status: 500 }
    );
  }
}
