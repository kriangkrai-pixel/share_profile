import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - ดึง widgets ทั้งหมดของ layout
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const layoutId = searchParams.get("layoutId");

    if (!layoutId) {
      return NextResponse.json({ error: "layoutId is required" }, { status: 400 });
    }

    const widgets = await prisma.widget.findMany({
      where: { layoutId: parseInt(layoutId) },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(widgets);
  } catch (error) {
    console.error("Error fetching widgets:", error);
    return NextResponse.json({ error: "Failed to fetch widgets" }, { status: 500 });
  }
}

// POST - สร้าง widget ใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { layoutId, type, title, content, imageUrl, x, y, w, h, order, settings } = body;

    if (!layoutId || !type) {
      return NextResponse.json(
        { error: "layoutId and type are required" },
        { status: 400 }
      );
    }

    const newWidget = await prisma.widget.create({
      data: {
        layoutId: parseInt(layoutId),
        type,
        title,
        content,
        imageUrl,
        x: x || 0,
        y: y || 0,
        w: w || 6,
        h: h || 4,
        order: order || 0,
        isVisible: true,
        settings,
      },
    });

    return NextResponse.json(newWidget);
  } catch (error) {
    console.error("Error creating widget:", error);
    return NextResponse.json({ error: "Failed to create widget" }, { status: 500 });
  }
}

// PUT - อัปเดต widget
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const updatedWidget = await prisma.widget.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updatedWidget);
  } catch (error) {
    console.error("Error updating widget:", error);
    return NextResponse.json({ error: "Failed to update widget" }, { status: 500 });
  }
}

// DELETE - ลบ widget
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.widget.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting widget:", error);
    return NextResponse.json({ error: "Failed to delete widget" }, { status: 500 });
  }
}

