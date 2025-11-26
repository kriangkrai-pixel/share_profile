import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';

@Injectable()
export class ContentService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * แปลง image URL/path เป็น proxy URL
   */
  private convertToProxyUrl(imageUrl: string | null | undefined): string | undefined {
    if (!imageUrl) {
      return undefined;
    }

    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    let relativePath = imageUrl;
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const url = new URL(imageUrl);
        relativePath = url.pathname;
      } catch (e) {
        const match = imageUrl.match(/\/uploads\/.*/);
        if (match) {
          relativePath = match[0];
        } else {
          const pathMatch = imageUrl.match(/\/[^?]*/);
          if (pathMatch) {
            relativePath = pathMatch[0];
          }
        }
      }
    }

    if (relativePath.startsWith('/api/images/')) {
      relativePath = relativePath.replace(/^\/api\/images/, '');
    } else if (relativePath.startsWith('/api/images')) {
      relativePath = relativePath.replace(/^\/api\/images/, '');
    }

    if (relativePath.startsWith('uploads/') && !relativePath.startsWith('/uploads/')) {
      relativePath = `/${relativePath}`;
    }

    return this.s3Service.getProxyUrl(relativePath);
  }

  async getMyContent(userId: number) {
    const pageContent = await this.prisma.pageContent.findUnique({
      where: { userId },
      include: {
        skills: {
          select: { id: true, name: true },
          orderBy: { id: 'asc' },
        },
        education: {
          select: {
            id: true,
            type: true,
            field: true,
            institution: true,
            location: true,
            year: true,
            gpa: true,
            status: true,
          },
          orderBy: { id: 'asc' },
        },
        experiences: {
          select: {
            id: true,
            title: true,
            company: true,
            location: true,
            period: true,
            description: true,
          },
          orderBy: { id: 'desc' },
        },
        portfolios: {
          select: {
            id: true,
            title: true,
            description: true,
            image: true,
            link: true,
          },
          orderBy: { id: 'desc' },
        },
      },
    });

    if (!pageContent) {
      // Create default PageContent if it doesn't exist
      const newPageContent = await this.prisma.pageContent.create({
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
        include: {
          skills: true,
          education: true,
          experiences: true,
          portfolios: true,
        },
      });

      return this.formatContent(newPageContent);
    }

    return this.formatContent(pageContent);
  }

  async updateMyContent(userId: number, data: any) {
    // Upsert pattern: สร้าง content ถ้ายังไม่มี, อัปเดตถ้ามีแล้ว
    // IMPORTANT: userId มาจาก JWT token เท่านั้น ไม่อ่านจาก request body
    
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.achievement !== undefined) updateData.achievement = data.achievement;
    if (data.heroImage !== undefined) updateData.heroImage = data.heroImage;
    if (data.contactImage !== undefined) updateData.contactImage = data.contactImage;

    // ใช้ upsert เพื่อสร้างถ้ายังไม่มี หรืออัปเดตถ้ามีแล้ว
    await this.prisma.pageContent.upsert({
      where: { userId },
      update: updateData,
      create: {
        userId,
        name: updateData.name ?? '',
        email: updateData.email ?? '',
        phone: updateData.phone ?? '',
        location: updateData.location ?? '',
        description: updateData.description ?? '',
        bio: updateData.bio ?? '',
        achievement: updateData.achievement ?? '',
        heroImage: updateData.heroImage ?? null,
        contactImage: updateData.contactImage ?? null,
      },
    });

    return { success: true, message: 'อัปเดตข้อมูลสำเร็จ' };
  }

  async getContentByUsername(username: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        pageContent: {
          include: {
            skills: {
              select: { id: true, name: true },
              orderBy: { id: 'asc' },
            },
            education: {
              select: {
                id: true,
                type: true,
                field: true,
                institution: true,
                location: true,
                year: true,
                gpa: true,
                status: true,
              },
              orderBy: { id: 'asc' },
            },
            experiences: {
              select: {
                id: true,
                title: true,
                company: true,
                location: true,
                period: true,
                description: true,
              },
              orderBy: { id: 'desc' },
            },
            portfolios: {
              select: {
                id: true,
                title: true,
                description: true,
                image: true,
                link: true,
              },
              orderBy: { id: 'desc' },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('ไม่พบข้อมูลผู้ใช้');
    }

    let pageContent = user.pageContent;

    if (!pageContent) {
      pageContent = await this.prisma.pageContent.create({
        data: {
          userId: user.id,
          name: '',
          email: '',
          phone: '',
          location: '',
          description: '',
          bio: '',
          achievement: '',
        },
        include: {
          skills: true,
          education: true,
          experiences: true,
          portfolios: true,
        },
      });
    }

    return this.formatContent(pageContent);
  }

  private formatContent(pageContent: any) {
    return {
      id: pageContent.id,
      name: pageContent.name,
      email: pageContent.email,
      phone: pageContent.phone,
      location: pageContent.location,
      description: pageContent.description,
      bio: pageContent.bio,
      achievement: pageContent.achievement,
      heroImage: this.convertToProxyUrl(pageContent.heroImage),
      contactImage: this.convertToProxyUrl(pageContent.contactImage),
      skills: pageContent.skills.map((s: any) => s.name),
      education: pageContent.education.map((edu: any) => ({
        id: edu.id,
        type: edu.type,
        field: edu.field,
        institution: edu.institution,
        location: edu.location || undefined,
        year: edu.year || undefined,
        gpa: edu.gpa || undefined,
        status: edu.status || 'studying',
      })),
      experience: pageContent.experiences.map((exp: any) => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        location: exp.location,
        period: exp.period,
        description: exp.description || undefined,
      })),
      portfolio: pageContent.portfolios.map((port: any) => ({
        id: port.id,
        title: port.title,
        description: port.description,
        image: this.convertToProxyUrl(port.image),
        link: port.link || undefined,
      })),
    };
  }
}

