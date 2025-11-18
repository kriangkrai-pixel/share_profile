import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// POST - บันทึกข้อความติดต่อจากหน้าเว็บ
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลให้ครบถ้วน" },
        { status: 400 }
      );
    }

    const contactMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        message,
      },
    });

    return NextResponse.json({
      success: true,
      message: "บันทึกข้อความเรียบร้อยแล้ว",
      data: contactMessage,
    });
  } catch (error) {
    console.error("Error creating contact message:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการบันทึกข้อความ" },
      { status: 500 }
    );
  }
}

// GET - ดึงข้อความทั้งหมด (สำหรับ Admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const messages = await prisma.contactMessage.findMany({
      where: unreadOnly ? { isRead: false } : undefined,
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตสถานะข้อความ (อ่านแล้ว/ยังไม่อ่าน)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, isRead } = body;

    if (!id || isRead === undefined) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID และสถานะ" },
        { status: 400 }
      );
    }

    const updated = await prisma.contactMessage.update({
      where: { id: parseInt(id) },
      data: { isRead },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating message:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดต" },
      { status: 500 }
    );
  }
}

// DELETE - ลบข้อความ
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "กรุณาระบุ ID" },
        { status: 400 }
      );
    }

    await prisma.contactMessage.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการลบ" },
      { status: 500 }
    );
  }
}

