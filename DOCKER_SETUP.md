# 🐳 Docker Setup Guide

## 📋 สิ่งที่สร้างแล้ว

✅ **Dockerfile** - สำหรับ Build Next.js Application  
✅ **.dockerignore** - ไฟล์ที่ไม่ต้อง Copy เข้า Docker  
✅ **docker-compose.yml** - จัดการ MySQL + Next.js  
✅ **prisma/seed.ts** - Seed ข้อมูลเริ่มต้น  
✅ **next.config.ts** - เพิ่ม `output: 'standalone'`  
✅ **package.json** - เพิ่ม seed script  

---

## 🚀 วิธีใช้งาน

### **1. ติดตั้ง tsx (จำเป็นสำหรับ seed script)**

```bash
npm install -D tsx
```

### **2. Build และรัน Docker**

```bash
# Build และรันทั้งหมด
docker-compose up --build

# หรือรันแบบ Background
docker-compose up -d --build
```

### **3. รอจนกว่า Database จะพร้อม**

คุณจะเห็น Log:
```
profile_db   | ready for connections
profile_web  | 🌱 Starting database seeding...
profile_web  | ✅ Created profile: เกรียงไกร ภูทองก้าน
profile_web  | 🎉 Database seeding completed successfully!
profile_web  | Listening on port 3000
```

### **4. เปิดเว็บไซต์**

```
http://localhost:3000       # หน้าเว็บหลัก
http://localhost:3000/admin # หน้า Admin
```

---

## 🔧 คำสั่งที่มีประโยชน์

### **ดู Logs**
```bash
# ดู Logs ทั้งหมด
docker-compose logs -f

# ดู Logs เฉพาะ Web
docker-compose logs -f web

# ดู Logs เฉพาะ Database
docker-compose logs -f db
```

### **Restart Services**
```bash
# Restart Web
docker-compose restart web

# Restart Database
docker-compose restart db

# Restart ทั้งหมด
docker-compose restart
```

### **Stop และ Start**
```bash
# Stop ทั้งหมด
docker-compose down

# Stop และลบข้อมูล Database
docker-compose down -v

# Start อีกครั้ง (ไม่ Build ใหม่)
docker-compose up -d
```

### **เข้า Container**
```bash
# เข้า Web Container
docker exec -it profile_web sh

# เข้า Database Container
docker exec -it profile_db bash

# เข้า MySQL Console
docker exec -it profile_db mysql -u profile_user -p
# Password: profile_password
```

### **ดูข้อมูลใน Database**
```bash
docker exec -it profile_db mysql -u profile_user -pprofile_password -e "USE profile_db; SHOW TABLES;"
```

---

## 🗄️ ข้อมูล Database

**Host:** localhost  
**Port:** 3306  
**Database:** profile_db  
**User:** profile_user  
**Password:** profile_password  
**Root Password:** rootpassword  

**Connection String:**
```
mysql://profile_user:profile_password@localhost:3306/profile_db
```

---

## 📦 Volumes

ข้อมูล Database จะถูกเก็บใน Docker Volume ชื่อ `mysql_data`

### ดู Volumes
```bash
docker volume ls
```

### ลบ Volume (ลบข้อมูลทั้งหมด)
```bash
docker-compose down -v
```

---

## 🐛 Troubleshooting

### **1. Port ซ้ำ (Port already in use)**
```bash
# ตรวจสอบ Process ที่ใช้ Port 3000
lsof -ti:3000

# Kill Process
kill -9 $(lsof -ti:3000)

# หรือเปลี่ยน Port ใน docker-compose.yml
ports:
  - "3001:3000"  # เปลี่ยนจาก 3000:3000
```

### **2. Database ไม่พร้อม**
```bash
# ดู Logs ของ Database
docker-compose logs db

# Restart Database
docker-compose restart db
```

### **3. Build ใหม่ทั้งหมด**
```bash
# ลบทุกอย่างและ Build ใหม่
docker-compose down -v
docker-compose up --build
```

### **4. ดู Health Status**
```bash
docker-compose ps
```

---

## 🔄 Update Code

เมื่อแก้ไขโค้ด:

```bash
# 1. Stop Container
docker-compose down

# 2. Build ใหม่
docker-compose up --build

# หรือแบบเดียว
docker-compose up -d --build
```

---

## 🎯 Production Tips

### **1. ใช้ Environment Variables**
สร้างไฟล์ `.env.production`:
```env
DATABASE_URL=mysql://user:password@host:3306/db
NODE_ENV=production
```

### **2. ใช้ Secrets สำหรับ Password**
ใน Production ควรใช้ Docker Secrets แทนการใส่ Password ตรงๆ

### **3. Enable HTTPS**
ใช้ Nginx หรือ Traefik เป็น Reverse Proxy

### **4. Backup Database**
```bash
# Export Database
docker exec profile_db mysqldump -u profile_user -pprofile_password profile_db > backup.sql

# Import Database
docker exec -i profile_db mysql -u profile_user -pprofile_password profile_db < backup.sql
```

---

## 📝 สิ่งที่ต้องทำเพิ่มเติม

- [ ] ติดตั้ง tsx: `npm install -D tsx`
- [ ] รัน Docker: `docker-compose up --build`
- [ ] รอจนเว็บพร้อม
- [ ] เปิดเบราว์เซอร์: `http://localhost:3000`
- [ ] Login Admin: `http://localhost:3000/admin/login`

---

## 🎉 เสร็จแล้ว!

เว็บไซต์ของคุณพร้อมใช้งานบน Docker แล้ว! 🚀

**หมายเหตุ:** 
- ข้อมูลจะถูก Seed อัตโนมัติเมื่อรันครั้งแรก
- ถ้าต้องการ Seed ใหม่ ให้ลบ Volume: `docker-compose down -v`

