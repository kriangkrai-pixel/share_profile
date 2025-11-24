import { Controller, Get, Put, Body, NotFoundException, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('profile/education')
export class EducationController {
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
   * GET /api/profile/education
   * ดึงข้อมูลการศึกษา
   * Protected: ต้อง login ก่อน
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getEducation(@Request() req: any) {
    try {
      // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น
      const pageContent = await this.prisma.pageContent.findUnique({
        where: { userId: req.user.userId },
        include: { education: true },
      });

      if (!pageContent) {
        return [];
      }

      console.log(`📋 Fetched ${pageContent.education.length} education records for user: ${req.user.username}`);
      return pageContent.education;
    } catch (error) {
      console.error('❌ Error fetching education:', error);
      throw error;
    }
  }

  /**
   * PUT /api/profile/education
   * อัปเดตการศึกษา
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateEducation(@Request() req: any, @Body() body: { education: any }) {
    try {
      const { education } = body;
      
      // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น ไม่อ่านจาก request body
      
      // Debug: แสดงข้อมูลที่ได้รับ
      console.log('📥 Received education data:', JSON.stringify(education, null, 2));

      if (!education) {
        throw new BadRequestException('ไม่พบข้อมูลการศึกษา');
      }

      const pageContent = await this.getOrCreatePageContent(req.user.userId);
      const profile = await this.getOrCreateProfile(req.user.userId);

      // บันทึกค่าเก่าก่อนลบ
      const oldEducation = await this.prisma.education.findMany({
        where: { pageContentId: pageContent.id },
      });
      console.log(`📋 Found ${oldEducation.length} old education records`);

      // ลบการศึกษาเดิมของ user นี้
      await this.prisma.education.deleteMany({
        where: { pageContentId: pageContent.id },
      });
      console.log('🗑️ Deleted old education records');

      // เพิ่มการศึกษาใหม่
      const educationData = [];
      if (education.university) {
        const universityData: any = {
          type: 'university',
          field: education.university.field || '',
          institution: education.university.university || education.university.institution || '',
          year: education.university.year || '',
          status: education.university.status || 'studying',
          profileId: profile.id, // Required by Prisma schema
          pageContentId: pageContent.id, // For user-specific content
        };
        // เพิ่ม GPA ถ้ามี (สำหรับกรณีจบการศึกษาแล้ว)
        if (education.university.gpa) {
          universityData.gpa = education.university.gpa;
        }
        console.log('📝 University data:', universityData);
        educationData.push(universityData);
      }
      
      if (education.highschool) {
        const highschoolData = {
          type: 'highschool',
          field: education.highschool.field || '',
          institution: education.highschool.school || education.highschool.institution || '',
          gpa: education.highschool.gpa || '',
          profileId: profile.id, // Required by Prisma schema
          pageContentId: pageContent.id, // For user-specific content
        };
        console.log('📝 Highschool data:', highschoolData);
        educationData.push(highschoolData);
      }

      if (educationData.length > 0) {
        const result = await this.prisma.education.createMany({
          data: educationData,
        });
        console.log(`✅ Created ${result.count} education records for user: ${req.user.username}`);
      } else {
        console.warn('⚠️ No education data to save');
      }

      // บันทึกประวัติการแก้ไข
      try {
        await this.prisma.editHistory.create({
          data: {
            userId: req.user.userId,
            page: 'education',
            section: 'all',
            action: 'update',
            oldValue: JSON.stringify(oldEducation),
            newValue: JSON.stringify(educationData),
          },
        });
        console.log('📝 Edit history saved');
      } catch (historyError) {
        console.error('⚠️ Error logging edit history:', historyError);
        // ไม่ throw error เพราะไม่ใช่ปัญหาหลัก
      }

      return { success: true, message: 'อัปเดตการศึกษาสำเร็จ' };
    } catch (error) {
      console.error('❌ Error updating education:', error);
      throw error;
    }
  }
}

