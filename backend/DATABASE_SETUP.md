# แก้ไขปัญหา Database Connection Error

## สาเหตุของปัญหา
- แอปพลิเคชันพยายามเชื่อมต่อฐานข้อมูลที่ `localhost:3307` แต่ไม่สามารถเชื่อมต่อได้
- ไม่มีไฟล์ `backend/.env` ที่กำหนด `DATABASE_URL`
- ฐานข้อมูล `profile_db` อาจยังไม่ถูกสร้าง

## วิธีแก้ไข

### ขั้นตอนที่ 1: ตรวจสอบไฟล์ .env
ไฟล์ `.env` ถูกสร้างแล้วที่ `backend/.env` แต่คุณต้องแก้ไขรหัสผ่าน MySQL ให้ถูกต้อง:

```env
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/profile_db"
PORT=3001
FRONTEND_URL=http://localhost:3000
```

**สำคัญ:** แทนที่ `YOUR_PASSWORD` ด้วยรหัสผ่าน MySQL root ของคุณ

### ขั้นตอนที่ 2: สร้างฐานข้อมูล
รันคำสั่งต่อไปนี้ใน terminal:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS profile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

หรือเข้า MySQL แล้วรัน:
```sql
CREATE DATABASE IF NOT EXISTS profile_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### ขั้นตอนที่ 3: รัน Migrations
หลังจากสร้างฐานข้อมูลแล้ว รันคำสั่ง:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
```

หรือใช้สคริปต์ที่สร้างไว้:
```bash
cd backend
./run-setup.sh
```

### ขั้นตอนที่ 4: ทดสอบการเชื่อมต่อ
รัน backend server:
```bash
cd backend
npm run start:dev
```

ถ้ายังมีปัญหา ตรวจสอบว่า:
1. MySQL server กำลังทำงานอยู่ (port 3306)
2. รหัสผ่านในไฟล์ `.env` ถูกต้อง
3. ฐานข้อมูล `profile_db` ถูกสร้างแล้ว

## ไฟล์ที่สร้างขึ้น
- `backend/.env` - ไฟล์ environment variables
- `backend/.env.example` - ตัวอย่างไฟล์ .env
- `backend/create-database.sql` - SQL script สำหรับสร้างฐานข้อมูล
- `backend/setup-database.sh` - สคริปต์ช่วยตั้งค่า
- `backend/run-setup.sh` - สคริปต์รัน migrations

## หมายเหตุ
- MySQL ทำงานบน port 3306 (default)
- ไฟล์ `.env` ถูก ignore โดย git เพื่อความปลอดภัย
- อย่าลืมแก้ไขรหัสผ่านในไฟล์ `.env` ก่อนรัน migrations

