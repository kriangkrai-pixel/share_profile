/**
 * Script สำหรับตรวจสอบและแก้ไข Widget Settings ที่ไม่ถูกต้อง
 * 
 * วิธีใช้:
 * npx tsx scripts/fix-widget-settings.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function fixWidgetSettings() {
  console.log("🔍 กำลังตรวจสอบ Widget Settings...\n");

  try {
    // ดึง Widget ทั้งหมด
    const widgets = await prisma.widget.findMany({
      select: {
        id: true,
        type: true,
        settings: true,
      },
    });

    console.log(`📊 พบ Widget ทั้งหมด: ${widgets.length} รายการ\n`);

    let fixedCount = 0;
    let invalidCount = 0;

    for (const widget of widgets) {
      // ถ้า settings เป็น null หรือ empty string ให้ข้าม
      if (!widget.settings || widget.settings.trim() === "") {
        continue;
      }

      try {
        // ลอง parse settings
        const trimmed = widget.settings.trim();
        
        // ตรวจสอบว่าเป็น JSON format หรือไม่
        if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
          console.log(`❌ Widget ID ${widget.id} (${widget.type}): Invalid format - "${widget.settings}"`);
          invalidCount++;
          
          // แก้ไขเป็น null
          await prisma.widget.update({
            where: { id: widget.id },
            data: { settings: null },
          });
          
          console.log(`   ✅ แก้ไขเป็น null แล้ว\n`);
          fixedCount++;
          continue;
        }

        // ลอง parse
        const parsed = JSON.parse(trimmed);
        
        // ตรวจสอบว่าเป็น Object หรือไม่
        if (typeof parsed !== "object" || parsed === null) {
          console.log(`❌ Widget ID ${widget.id} (${widget.type}): Not an object - ${typeof parsed}`);
          invalidCount++;
          
          await prisma.widget.update({
            where: { id: widget.id },
            data: { settings: null },
          });
          
          console.log(`   ✅ แก้ไขเป็น null แล้ว\n`);
          fixedCount++;
        } else {
          console.log(`✅ Widget ID ${widget.id} (${widget.type}): Valid JSON`);
        }
      } catch (error) {
        console.log(`❌ Widget ID ${widget.id} (${widget.type}): Parse Error`);
        console.log(`   Settings: "${widget.settings}"`);
        console.log(`   Error: ${error}`);
        invalidCount++;
        
        // แก้ไขเป็น null
        await prisma.widget.update({
          where: { id: widget.id },
          data: { settings: null },
        });
        
        console.log(`   ✅ แก้ไขเป็น null แล้ว\n`);
        fixedCount++;
      }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`📊 สรุปผลการตรวจสอบ:`);
    console.log(`   - Widget ทั้งหมด: ${widgets.length}`);
    console.log(`   - พบปัญหา: ${invalidCount}`);
    console.log(`   - แก้ไขแล้ว: ${fixedCount}`);
    console.log("=".repeat(50));

    if (fixedCount > 0) {
      console.log("\n✅ แก้ไขข้อมูลเสร็จสมบูรณ์!");
      console.log("💡 รีเฟรชหน้าเว็บเพื่อดูผลลัพธ์\n");
    } else {
      console.log("\n✅ ไม่พบปัญหา ข้อมูลถูกต้องทั้งหมด!\n");
    }
  } catch (error) {
    console.error("❌ เกิดข้อผิดพลาด:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// รัน script
fixWidgetSettings();

