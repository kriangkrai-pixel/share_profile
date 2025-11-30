import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';

@Injectable()
export class WidgetsService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * Helper method: แปลง image URL/path เป็น relative path สำหรับเก็บใน database
   * Handle ทั้งกรณีที่เป็น Base64, full URL, proxy URL, และ relative path
   */
  private convertToRelativePath(imageUrl: string | null | undefined): string | null | undefined {
    if (!imageUrl) {
      return imageUrl;
    }

    // ถ้าเป็น base64 (เริ่มต้นด้วย data:) ให้ return ตามเดิม (backward compatibility)
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // ถ้าเป็น relative path อยู่แล้ว (เริ่มต้นด้วย uploads/) ให้ return ตามเดิม
    if (imageUrl.startsWith('uploads/')) {
      return imageUrl;
    }

    // ถ้าเป็น relative path ที่มี leading slash (เช่น /uploads/...) ให้ลบ leading slash
    if (imageUrl.startsWith('/uploads/')) {
      return imageUrl.substring(1); // ลบ leading slash
    }

    // ถ้าเป็น full URL หรือ proxy URL ให้ extract path
    let relativePath = imageUrl;
    
    // ตรวจสอบว่าเป็น proxy URL หรือ full URL
    if (imageUrl.includes('/api/images/')) {
      // Extract จาก proxy URL: /api/images/uploads/widget/image.jpg -> uploads/widget/image.jpg
      const match = imageUrl.match(/\/api\/images\/(.+)/);
      if (match && match[1]) {
        relativePath = match[1];
      }
    } else if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1') || imageUrl.includes(':10000') || imageUrl.includes(':3001')) {
      // Extract path จาก localhost URL
      const uploadsMatch = imageUrl.match(/\/uploads\/(.+)/);
      if (uploadsMatch) {
        relativePath = uploadsMatch[1];
      } else {
        const apiImagesMatch = imageUrl.match(/\/api\/images\/(.+)/);
        if (apiImagesMatch) {
          relativePath = apiImagesMatch[1];
        }
      }
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // Extract path จาก full URL
      try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        // Extract uploads/... จาก pathname
        const match = pathname.match(/\/uploads\/(.+)/);
        if (match && match[1]) {
          relativePath = match[1];
        } else {
          // ถ้าไม่มี /uploads/ ให้ใช้ pathname โดยลบ leading slash
          relativePath = pathname.startsWith('/') ? pathname.substring(1) : pathname;
        }
      } catch (e) {
        // ถ้า parse ไม่ได้ ให้ extract จาก string
        const match = imageUrl.match(/\/uploads\/(.+)/);
        if (match && match[1]) {
          relativePath = match[1];
        }
      }
    }

    // Normalize: ตรวจสอบว่าเป็น relative path ที่ถูกต้อง
    if (relativePath.startsWith('/')) {
      relativePath = relativePath.substring(1);
    }

    // ตรวจสอบว่าเป็น relative path ที่ถูกต้อง (ต้องขึ้นต้นด้วย uploads/)
    if (!relativePath.startsWith('uploads/')) {
      console.warn(`⚠️ Invalid relative path extracted: ${relativePath} from ${imageUrl}`);
      // ถ้าไม่ใช่ relative path ที่ถูกต้อง ให้ return ตามเดิม (อาจเป็น base64 หรือ path อื่น)
      return imageUrl;
    }

    return relativePath;
  }

  /**
   * แปลง image URL/path เป็น proxy URL
   * Handle ทั้งกรณีที่เป็น full URL (ข้อมูลเก่าจาก domain อื่น) และ relative path
   */
  private convertToProxyUrl(imageUrl: string | null | undefined): string | null | undefined {
    if (!imageUrl) {
      return imageUrl;
    }

    // ถ้าเป็น base64 (เริ่มต้นด้วย data:) ให้ return ตามเดิม
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // ถ้าเป็น relative path อยู่แล้ว (ไม่ใช่ full URL) ให้แปลงเป็น proxy URL โดยตรง
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      // ถ้าเป็น relative path ที่ขึ้นต้นด้วย uploads/ ให้เพิ่ม / นำหน้า
      let relativePath = imageUrl;
      if (relativePath.startsWith('uploads/') && !relativePath.startsWith('/uploads/')) {
        relativePath = `/${relativePath}`;
      } else if (!relativePath.startsWith('/')) {
        relativePath = `/${relativePath}`;
      }
      return this.s3Service.getProxyUrl(relativePath);
    }

    // ถ้าเป็น full URL (ข้อมูลเก่า) ให้แปลงเป็น relative path ก่อน
    let relativePath: string | null = null;
    
    try {
      const url = new URL(imageUrl);
      const pathname = url.pathname;
      
      // ถ้า pathname มี /api/images/ ให้ extract ส่วนที่อยู่หลัง /api/images/
      // เช่น /api/images/uploads/widget/image.jpg -> /uploads/widget/image.jpg
      if (pathname.includes('/api/images/')) {
        const match = pathname.match(/\/api\/images\/(.+)/);
        if (match && match[1]) {
          relativePath = `/${match[1]}`;
        }
      }
      // ถ้า pathname มี /uploads/ ให้ใช้ส่วนนั้น
      else if (pathname.includes('/uploads/')) {
        relativePath = pathname;
      }
      // Fallback: ใช้ pathname ทั้งหมด
      else {
        relativePath = pathname || '/';
      }
    } catch (e) {
      // ถ้า parse URL ไม่ได้ ให้ extract จาก string โดยตรง
      // ลอง extract จาก /api/images/ ก่อน
      const apiImagesMatch = imageUrl.match(/\/api\/images\/(.+?)(?:\?|$)/);
      if (apiImagesMatch && apiImagesMatch[1]) {
        relativePath = `/${apiImagesMatch[1]}`;
      }
      // ถ้าไม่เจอ ให้ลอง extract จาก /uploads/
      else {
        const uploadsMatch = imageUrl.match(/\/uploads\/.*?(?:\?|$)/);
        if (uploadsMatch) {
          relativePath = uploadsMatch[0];
        }
      }
    }

    // ถ้ายัง extract ไม่ได้ ให้ return null หรือ empty
    if (!relativePath) {
      console.warn(`⚠️ Could not extract path from URL: ${imageUrl}`);
      return null;
    }

    // Normalize path: ตรวจสอบว่าเป็น relative path ที่ถูกต้อง
    // ถ้าไม่ขึ้นต้นด้วย / ให้เพิ่ม
    if (!relativePath.startsWith('/')) {
      relativePath = `/${relativePath}`;
    }

    // แปลง relative path เป็น proxy URL
    return this.s3Service.getProxyUrl(relativePath);
  }

  async getWidgets(layoutId: number) {
    if (!layoutId) {
      throw new BadRequestException('layoutId is required');
    }

    const widgets = await this.prisma.widget.findMany({
      where: { layoutId },
      orderBy: { order: 'asc' },
    });

    // แปลง imageUrl เป็น proxy URLs
    return widgets.map((widget) => ({
      ...widget,
      imageUrl: this.convertToProxyUrl(widget.imageUrl),
    }));
  }

  async createWidget(data: any) {
    const { layoutId, type, title, content, imageUrl, x, y, w, h, order, settings } = data;

    if (!layoutId || !type) {
      throw new BadRequestException('layoutId and type are required');
    }

    const numericLayoutId = Number(layoutId);
    if (!Number.isFinite(numericLayoutId)) {
      throw new BadRequestException('layoutId must be a number');
    }

    const layoutExists = await this.prisma.layout.findUnique({
      where: { id: numericLayoutId },
      select: { id: true },
    });

    if (!layoutExists) {
      throw new BadRequestException('ไม่พบ Layout สำหรับสร้าง Widget');
    }

    // Validate and stringify settings if it's an object
    let settingsString = settings;
    if (settings && typeof settings === 'object') {
      try {
        settingsString = JSON.stringify(settings);
      } catch (error) {
        console.error('Error stringifying settings:', error);
        settingsString = null;
      }
    }

    // ✅ แปลง imageUrl เป็น relative path ก่อนบันทึกลง database
    const imagePath = this.convertToRelativePath(imageUrl);

    const newWidget = await this.prisma.widget.create({
      data: {
        layoutId: layoutExists.id,
        type,
        title,
        content,
        imageUrl: imagePath,
        x: Number.isFinite(Number(x)) ? Number(x) : 0,
        y: Number.isFinite(Number(y)) ? Number(y) : 0,
        w: Number.isFinite(Number(w)) ? Number(w) : 6,
        h: Number.isFinite(Number(h)) ? Number(h) : 4,
        order: Number.isFinite(Number(order)) ? Number(order) : 0,
        isVisible: true,
        settings: settingsString,
      },
    });

    // แปลง imageUrl เป็น proxy URL ก่อน return
    return {
      ...newWidget,
      imageUrl: this.convertToProxyUrl(newWidget.imageUrl),
    };
  }

  async updateWidget(id: number, data: any) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    const { id: _, settings, imageUrl, ...updateData } = data;

    // ✅ แปลง imageUrl เป็น relative path ก่อนบันทึกลง database (ถ้ามี)
    if (imageUrl !== undefined) {
      updateData.imageUrl = this.convertToRelativePath(imageUrl);
    }

    // Validate and stringify settings if it's an object
    let settingsString = settings;
    if (settings !== undefined) {
      if (typeof settings === 'object' && settings !== null) {
        try {
          settingsString = JSON.stringify(settings);
        } catch (error) {
          console.error('Error stringifying settings:', error);
          settingsString = null;
        }
      } else if (typeof settings === 'string') {
        // Validate that it's valid JSON
        try {
          JSON.parse(settings);
          settingsString = settings;
        } catch (error) {
          console.error('Invalid JSON string in settings:', error);
          settingsString = null;
        }
      }
    }

    const updatedWidget = await this.prisma.widget.update({
      where: { id },
      data: {
        ...updateData,
        ...(settingsString !== undefined && { settings: settingsString }),
        updatedAt: new Date(),
      },
    });

    // แปลง imageUrl เป็น proxy URL ก่อน return
    return {
      ...updatedWidget,
      imageUrl: this.convertToProxyUrl(updatedWidget.imageUrl),
    };
  }

  async deleteWidget(id: number) {
    if (!id) {
      throw new BadRequestException('id is required');
    }

    await this.prisma.widget.delete({
      where: { id },
    });

    return { success: true };
  }
}

