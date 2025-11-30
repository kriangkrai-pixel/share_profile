import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  NotFoundException,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { S3Service } from '../upload/s3.service';

@Controller('profile/portfolio')
export class PortfolioController {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * Helper method: หา PageContent จาก userId และสร้างถ้ายังไม่มี
   */
  private async getOrCreatePageContent(userId: number) {
    let pageContent = await this.prisma.pageContent.findUnique({
      where: { userId },
    });

    if (!pageContent) {
      pageContent = await this.prisma.pageContent.create({
        data: {
          userId,
          name: '',
          email: '',
          phone: '',
          location: '',
          description: '',
          bio: '',
          achievement: '',
        },
      });
    }

    return pageContent;
  }

  /**
   * Helper method: หา Profile จาก userId และสร้างถ้ายังไม่มี
   * ต้องใช้ profileId เพราะ Prisma schema กำหนดให้ profileId เป็น required
   */
  private async getOrCreateProfile(userId: number) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      profile = await this.prisma.profile.create({
        data: {
          userId,
          name: '',
          email: '',
          phone: '',
          location: '',
          description: '',
          bio: '',
          achievement: '',
        },
      });
    }

    return profile;
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
      // Extract จาก proxy URL: /api/images/uploads/portfolio/image.jpg -> uploads/portfolio/image.jpg
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
   * Helper method: แปลง image URL/path เป็น proxy URL
   * Handle ทั้งกรณีที่เป็น Base64 (ข้อมูลเก่า), full URL (ข้อมูลเก่า), และ relative path (ข้อมูลใหม่)
   */
  private convertToProxyUrl(imageUrl: string | null | undefined): string | null | undefined {
    if (!imageUrl) {
      return imageUrl;
    }

    // ถ้าเป็น base64 (เริ่มต้นด้วย data:) ให้ return ตามเดิม (backward compatibility)
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // ถ้าเป็น full URL (ข้อมูลเก่า) ให้แปลงเป็น relative path ก่อน
    let relativePath = imageUrl;
    
    // ตรวจสอบว่าเป็น localhost URL หรือไม่ (ข้อมูลเก่าจาก development)
    if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1') || imageUrl.includes(':10000') || imageUrl.includes(':3001')) {
      // Extract path จาก localhost URL
      // เช่น http://localhost:10000/api/images/uploads/portfolio/image.jpg -> /uploads/portfolio/image.jpg
      const uploadsMatch = imageUrl.match(/\/uploads\/.*/);
      if (uploadsMatch) {
        relativePath = uploadsMatch[0];
      } else {
        // ถ้าไม่เจอ /uploads/ ให้ลอง extract จาก /api/images/
        const apiImagesMatch = imageUrl.match(/\/api\/images\/(.+)/);
        if (apiImagesMatch) {
          relativePath = `/${apiImagesMatch[1]}`;
        } else {
          // Fallback: ใช้ pathname จาก URL
          try {
            const url = new URL(imageUrl);
            relativePath = url.pathname;
          } catch (e) {
            const pathMatch = imageUrl.match(/\/[^?]*/);
            if (pathMatch) {
              relativePath = pathMatch[0];
            }
          }
        }
      }
    } else if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
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
    // เช่น /api/images/uploads/portfolio/image.jpg -> /uploads/portfolio/image.jpg
    if (relativePath.startsWith('/api/images/')) {
      relativePath = relativePath.replace(/^\/api\/images/, '');
    } else if (relativePath.startsWith('/api/images')) {
      relativePath = relativePath.replace(/^\/api\/images/, '');
    }

    // Normalize path: ถ้า path ไม่ขึ้นต้นด้วย /uploads/ แต่มี uploads/ ให้เพิ่ม /
    // เช่น uploads/portfolio/image.jpg -> /uploads/portfolio/image.jpg
    if (relativePath.startsWith('uploads/') && !relativePath.startsWith('/uploads/')) {
      relativePath = `/${relativePath}`;
    }

    // แปลง relative path เป็น proxy URL
    return this.s3Service.getProxyUrl(relativePath);
  }

  /**
   * GET /api/profile/portfolio
   * ดึงข้อมูลผลงานทั้งหมด
   * Protected: ต้อง login ก่อน
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getPortfolios(@Request() req: any) {
    try {
      // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
      const pageContent = await this.prisma.pageContent.findUnique({
        where: { userId: req.user.userId },
        include: { portfolios: true },
      });

      if (!pageContent) {
        return [];
      }

      // แปลง image URL เป็น proxy URLs สำหรับ portfolios
      const portfolios = pageContent.portfolios.map((portfolio: any) => ({
        ...portfolio,
        image: this.convertToProxyUrl(portfolio.image),
      }));

      console.log(`📋 Fetched ${portfolios.length} portfolios for user: ${req.user.username}`);
      return portfolios;
    } catch (error) {
      console.error('❌ Error fetching portfolios:', error);
      throw error;
    }
  }

  /**
   * POST /api/profile/portfolio
   * สร้างผลงานใหม่
   * Protected: ต้อง login ก่อน
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createPortfolio(@Request() req: any, @Body() data: any) {
    try {
      const { title, description, image, link } = data;

      // IMPORTANT: ไม่เชื่อถือ userId จาก request body
      // ใช้ userId จาก JWT token เท่านั้น

      // Validation
      if (!title || !description) {
        throw new BadRequestException('กรุณากรอกชื่อและคำอธิบายผลงาน');
      }

      // Log image size for debugging (เฉพาะ Base64)
      if (image && image.startsWith('data:')) {
        const imageSizeKB = Math.round((image.length * 3) / 4 / 1024);
        console.log(`📷 Creating portfolio with Base64 image: ${imageSizeKB} KB`);
      } else if (image) {
        console.log(`📷 Creating portfolio with image URL: ${image.substring(0, 50)}...`);
      }

      const pageContent = await this.getOrCreatePageContent(req.user.userId);
      const profile = await this.getOrCreateProfile(req.user.userId);

      // ✅ แปลง image URL เป็น relative path ก่อนบันทึกลง database
      const imagePath = this.convertToRelativePath(image);

      const portfolio = await this.prisma.portfolio.create({
        data: {
          title,
          description,
          image: imagePath || null,
          link: link || null,
          profileId: profile.id, // Required by Prisma schema
          pageContentId: pageContent.id, // For user-specific content
        },
      });

      // แปลง image URL เป็น proxy URL ก่อน return (ถ้าไม่ใช่ Base64)
      const portfolioWithProxyUrl = {
        ...portfolio,
        image: this.convertToProxyUrl(portfolio.image),
      };

      console.log(`✅ Portfolio created: ${portfolio.title} (ID: ${portfolio.id}) for user: ${req.user.username}`);
      return { success: true, portfolio: portfolioWithProxyUrl };
    } catch (error: any) {
      console.error('❌ Error creating portfolio:', error);
      
      // จัดการ error P2000 (ข้อมูลเกินขนาด column)
      if (error.code === 'P2000') {
        const columnName = error.meta?.column_name || 'image';
        throw new BadRequestException(
          `ขนาดรูปภาพใหญ่เกินไป กรุณาลดขนาดรูปภาพหรือบีบอัดรูปภาพก่อนอัปโหลด (Column: ${columnName})`
        );
      }
      
      // จัดการ error อื่นๆ
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(error.message || 'เกิดข้อผิดพลาดในการสร้างผลงาน');
    }
  }

  /**
   * PUT /api/profile/portfolio
   * อัปเดตผลงานทั้งหมด
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updatePortfolios(@Request() req: any, @Body() body: { portfolios: any[] }) {
    const { portfolios } = body;

    try {
      // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
      const pageContent = await this.getOrCreatePageContent(req.user.userId);
      const profile = await this.getOrCreateProfile(req.user.userId);

      // บันทึกค่าเก่าก่อนลบ
      const oldPortfolios = await this.prisma.portfolio.findMany({
        where: { pageContentId: pageContent.id },
      });

      // ลบผลงานเดิมทั้งหมดของ user นี้เท่านั้น
      await this.prisma.portfolio.deleteMany({
        where: { pageContentId: pageContent.id },
      });

      // เพิ่มผลงานใหม่ทั้งหมด
      if (portfolios && portfolios.length > 0) {
        // Log image info for debugging
        portfolios.forEach((port: any, index: number) => {
          if (port.image) {
            if (port.image.startsWith('data:')) {
              const imageSizeKB = Math.round((port.image.length * 3) / 4 / 1024);
              console.log(`📷 Portfolio ${index + 1} Base64 image size: ${imageSizeKB} KB`);
            } else {
              console.log(`📷 Portfolio ${index + 1} image URL: ${port.image.substring(0, 50)}...`);
            }
          }
        });

        const createdPortfolios = await this.prisma.portfolio.createMany({
          data: portfolios.map((port: any) => ({
            title: port.title,
            description: port.description,
            image: this.convertToRelativePath(port.image), // ✅ แปลง image URL เป็น relative path
            link: port.link,
            profileId: profile.id, // Required by Prisma schema
            pageContentId: pageContent.id, // For user-specific content
          })),
        });

        // ดึงข้อมูลที่สร้างแล้วเพื่อแปลง image URL
        const createdPortfolioList = await this.prisma.portfolio.findMany({
          where: { pageContentId: pageContent.id },
          orderBy: { createdAt: 'desc' },
          take: portfolios.length,
        });

        // แปลง image URL เป็น proxy URLs
        return {
          success: true,
          message: 'อัปเดตผลงานสำเร็จ',
          portfolios: createdPortfolioList.map((p: any) => ({
            ...p,
            image: this.convertToProxyUrl(p.image),
          })),
        };
      }

      return { success: true, message: 'อัปเดตผลงานสำเร็จ', portfolios: [] };

      // บันทึกประวัติการแก้ไข
      try {
        await this.prisma.editHistory.create({
          data: {
            userId: req.user.userId,
            page: 'portfolio',
            section: 'all',
            action: 'update',
            oldValue: JSON.stringify(oldPortfolios),
            newValue: JSON.stringify(portfolios || []),
          },
        });
      } catch (historyError) {
        console.error('Error logging edit history:', historyError);
      }

      // Return empty array if no portfolios (already handled above)
    } catch (error: any) {
      console.error('❌ Error updating portfolios:', error);
      
      // จัดการ error P2000 (ข้อมูลเกินขนาด column)
      if (error.code === 'P2000') {
        const columnName = error.meta?.column_name || 'image';
        throw new BadRequestException(
          `ขนาดรูปภาพใหญ่เกินไป กรุณาลดขนาดรูปภาพหรือบีบอัดรูปภาพก่อนอัปโหลด (Column: ${columnName})`
        );
      }
      
      // จัดการ error อื่นๆ
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      throw new BadRequestException(error.message || 'เกิดข้อผิดพลาดในการอัปเดตผลงาน');
    }
  }

  /**
   * DELETE /api/profile/portfolio?id=X
   * ลบผลงาน
   * Protected: ต้อง login ก่อน และสามารถลบได้เฉพาะของตัวเอง
   */
  @Delete()
  @UseGuards(JwtAuthGuard)
  async deletePortfolio(@Request() req: any, @Query('id') id: string) {
    if (!id) {
      throw new NotFoundException('กรุณาระบุ ID ผลงาน');
    }

    // IMPORTANT: ตรวจสอบว่า portfolio นี้เป็นของ user นี้หรือไม่
    const pageContent = await this.prisma.pageContent.findUnique({
      where: { userId: req.user.userId },
    });

    if (!pageContent) {
      throw new NotFoundException('ไม่พบข้อมูลเนื้อหาของผู้ใช้');
    }

    // ดึงข้อมูลผลงานก่อนลบ
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { id: parseInt(id) },
    });

    if (!portfolio) {
      throw new NotFoundException('ไม่พบผลงานที่ต้องการลบ');
    }

    // ตรวจสอบว่า portfolio นี้เป็นของ user นี้หรือไม่
    if (portfolio.pageContentId !== pageContent.id) {
      throw new BadRequestException('คุณไม่มีสิทธิ์ลบผลงานนี้');
    }

    // ลบผลงาน
    await this.prisma.portfolio.delete({
      where: { id: parseInt(id) },
    });

    // บันทึกประวัติการแก้ไข
    try {
      await this.prisma.editHistory.create({
        data: {
          userId: req.user.userId,
          page: 'portfolio',
          section: 'item',
          action: 'delete',
          oldValue: JSON.stringify(portfolio),
          newValue: JSON.stringify({ deleted: true }),
        },
      });
    } catch (historyError) {
      console.error('Error logging edit history:', historyError);
    }

    return {
      success: true,
      message: 'ลบผลงานสำเร็จ',
    };
  }
}

