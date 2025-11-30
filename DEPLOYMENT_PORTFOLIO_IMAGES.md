# 🚀 คู่มือการ Deploy - Portfolio Images (URL-based Storage)

## 📋 สรุปการเปลี่ยนแปลง

Portfolios ถูกปรับให้เก็บรูปภาพแบบ **URL/path** แทน **Base64** เพื่อ:
- ✅ ลดขนาด Database (จาก ~267KB/รูป → ~100 bytes/รูป)
- ✅ เพิ่มความเร็วในการ Query
- ✅ Backup/Restore เร็วขึ้น
- ✅ รองรับข้อมูลเก่า (Base64 เก่ายังแสดงได้)

---

## 🔧 Environment Variables ที่ต้องตั้งค่า

### Backend (.env)

```env
# DigitalOcean Spaces (S3-compatible) Configuration
DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
DO_SPACES_REGION=sgp1
DO_SPACES_KEY=your_access_key_here
DO_SPACES_SECRET=your_secret_key_here
DO_SPACES_BUCKET=your_bucket_name
DO_SPACES_PUBLIC_URL=https://your-bucket-name.sgp1.digitaloceanspaces.com
DO_SPACES_CDN_URL=https://cdn.yourdomain.com  # Optional: ถ้ามี CDN

# API Base URL (สำหรับสร้าง proxy URL)
API_BASE_URL=https://api.yourdomain.com/api
# หรือ
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### Frontend (.env.local หรือ .env)

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

---

## 📝 ขั้นตอนการ Deploy

### 1. ตั้งค่า DigitalOcean Spaces

1. สร้าง Spaces bucket ใน DigitalOcean
2. ตั้งค่าเป็น **Private** (ไม่ใช่ Public)
3. สร้าง Access Key และ Secret Key
4. ตั้งค่า CORS (ถ้าจำเป็น):
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://yourdomain.com"],
       "ExposeHeaders": [],
       "MaxAgeSeconds": 3000
     }
   ]
   ```

### 2. ตั้งค่า Environment Variables

#### Backend
```bash
# แก้ไข backend/.env
DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
DO_SPACES_REGION=sgp1
DO_SPACES_KEY=your_access_key
DO_SPACES_SECRET=your_secret_key
DO_SPACES_BUCKET=your_bucket_name
DO_SPACES_PUBLIC_URL=https://your-bucket-name.sgp1.digitaloceanspaces.com
API_BASE_URL=https://api.yourdomain.com/api
```

#### Frontend
```bash
# แก้ไข frontend/.env.local หรือ .env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
```

### 3. Build และ Deploy

```bash
# Build Backend
cd backend
npm run build

# Build Frontend
cd ../frontend
npm run build

# Deploy (ขึ้นอยู่กับ platform ที่ใช้)
# เช่น Vercel, Render, DigitalOcean App Platform, etc.
```

---

## 🔍 การตรวจสอบ

### 1. ตรวจสอบว่า S3Service ทำงาน

ดู Backend logs:
```
S3Service initialized
📡 API Base URL from environment: https://api.yourdomain.com/api
```

### 2. ทดสอบอัปโหลดรูปภาพ

1. ไปที่ `/admin/portfolios`
2. คลิก "เพิ่มผลงาน"
3. อัปโหลดรูปภาพ
4. ตรวจสอบว่า:
   - ✅ รูปภาพแสดงผลได้
   - ✅ URL เป็น proxy URL (เช่น `https://api.yourdomain.com/api/images/uploads/portfolio/...`)
   - ✅ Database เก็บ relative path (เช่น `/uploads/portfolio/image.jpg`)

### 3. ตรวจสอบ Database

```sql
-- ตรวจสอบว่า image field เก็บเป็น URL/path แทน Base64
SELECT id, title, 
       CASE 
         WHEN image LIKE 'data:%' THEN 'Base64 (เก่า)'
         WHEN image LIKE '/uploads/%' THEN 'Relative Path (ใหม่)'
         WHEN image LIKE 'http%' THEN 'Full URL (เก่า)'
         ELSE 'Unknown'
       END as image_type,
       LENGTH(image) as image_size_bytes
FROM Portfolio
LIMIT 10;
```

---

## 🐛 แก้ปัญหา

### ปัญหา: รูปภาพไม่แสดง

**สาเหตุที่เป็นไปได้:**
1. S3 credentials ไม่ถูกต้อง
2. API_BASE_URL ไม่ถูกตั้งค่า
3. CORS ไม่ได้ตั้งค่า
4. Bucket เป็น Private แต่ไม่ได้ใช้ proxy

**วิธีแก้:**
1. ตรวจสอบ Backend logs ว่ามี error จาก S3Service หรือไม่
2. ทดสอบ upload ผ่าน Postman/curl:
   ```bash
   curl -X POST https://api.yourdomain.com/api/upload/portfolio \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -F "file=@test-image.jpg"
   ```
3. ตรวจสอบว่า proxy endpoint ทำงาน:
   ```bash
   curl https://api.yourdomain.com/api/images/uploads/portfolio/test.jpg
   ```

### ปัญหา: รูปภาพเก่า (Base64) ไม่แสดง

**สาเหตุ:** ระบบรองรับ Base64 อยู่แล้ว (backward compatible)

**วิธีแก้:** ไม่ต้องทำอะไร รูปภาพ Base64 เก่าจะแสดงได้ตามปกติ

### ปัญหา: Database ยังเก็บ Base64

**สาเหตุ:** Frontend ยังส่ง Base64 มาหรือ upload ไม่สำเร็จ

**วิธีแก้:**
1. ตรวจสอบ Browser Console ว่ามี error ในการ upload หรือไม่
2. ตรวจสอบ Network tab ว่า request ไปที่ `/api/upload/portfolio` สำเร็จหรือไม่
3. ตรวจสอบว่า Frontend ใช้ `API_ENDPOINTS.UPLOAD_PORTFOLIO` ถูกต้อง

---

## 📊 เปรียบเทียบก่อน/หลัง

| Feature | ก่อน (Base64) | หลัง (URL/path) |
|---------|--------------|----------------|
| Database Size | ~267KB/รูป | ~100 bytes/รูป |
| Query Speed | ช้า (ดึง Base64) | เร็ว (ดึงแค่ URL) |
| Backup/Restore | ช้า | เร็ว |
| Storage | Database | S3/Cloud Storage |
| Backward Compatible | - | ✅ รองรับ Base64 เก่า |

---

## ✅ Checklist ก่อน Deploy

- [ ] ตั้งค่า DigitalOcean Spaces credentials
- [ ] ตั้งค่า `DO_SPACES_*` environment variables
- [ ] ตั้งค่า `API_BASE_URL` หรือ `NEXT_PUBLIC_API_URL`
- [ ] ทดสอบอัปโหลดรูปภาพใน development
- [ ] ตรวจสอบว่า proxy endpoint ทำงาน (`/api/images/*`)
- [ ] ตรวจสอบ CORS settings (ถ้าจำเป็น)
- [ ] Backup database ก่อน deploy (ถ้ามีข้อมูลสำคัญ)

---

## 📚 เอกสารเพิ่มเติม

- [DigitalOcean Spaces Documentation](https://docs.digitalocean.com/products/spaces/)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/s3-examples.html)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)

---

## 🎉 เสร็จแล้ว!

หลังจากตั้งค่าตามคู่มือนี้ Portfolios จะเก็บรูปภาพแบบ URL/path แทน Base64 แล้ว

**ผลลัพธ์:**
- ✅ Database เล็กลงมาก
- ✅ Query เร็วขึ้น
- ✅ รองรับข้อมูลเก่า (Base64)
- ✅ รูปภาพแสดงผลได้ปกติ

