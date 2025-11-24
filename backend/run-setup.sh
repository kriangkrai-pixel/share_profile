#!/bin/bash

echo "🚀 เริ่มตั้งค่าฐานข้อมูล..."
echo ""

# ตรวจสอบไฟล์ .env
if [ ! -f .env ]; then
    echo "❌ ไม่พบไฟล์ .env"
    exit 1
fi

echo "✅ พบไฟล์ .env"
echo ""

# Generate Prisma Client
echo "📦 กำลัง generate Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Generate Prisma Client ล้มเหลว"
    exit 1
fi

echo "✅ Generate Prisma Client สำเร็จ"
echo ""

# Run migrations
echo "🔄 กำลังรัน migrations..."
npx prisma migrate deploy

if [ $? -ne 0 ]; then
    echo "❌ Migration ล้มเหลว"
    echo "💡 ตรวจสอบว่า:"
    echo "   1. ฐานข้อมูล profile_db ถูกสร้างแล้ว"
    echo "   2. รหัสผ่านในไฟล์ .env ถูกต้อง"
    echo "   3. MySQL server กำลังทำงานอยู่"
    exit 1
fi

echo "✅ Migrations สำเร็จ"
echo ""
echo "🎉 ตั้งค่าฐานข้อมูลเสร็จสมบูรณ์!"
