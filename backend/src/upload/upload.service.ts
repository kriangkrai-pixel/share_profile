import { Injectable, BadRequestException } from '@nestjs/common';
import { S3Service } from './s3.service';

@Injectable()
export class UploadService {
  constructor(private readonly s3Service: S3Service) {}

  async uploadFile(file: Express.Multer.File, type: string, owner?: string) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // ตรวจสอบประเภทไฟล์
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only images are allowed.');
    }

    // ตรวจสอบขนาดไฟล์ (จำกัดที่ 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB.');
    }

    // Validate type parameter
    const allowedUploadTypes = ['profile', 'portfolio', 'widget'];
    if (!allowedUploadTypes.includes(type)) {
      throw new BadRequestException(`Invalid upload type. Allowed types: ${allowedUploadTypes.join(', ')}`);
    }

    // อัปโหลดไปยัง DigitalOcean Spaces (return relative path)
    // ส่ง owner ไปด้วยเพื่อแยก path ตาม user
    const relativePath = await this.s3Service.uploadFile(file, type, owner);

    // แปลง relative path เป็น proxy URL สำหรับ frontend
    const proxyUrl = this.s3Service.getProxyUrl(relativePath);

    return {
      success: true,
      imageUrl: proxyUrl, // Return proxy URL เพื่อให้ frontend ใช้ได้เลย
      relativePath: relativePath, // เก็บ relative path สำหรับ backend ใช้
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
    };
  }
}

