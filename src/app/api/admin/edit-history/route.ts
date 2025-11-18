import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - ดึงประวัติการแก้ไข
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    
    // ถ้าไม่ระบุ limit ให้แสดงทั้งหมด (ไม่จำกัด)
    const limit = limitParam ? parseInt(limitParam) : undefined;

    const where = page ? { page } : {};

    const history = await prisma.editHistory.findMany({
      where,
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: limit } : {}), // เพิ่ม take เฉพาะเมื่อมี limit
    });

    return NextResponse.json(history);
  } catch (error) {
    console.error("Error fetching edit history:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงประวัติการแก้ไข" },
      { status: 500 }
    );
  }
}

// POST - บันทึกประวัติการแก้ไข
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { page, section, action, oldValue, newValue, itemId } = body;

    if (!page || !action) {
      return NextResponse.json(
        { error: "กรุณาระบุ page และ action" },
        { status: 400 }
      );
    }

    const history = await prisma.editHistory.create({
      data: {
        page,
        section: section || null,
        action,
        oldValue: oldValue || null,
        newValue: newValue || null,
        itemId: itemId || null,
      },
    });

    return NextResponse.json({ success: true, history });
  } catch (error) {
    console.error("Error creating edit history:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกประวัติการแก้ไข" },
      { status: 500 }
    );
  }
}

