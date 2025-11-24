import { Controller, Get, Put, Body, NotFoundException, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profile/skills')
export class SkillsController {
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
   * GET /api/profile/skills
   * ดึงข้อมูลทักษะทั้งหมด
   * Protected: ต้อง login ก่อน
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getSkills(@Request() req: any) {
    try {
      // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
      const pageContent = await this.prisma.pageContent.findUnique({
        where: { userId: req.user.userId },
        include: { skills: true },
      });

      if (!pageContent) {
        return [];
      }

      console.log(`📋 Fetched ${pageContent.skills.length} skills for user: ${req.user.username}`);
      return pageContent.skills;
    } catch (error) {
      console.error('❌ Error fetching skills:', error);
      throw error;
    }
  }

  /**
   * PUT /api/profile/skills
   * อัปเดตทักษะทั้งหมด
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateSkills(@Request() req: any, @Body() body: { skills: string[] }) {
    const { skills } = body;

    // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
    const pageContent = await this.getOrCreatePageContent(req.user.userId);
    const profile = await this.getOrCreateProfile(req.user.userId);

    // ลบทักษะเดิมของ user นี้
    await this.prisma.skill.deleteMany({
      where: { pageContentId: pageContent.id },
    });

    // เพิ่มทักษะใหม่
    if (skills && skills.length > 0) {
      await this.prisma.skill.createMany({
        data: skills.map((skill: string) => ({
          name: skill,
          profileId: profile.id, // Required by Prisma schema
          pageContentId: pageContent.id, // For user-specific content
        })),
      });
    }

    console.log(`✅ Updated ${skills?.length || 0} skills for user: ${req.user.username}`);
    return { success: true, message: 'อัปเดตทักษะสำเร็จ' };
  }
}

