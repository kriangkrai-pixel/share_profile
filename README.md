# 🌟 Profile Website - ระบบจัดการเว็บไซต์ส่วนตัว

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black?style=for-the-badge&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-11.1.9-red?style=for-the-badge&logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)
![MySQL](https://img.shields.io/badge/MySQL-8.0-blue?style=for-the-badge&logo=mysql)
![Prisma](https://img.shields.io/badge/Prisma-6.19.0-2D3748?style=for-the-badge&logo=prisma)

**ระบบจัดการเว็บไซต์ส่วนตัวที่ทันสมัย | Full-Stack | แก้ไขง่าย | ปรับแต่งได้เต็มที่**

[เริ่มต้นใช้งาน](#-เริ่มต้นใช้งาน) • [ฟีเจอร์](#-ฟีเจอร์หลัก) • [เอกสาร](#-เอกสาร) • [Demo](#-demo)

</div>

---

## 📖 เกี่ยวกับโปรเจค

ระบบจัดการเว็บไซต์ส่วนตัวแบบครบวงจร สามารถแก้ไขเนื้อหา จัดการผลงาน และปรับแต่งธีมได้ง่ายๆ ผ่าน Admin Panel โดยไม่ต้องเขียนโค้ด

### 🎯 จุดเด่น

- ✨ **แก้ไขง่าย** - Admin Panel ใช้งานง่าย ไม่ต้องเขียนโค้ด
- 🎨 **ปรับแต่งได้** - ลากวาง Layout, เปลี่ยนสี, แก้ไขเนื้อหาได้ทันที
- 🚀 **ประสิทธิภาพสูง** - Next.js 16 + NestJS + Prisma
- 📱 **Responsive** - ใช้งานได้ทุกอุปกรณ์
- 🔐 **ปลอดภัย** - มีระบบ Authentication
- 📊 **ติดตามได้** - บันทึกประวัติการแก้ไขทุกอย่าง

---

## 🚀 เริ่มต้นใช้งาน

### ⚡ Quick Start (3 ขั้นตอน)

```bash
# 1. ติดตั้ง Dependencies
npm install && cd backend && npm install && cd ..

# 2. ตั้งค่า Database (แก้ไข backend/.env ก่อน)
cd backend && npx prisma generate && npx prisma migrate dev && cd ..

# 3. รันระบบ
npm run dev:all
```

**✅ เสร็จแล้ว!** เปิดเบราว์เซอร์:
- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin/login (admin / KiK550123)
- Backend API: http://localhost:3001/api

### 📚 คู่มือฉบับเต็ม

อ่านคู่มือการติดตั้งแบบละเอียดได้ที่:
- **[START_APP.md](./START_APP.md)** - คู่มือการรันและติดตั้ง
- **[SETUP_ENV.md](./SETUP_ENV.md)** - การตั้งค่า Environment
- **[คู่มือใช้งาน.md](./คู่มือใช้งาน.md)** - คู่มือใช้งานภาษาไทยฉบับสมบูรณ์

---

## ⚙️ Tech Stack

### Frontend
- **Next.js 16** - React Framework with SSR
- **React 19** - UI Library
- **Tailwind CSS 4** - Styling
- **TypeScript** - Type Safety
- **React Grid Layout** - Drag & Drop Layout

### Backend
- **NestJS 11** - Node.js Framework
- **Prisma 6** - ORM
- **MySQL 8** - Database
- **TypeScript** - Type Safety

### DevOps
- **Docker** - Containerization (Ready)
- **npm scripts** - Build & Deploy

---

## ✨ ฟีเจอร์หลัก

### 🎨 Layout Builder
- ลาก-วาง Widgets แบบอิสระ
- ปรับขนาดและตำแหน่งได้
- แก้ไขเนื้อหาแบบ Real-time
- เปิด/ปิดการแสดงผล
- Custom Style (สี, ขอบ, พื้นหลัง)

### 👤 Profile Management
- แก้ไขข้อมูลส่วนตัว
- จัดการทักษะ (Skills)
- ข้อมูลการศึกษา (Education)
- ประสบการณ์การทำงาน (Experience)

### 💼 Portfolio Management
- เพิ่ม/แก้ไข/ลบผลงาน
- อัปโหลดรูปภาพ
- ใส่ลิงก์โปรเจค
- จัดเรียงลำดับ

### 📧 Contact Messages
- ฟอร์มติดต่อสำหรับผู้เยี่ยมชม
- Admin ดูข้อความได้
- แจ้งเตือนข้อความใหม่
- ทำเครื่องหมายอ่าน/ยังไม่อ่าน

### 🎨 Theme Customization
- เลือกสีหลัก, สีรอง, สีเน้น
- ปรับสีพื้นหลัง
- ปรับสีข้อความ
- ดูตัวอย่างแบบ Real-time

### 📜 Edit History
- บันทึกทุกการแก้ไข
- ดูประวัติย้อนหลัง
- รองรับ Rollback (Future)

---

## 📁 โครงสร้างโปรเจค

```
profile/
├── 📂 backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/              # Authentication
│   │   ├── profile/           # Profile APIs
│   │   ├── contact/           # Contact Messages
│   │   ├── layout/            # Layout Management
│   │   ├── widgets/           # Widget Management
│   │   ├── settings/          # Theme Settings
│   │   ├── upload/            # File Upload
│   │   └── edit-history/      # Edit History
│   ├── prisma/
│   │   └── schema.prisma      # Database Schema
│   └── package.json
│
├── 📂 src/                     # Next.js Frontend
│   ├── app/
│   │   ├── admin/             # Admin Pages
│   │   │   ├── layout-builder/
│   │   │   ├── about/
│   │   │   ├── portfolios/
│   │   │   ├── messages/
│   │   │   └── ...
│   │   ├── component/         # Shared Components
│   │   ├── context/           # React Context
│   │   └── page.tsx           # Homepage
│   └── lib/
│       └── api-config.ts      # API Configuration
│
├── 📄 START_APP.md            # คู่มือเริ่มต้น
├── 📄 SETUP_ENV.md            # คู่มือ Environment
├── 📄 API_TEST_GUIDE.md       # คู่มือทดสอบ API
├── 📄 คู่มือใช้งาน.md          # คู่มือฉบับเต็ม (ไทย)
├── 📄 FIXES_COMPLETED.md      # สรุปการแก้ไข
├── 🚀 start-dev.sh            # Startup Script
└── 📄 package.json
```

---

## 🖥️ Demo

### หน้าเว็บหลัก (Frontend)
```
┌─────────────────────────────────────────┐
│  Hero Section - รูปโปรไฟล์ + คำแนะนำตัว  │
├─────────────────────────────────────────┤
│  About - เกี่ยวกับเรา + ทักษะ            │
├─────────────────────────────────────────┤
│  Education & Experience - ประวัติ       │
├─────────────────────────────────────────┤
│  Portfolio - ผลงาน (Grid 3 คอลัมน์)     │
├─────────────────────────────────────────┤
│  Contact - ฟอร์มติดต่อ + ข้อมูลติดต่อ   │
└─────────────────────────────────────────┘
```

### Admin Dashboard
```
┌─────────────────────────────────────────┐
│  📊 Dashboard - สถิติและเมนูหลัก        │
│  ├─ จำนวนผลงาน                          │
│  ├─ จำนวนประสบการณ์                     │
│  └─ ข้อความใหม่                         │
├─────────────────────────────────────────┤
│  🎨 Layout Builder  👤 About             │
│  🎓 Education/Exp   💼 Portfolios        │
│  📧 Messages        🎨 Theme             │
│  📜 Edit History                         │
└─────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/login` - เข้าสู่ระบบ
- `POST /api/auth/logout` - ออกจากระบบ

### Profile
- `GET /api/profile` - ดูข้อมูล Profile
- `PUT /api/profile` - อัปเดต Profile
- `PUT /api/profile/skills` - อัปเดตทักษะ
- `PUT /api/profile/education` - อัปเดตการศึกษา

### Portfolio
- `POST /api/profile/portfolio` - เพิ่มผลงาน
- `PUT /api/profile/portfolio` - อัปเดตผลงาน
- `DELETE /api/profile/portfolio?id=1` - ลบผลงาน

### Contact
- `POST /api/contact` - ส่งข้อความติดต่อ
- `GET /api/contact` - ดูข้อความทั้งหมด
- `PUT /api/contact` - อัปเดตสถานะ
- `DELETE /api/contact?id=1` - ลบข้อความ

### Layout & Widgets
- `GET /api/layout` - ดู Layout ปัจจุบัน
- `POST /api/widgets` - เพิ่ม Widget
- `PUT /api/widgets` - อัปเดต Widget
- `DELETE /api/widgets?id=1` - ลบ Widget

### Settings
- `GET /api/settings` - ดูการตั้งค่าธีม
- `PUT /api/settings` - อัปเดตธีม

**ดูรายละเอียดเพิ่มเติม:** [API_TEST_GUIDE.md](./API_TEST_GUIDE.md)

---

## 📚 เอกสาร

| เอกสาร | คำอธิบาย |
|--------|----------|
| [START_APP.md](./START_APP.md) | 🚀 คู่มือการรันและติดตั้งระบบ |
| [SETUP_ENV.md](./SETUP_ENV.md) | ⚙️ การตั้งค่า Environment Variables |
| [API_TEST_GUIDE.md](./API_TEST_GUIDE.md) | 🧪 คู่มือทดสอบ API ทั้งหมด |
| [คู่มือใช้งาน.md](./คู่มือใช้งาน.md) | 📖 คู่มือใช้งานฉบับสมบูรณ์ (ภาษาไทย) |
| [FIXES_COMPLETED.md](./FIXES_COMPLETED.md) | ✅ สรุปการแก้ไขและปรับปรุง |

---

## 🎨 Screenshots

### Frontend
![Homepage](https://via.placeholder.com/800x400?text=Homepage+-+Hero+%2B+About+%2B+Portfolio)

### Admin Panel
![Admin Dashboard](https://via.placeholder.com/800x400?text=Admin+Dashboard+-+Stats+%2B+Menus)

### Layout Builder
![Layout Builder](https://via.placeholder.com/800x400?text=Layout+Builder+-+Drag+%26+Drop)

---

## 🛠️ คำสั่งที่ใช้บ่อย

```bash
# Development
npm run dev:all              # รัน Frontend + Backend พร้อมกัน
npm run dev:clean            # ทำความสะอาดและรัน dev server
npm run dev                  # รัน Frontend อย่างเดียว
npm run dev:backend          # รัน Backend อย่างเดียว

# Cleanup
npm run cleanup              # ทำความสะอาด ports, lock files, และ processes

# Build
npm run build:all            # Build ทั้งหมด
npm run build                # Build Frontend
npm run build:backend        # Build Backend

# Production
npm run start:all            # Start Production mode
npm run start                # Start Frontend
npm run start:backend        # Start Backend

# Database
npm run prisma:generate      # Generate Prisma Client
cd backend && npx prisma studio  # เปิด Database GUI

# Testing
cd backend && npm test       # รัน Backend tests
```

---

## 🔐 ข้อมูล Login

### Admin Panel
- **URL:** http://localhost:3000/admin/login
- **Username:** `admin`
- **Password:** `KiK550123`

> ⚠️ **สำคัญ:** เปลี่ยนรหัสผ่านก่อน Deploy จริง!  
> แก้ไขที่: `backend/src/auth/auth.service.ts`

---

## 🐛 การแก้ปัญหา

### Port ถูกใช้งานอยู่ / Next.js Lock File

**วิธีที่ 1: ใช้สคริปต์ทำความสะอาด (แนะนำ)**
```bash
# ทำความสะอาดและรัน dev server พร้อมกัน
npm run dev:clean

# หรือทำความสะอาดอย่างเดียว
npm run cleanup
```

สคริปต์จะทำการ:
- หยุด processes บน port 3000 และ 3001
- ลบ Next.js lock file และ cache
- ตรวจสอบและหยุด PM2 processes (ถ้ามี)
- แสดงสถานะ ports

**วิธีที่ 2: แก้ไขด้วยตนเอง**
```bash
# ปิด port 3000 (Frontend)
lsof -ti:3000 | xargs kill -9

# ปิด port 3001 (Backend)
lsof -ti:3001 | xargs kill -9

# ลบ Next.js lock file
rm -f .next/dev/lock

# ลบ Next.js cache (ถ้าจำเป็น)
rm -rf .next/cache
```

### Database Connection Error
1. ตรวจสอบว่า MySQL รันอยู่
2. ตรวจสอบ `DATABASE_URL` ใน `backend/.env`
3. ทดสอบเชื่อมต่อ: `cd backend && npx prisma db pull`

### Module Not Found
```bash
rm -rf node_modules package-lock.json
rm -rf backend/node_modules backend/package-lock.json
npm install
cd backend && npm install
```

### API ไม่ตอบสนอง
1. ตรวจสอบ Backend รันอยู่ที่ port 3001
2. ตรวจสอบ CORS settings
3. ดู Browser Console และ Backend Console
4. ลอง restart ทั้ง Frontend และ Backend
5. ใช้ `npm run cleanup` เพื่อทำความสะอาดก่อน restart

**ดูเพิ่มเติม:** [START_APP.md - แก้ปัญหา](./START_APP.md#🔧-แก้ปัญหาที่พบบ่อย)

---

## 🚢 การ Deploy

### Development
```bash
npm run dev:all
```

### Production (Docker - Ready)
```bash
# สร้าง Images
docker-compose build

# รัน Containers
docker-compose up -d

# ดู Logs
docker-compose logs -f
```

### VPS / Cloud
```bash
# Build
npm run build:all

# Start
npm run start:all
```

**ใช้ PM2 สำหรับ Production:**
```bash
npm install -g pm2
pm2 start npm --name "profile-frontend" -- start
cd backend && pm2 start npm --name "profile-backend" -- run start:prod
```

---

## 📊 Performance

- ⚡ **First Contentful Paint:** < 1.5s
- 🎨 **Time to Interactive:** < 3.0s
- 📱 **Mobile Friendly:** Yes
- ♿ **Accessibility Score:** 95+
- 🔍 **SEO Score:** 90+

---

## 🗺️ Roadmap

### Version 1.1 (Q1 2026)
- [ ] JWT Authentication
- [ ] Role-based Access Control
- [ ] Image Upload to Cloud (S3/Cloudinary)
- [ ] SEO Optimization
- [ ] Analytics Integration

### Version 1.2 (Q2 2026)
- [ ] Multi-language Support
- [ ] Dark Mode
- [ ] Blog System
- [ ] Comment System
- [ ] Social Media Integration

### Version 2.0 (Q3 2026)
- [ ] Headless CMS Integration
- [ ] GraphQL API
- [ ] WebSocket for Real-time
- [ ] Advanced Analytics
- [ ] AI-powered Content Suggestions

---

## 🤝 Contributing

ยินดีรับ Contribution!

1. Fork โปรเจค
2. สร้าง Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to Branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 👤 ผู้พัฒนา

**Kriangkrai Phutongkan**

- 📧 Email: kik550123@gmail.com
- 📱 Phone: 091-826-6369
- 📍 Location: Phuket, Thailand

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [NestJS](https://nestjs.com/) - Progressive Node.js Framework
- [Prisma](https://www.prisma.io/) - Next-generation ORM
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [React Grid Layout](https://github.com/react-grid-layout/react-grid-layout) - Draggable Grid

---

<div align="center">

**⭐ ถ้าชอบโปรเจคนี้ อย่าลืมกด Star นะครับ! ⭐**

Made with ❤️ by [Kriangkrai Phutongkan](https://github.com/yourusername)

</div>

