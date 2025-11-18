import { NextResponse } from "next/server";

export async function POST() {
  // ใน production อาจจะต้องลบ token จาก database
  return NextResponse.json({
    success: true,
    message: "ออกจากระบบสำเร็จ",
  });
}

