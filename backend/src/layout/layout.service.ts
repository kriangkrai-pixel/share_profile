import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';

@Injectable()
export class LayoutService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  private buildWidgetsInclude(widgetsWhere: Prisma.WidgetWhereInput): Prisma.LayoutInclude {
    return {
      widgets: {
        where: widgetsWhere,
        orderBy: { order: 'asc' as const },
        select: {
          id: true,
          type: true,
          title: true,
          content: true,
          imageUrl: true,
          x: true,
          y: true,
          w: true,
          h: true,
          order: true,
          isVisible: true,
          settings: true,
        },
      },
    };
  }

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

  async getActiveLayout(includeHidden: boolean = false, username?: string) {
    // สร้าง where clause สำหรับ widgets ตาม includeHidden
    const widgetsWhere: Prisma.WidgetWhereInput = includeHidden ? {} : { isVisible: true };
    const widgetsInclude = this.buildWidgetsInclude(widgetsWhere);

    // ถ้ามี username ให้หา user ก่อน
    let userId: number | undefined;
    if (username) {
      const user = await this.prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (user) {
        userId = user.id;
      }
    }

    // หา layout ตาม userId หรือ fallback เป็น default (userId = null)
    let layout = await this.prisma.layout.findFirst({
      where: userId 
        ? { userId, isActive: true }
        : { isActive: true, userId: null }, // สำหรับ backward compatibility
      include: widgetsInclude,
    });

    if (!layout) {
      // สร้าง default layout สำหรับ user นั้น (ถ้ามี userId) หรือ global default
      layout = await this.prisma.layout.create({
        data: {
          name: username ? `${username}'s Layout` : 'Default Layout',
          isActive: true,
          userId: userId || null,
          widgets: {
            create: [
              {
                type: 'hero',
                title: 'Hero Section',
                x: 0,
                y: 0,
                w: 12,
                h: 6,
                order: 0,
                isVisible: true,
              },
              {
                type: 'about',
                title: 'About Section',
                x: 0,
                y: 6,
                w: 12,
                h: 4,
                order: 1,
                isVisible: true,
              },
              {
                type: 'education',
                title: 'Education & Experience',
                x: 0,
                y: 10,
                w: 12,
                h: 5,
                order: 2,
                isVisible: true,
              },
              {
                type: 'portfolio',
                title: 'Portfolio',
                x: 0,
                y: 15,
                w: 12,
                h: 4,
                order: 3,
                isVisible: true,
              },
              {
                type: 'contact',
                title: 'Contact',
                x: 0,
                y: 19,
                w: 12,
                h: 5,
                order: 4,
                isVisible: true,
              },
            ],
          },
        },
        include: widgetsInclude,
      });
    }

    // แปลง imageUrl เป็น proxy URLs สำหรับ widgets
    if (layout.widgets) {
      layout.widgets = layout.widgets.map((widget: any) => ({
        ...widget,
        imageUrl: this.convertToProxyUrl(widget.imageUrl),
      }));
    }

    return layout;
  }

  async updateLayout(id: number, data: any) {
    const { name, widgets } = data;

    const updatedLayout = await this.prisma.layout.update({
      where: { id },
      data: {
        name,
        updatedAt: new Date(),
      },
      include: {
        widgets: true,
      },
    });

    // อัปเดต widgets ถ้ามี - ใช้ Promise.all เพื่อลด N+1 query problem
    if (widgets && Array.isArray(widgets)) {
      await Promise.all(
        widgets
          .filter((widget) => widget.id) // กรองเฉพาะ widgets ที่มี id
          .map((widget) => {
            // ✅ แปลง imageUrl เป็น relative path ก่อนบันทึกลง database
            const imagePath = this.convertToRelativePath(widget.imageUrl);
            
            return this.prisma.widget.update({
              where: { id: widget.id },
              data: {
                x: widget.x,
                y: widget.y,
                w: widget.w,
                h: widget.h,
                order: widget.order,
                isVisible: widget.isVisible,
                title: widget.title,
                content: widget.content,
                imageUrl: imagePath,
                settings: widget.settings,
              },
            });
          }),
      );
    }

    // ดึงข้อมูลที่อัปเดตแล้ว
    const finalLayout = await this.prisma.layout.findUnique({
      where: { id },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    // แปลง imageUrl เป็น proxy URLs สำหรับ widgets
    if (finalLayout?.widgets) {
      finalLayout.widgets = finalLayout.widgets.map((widget: any) => ({
        ...widget,
        imageUrl: this.convertToProxyUrl(widget.imageUrl),
      }));
    }

    return finalLayout;
  }

  async createLayout(name?: string, userId?: number) {
    const newLayout = await this.prisma.layout.create({
      data: {
        name: name || 'New Layout',
        isActive: false,
        userId: userId || null,
      },
      include: {
        widgets: true,
      },
    });

    return newLayout;
  }
}

