#!/bin/bash

echo "🔧 ตั้งค่าฐานข้อมูล Profile Database"
echo ""

# ตรวจสอบว่ามีไฟล์ .env หรือไม่
if [ ! -f .env ]; then
    echo "❌ ไม่พบไฟล์ .env"
    echo "📝 กำลังสร้างไฟล์ .env..."
    cat > .env << 'ENVEOF'
DATABASE_URL="mysql://root:password@localhost:3306/profile_db"
PORT=3001
FRONTEND_URL=http://localhost:3000
ENVEOF
    echo "✅ สร้างไฟล์ .env แล้ว"
    echo "⚠️  กรุณาแก้ไขไฟล์ .env และใส่รหัสผ่าน MySQL ที่ถูกต้อง"
    echo ""
fi

# อ่าน DATABASE_URL จาก .env
if [ -f .env ]; then
    DB_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')
    echo "📋 DATABASE_URL: $DB_URL"
    echo ""
fi

echo "📝 ขั้นตอนต่อไป:"
echo "1. แก้ไขไฟล์ .env และใส่รหัสผ่าน MySQL ที่ถูกต้อง"
echo "2. สร้างฐานข้อมูล: mysql -u root -p -e \"CREATE DATABASE IF NOT EXISTS profile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
echo "3. รัน migrations: npx prisma migrate deploy"
echo "4. Generate Prisma client: npx prisma generate"
echo ""
