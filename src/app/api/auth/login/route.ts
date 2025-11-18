import { NextRequest, NextResponse } from "next/server";

// สำหรับ demo ใช้ hardcoded credentials
// ใน production ควรเก็บใน database และ hash password
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "KiK550123";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" },
        { status: 400 }
      );
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      // สร้าง token แบบง่ายๆ (ใน production ควรใช้ JWT)
      const token = Buffer.from(`${username}:${Date.now()}`).toString("base64");
      
      return NextResponse.json({
        success: true,
        token,
        message: "เข้าสู่ระบบสำเร็จ",
      });
    } else {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ" },
      { status: 500 }
    );
  }
}

