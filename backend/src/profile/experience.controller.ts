import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  NotFoundException,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profile/experience')
export class ExperienceController {
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
   * GET /api/profile/experience
   * ดึงข้อมูลประสบการณ์ทั้งหมด
   * Protected: ต้อง login ก่อน
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getExperiences(@Request() req: any) {
    // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
    const pageContent = await this.prisma.pageContent.findUnique({
      where: { userId: req.user.userId },
      include: { experiences: true },
    });

    if (!pageContent) {
      return [];
    }

    console.log(`📋 Fetched ${pageContent.experiences.length} experiences for user: ${req.user.username}`);
    return pageContent.experiences;
  }

  /**
   * POST /api/profile/experience
   * สร้างประสบการณ์ใหม่
   * Protected: ต้อง login ก่อน
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createExperience(@Request() req: any, @Body() data: any) {
    const { title, company, location, period, description } = data;

    // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
    const pageContent = await this.getOrCreatePageContent(req.user.userId);
    const profile = await this.getOrCreateProfile(req.user.userId);

    const experience = await this.prisma.experience.create({
      data: {
        title,
        company,
        location,
        period,
        description,
        profileId: profile.id, // Required by Prisma schema
        pageContentId: pageContent.id, // For user-specific content
      },
    });

    console.log(`✅ Experience created: ${experience.title} (ID: ${experience.id}) for user: ${req.user.username}`);
    return { success: true, experience };
  }

  /**
   * PUT /api/profile/experience
   * อัปเดตประสบการณ์ทั้งหมด
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateExperiences(@Request() req: any, @Body() body: { experiences: any[] }) {
    const { experiences } = body;

    // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
    const pageContent = await this.getOrCreatePageContent(req.user.userId);
    const profile = await this.getOrCreateProfile(req.user.userId);

    // บันทึกค่าเก่าก่อนลบ
    const oldExperiences = await this.prisma.experience.findMany({
      where: { pageContentId: pageContent.id },
    });

    // ลบประสบการณ์เดิมทั้งหมดของ user นี้
    await this.prisma.experience.deleteMany({
      where: { pageContentId: pageContent.id },
    });

    // เพิ่มประสบการณ์ใหม่ทั้งหมด
    if (experiences && experiences.length > 0) {
      await this.prisma.experience.createMany({
        data: experiences.map((exp: any) => ({
          title: exp.title,
          company: exp.company,
          location: exp.location,
          period: exp.period,
          description: exp.description,
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
          page: 'experience',
          section: 'all',
          action: 'update',
          oldValue: JSON.stringify(oldExperiences),
          newValue: JSON.stringify(experiences || []),
        },
      });
    } catch (historyError) {
      console.error('Error logging edit history:', historyError);
    }

    return { success: true, message: 'อัปเดตประสบการณ์สำเร็จ' };
  }

  /**
   * DELETE /api/profile/experience?id=X
   * ลบประสบการณ์
   * Protected: ต้อง login ก่อน และสามารถลบได้เฉพาะของตัวเอง
   */
  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteExperience(@Request() req: any, @Query('id') id: string) {
    if (!id) {
      throw new NotFoundException('ไม่พบ ID');
    }

    // IMPORTANT: ตรวจสอบว่า experience นี้เป็นของ user นี้หรือไม่
    const pageContent = await this.prisma.pageContent.findUnique({
      where: { userId: req.user.userId },
    });

    if (!pageContent) {
      throw new NotFoundException('ไม่พบข้อมูลเนื้อหาของผู้ใช้');
    }

    // บันทึกค่าเก่าก่อนลบ
    const oldExperience = await this.prisma.experience.findUnique({
      where: { id: parseInt(id) },
    });

    if (!oldExperience) {
      throw new NotFoundException('ไม่พบประสบการณ์');
    }

    // ตรวจสอบว่า experience นี้เป็นของ user นี้หรือไม่
    if (oldExperience.pageContentId !== pageContent.id) {
      throw new BadRequestException('คุณไม่มีสิทธิ์ลบประสบการณ์นี้');
    }

    // ลบประสบการณ์
    await this.prisma.experience.delete({
      where: { id: parseInt(id) },
    });

    // บันทึกประวัติการแก้ไข
    try {
      await this.prisma.editHistory.create({
        data: {
          userId: req.user.userId,
          page: 'experience',
          section: oldExperience.title,
          action: 'delete',
          oldValue: JSON.stringify(oldExperience),
          newValue: null,
        },
      });
    } catch (historyError) {
      console.error('Error logging edit history:', historyError);
    }

    return {
      success: true,
      message: 'ลบประสบการณ์สำเร็จ',
    };
  }
}

