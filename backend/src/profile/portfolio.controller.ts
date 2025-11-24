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

@Controller('profile/portfolio')
export class PortfolioController {
  constructor(private prisma: PrismaService) {}

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

      console.log(`📋 Fetched ${pageContent.portfolios.length} portfolios for user: ${req.user.username}`);
      return pageContent.portfolios;
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

      // Log image size for debugging
      if (image) {
        const imageSizeKB = Math.round((image.length * 3) / 4 / 1024);
        console.log(`📷 Creating portfolio with image: ${imageSizeKB} KB`);
      }

      const pageContent = await this.getOrCreatePageContent(req.user.userId);
      const profile = await this.getOrCreateProfile(req.user.userId);

      const portfolio = await this.prisma.portfolio.create({
        data: {
          title,
          description,
          image: image || null,
          link: link || null,
          profileId: profile.id, // Required by Prisma schema
          pageContentId: pageContent.id, // For user-specific content
        },
      });

      console.log(`✅ Portfolio created: ${portfolio.title} (ID: ${portfolio.id}) for user: ${req.user.username}`);
      return { success: true, portfolio };
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
        // Log image sizes for debugging
        portfolios.forEach((port: any, index: number) => {
          if (port.image) {
            const imageSizeKB = Math.round((port.image.length * 3) / 4 / 1024);
            console.log(`📷 Portfolio ${index + 1} image size: ${imageSizeKB} KB`);
          }
        });

        await this.prisma.portfolio.createMany({
          data: portfolios.map((port: any) => ({
            title: port.title,
            description: port.description,
            image: port.image,
            link: port.link,
            profileId: profile.id, // Required by Prisma schema
            pageContentId: pageContent.id, // For user-specific content
          })),
        });
      }

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

      return { success: true, message: 'อัปเดตผลงานสำเร็จ' };
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

