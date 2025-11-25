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
   * แปลง image URL/path เป็น proxy URL
   */
  private convertToProxyUrl(imageUrl: string | null | undefined): string | null | undefined {
    if (!imageUrl) {
      return imageUrl;
    }

    // ถ้าเป็น base64 (เริ่มต้นด้วย data:) ให้ return ตามเดิม
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // ถ้าเป็น full URL (ข้อมูลเก่า) ให้แปลงเป็น relative path ก่อน
    let relativePath = imageUrl;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const url = new URL(imageUrl);
        relativePath = url.pathname;
      } catch (e) {
        // ถ้า parse ไม่ได้ ให้ extract path จาก URL string
        const match = imageUrl.match(/\/uploads\/.*/);
        if (match) {
          relativePath = match[0];
        } else {
          // ถ้าไม่เจอ /uploads/ ให้ใช้ pathname จาก URL string
          const pathMatch = imageUrl.match(/\/[^?]*/);
          if (pathMatch) {
            relativePath = pathMatch[0];
          }
        }
      }
    }

    // ลบ /api/images prefix ถ้ามี (ป้องกันการซ้ำซ้อน)
    // เช่น /api/images/uploads/widget/image.jpg -> /uploads/widget/image.jpg
    if (relativePath.startsWith('/api/images/')) {
      relativePath = relativePath.replace(/^\/api\/images/, '');
    } else if (relativePath.startsWith('/api/images')) {
      relativePath = relativePath.replace(/^\/api\/images/, '');
    }

    // Normalize path: ถ้า path ไม่ขึ้นต้นด้วย /uploads/ แต่มี uploads/ ให้เพิ่ม /
    // เช่น uploads/widget/image.jpg -> /uploads/widget/image.jpg
    if (relativePath.startsWith('uploads/') && !relativePath.startsWith('/uploads/')) {
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

    const newWidget = await this.prisma.widget.create({
      data: {
        layoutId: layoutExists.id,
        type,
        title,
        content,
        imageUrl,
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

    const { id: _, settings, ...updateData } = data;

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

