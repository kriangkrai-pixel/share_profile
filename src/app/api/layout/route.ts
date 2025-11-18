import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Enable caching
export const revalidate = 60; // Cache for 60 seconds

// GET - ดึง layout ที่ active (with caching)
export async function GET() {
  try {
    const layout = await prisma.layout.findFirst({
      where: { isActive: true },
      include: {
        widgets: {
          where: { isVisible: true }, // Only fetch visible widgets
          orderBy: { order: "asc" },
          select: {
            id: true,
            type: true,
            title: true,
            content: true,
            imageUrl: true,
            x: true,
            y: true,
            w: true,
            h: true,
            order: true,
            isVisible: true,
            settings: true,
          },
        },
      },
    });

    if (!layout) {
      // สร้าง default layout ถ้ายังไม่มี
      const defaultLayout = await prisma.layout.create({
        data: {
          name: "Default Layout",
          isActive: true,
          widgets: {
            create: [
              {
                type: "hero",
                title: "Hero Section",
                x: 0,
                y: 0,
                w: 12,
                h: 6,
                order: 0,
                isVisible: true,
              },
              {
                type: "about",
                title: "About Section",
                x: 0,
                y: 6,
                w: 12,
                h: 4,
                order: 1,
                isVisible: true,
              },
              {
                type: "education",
                title: "Education & Experience",
                x: 0,
                y: 10,
                w: 12,
                h: 5,
                order: 2,
                isVisible: true,
              },
              {
                type: "portfolio",
                title: "Portfolio",
                x: 0,
                y: 15,
                w: 12,
                h: 4,
                order: 3,
                isVisible: true,
              },
              {
                type: "contact",
                title: "Contact",
                x: 0,
                y: 19,
                w: 12,
                h: 5,
                order: 4,
                isVisible: true,
              },
            ],
          },
        },
        include: {
          widgets: {
            orderBy: { order: "asc" },
          },
        },
      });
      return NextResponse.json(defaultLayout);
    }

    return NextResponse.json(layout);
  } catch (error) {
    console.error("Error fetching layout:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ 
      error: "Failed to fetch layout",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// PUT - อัปเดต layout
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, widgets } = body;

    const updatedLayout = await prisma.layout.update({
      where: { id },
      data: {
        name,
        updatedAt: new Date(),
      },
      include: {
        widgets: true,
      },
    });

    // อัปเดต widgets ถ้ามี
    if (widgets && Array.isArray(widgets)) {
      for (const widget of widgets) {
        if (widget.id) {
          await prisma.widget.update({
            where: { id: widget.id },
            data: {
              x: widget.x,
              y: widget.y,
              w: widget.w,
              h: widget.h,
              order: widget.order,
              isVisible: widget.isVisible,
              title: widget.title,
              content: widget.content,
              imageUrl: widget.imageUrl,
              settings: widget.settings,
            },
          });
        }
      }
    }

    // ดึงข้อมูลที่อัปเดตแล้ว
    const finalLayout = await prisma.layout.findUnique({
      where: { id },
      include: {
        widgets: {
          orderBy: { order: "asc" },
        },
      },
    });

    return NextResponse.json(finalLayout);
  } catch (error) {
    console.error("Error updating layout:", error);
    return NextResponse.json({ error: "Failed to update layout" }, { status: 500 });
  }
}

// POST - สร้าง layout ใหม่
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    const newLayout = await prisma.layout.create({
      data: {
        name: name || "New Layout",
        isActive: false,
      },
      include: {
        widgets: true,
      },
    });

    return NextResponse.json(newLayout);
  } catch (error) {
    console.error("Error creating layout:", error);
    return NextResponse.json({ error: "Failed to create layout" }, { status: 500 });
  }
}

