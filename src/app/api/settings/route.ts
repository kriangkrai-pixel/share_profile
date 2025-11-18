import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Enable caching
export const revalidate = 60; // Cache for 60 seconds

// GET - ดึงการตั้งค่าปัจจุบัน
export async function GET() {
  try {
    let settings = await prisma.siteSettings.findFirst();

    // ถ้ายังไม่มีการตั้งค่า สร้างใหม่ด้วยค่าเริ่มต้น
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          primaryColor: "#3b82f6",
          secondaryColor: "#8b5cf6",
          accentColor: "#10b981",
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          headerBgColor: "#ffffff",
          footerBgColor: "#1f2937",
        },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการดึงข้อมูล" },
      { status: 500 }
    );
  }
}

// PUT - อัปเดตการตั้งค่า
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      headerBgColor,
      footerBgColor,
    } = body;

    // ดึงการตั้งค่าปัจจุบัน
    let settings = await prisma.siteSettings.findFirst();

    if (!settings) {
      // สร้างใหม่ถ้ายังไม่มี
      settings = await prisma.siteSettings.create({
        data: {
          primaryColor: primaryColor || "#3b82f6",
          secondaryColor: secondaryColor || "#8b5cf6",
          accentColor: accentColor || "#10b981",
          backgroundColor: backgroundColor || "#ffffff",
          textColor: textColor || "#1f2937",
          headerBgColor: headerBgColor || "#ffffff",
          footerBgColor: footerBgColor || "#1f2937",
        },
      });
    } else {
      // อัปเดตค่าที่มีอยู่
      const updateData: any = {};
      if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
      if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
      if (accentColor !== undefined) updateData.accentColor = accentColor;
      if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
      if (textColor !== undefined) updateData.textColor = textColor;
      if (headerBgColor !== undefined) updateData.headerBgColor = headerBgColor;
      if (footerBgColor !== undefined) updateData.footerBgColor = footerBgColor;

      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการอัปเดต" },
      { status: 500 }
    );
  }
}

