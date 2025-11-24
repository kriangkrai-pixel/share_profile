import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../upload/s3.service';

@Injectable()
export class ProfileService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
  ) {}

  /**
   * แปลง proxy URL หรือ full URL กลับเป็น relative path
   * @param imageUrl อาจเป็น proxy URL, full URL, relative path, หรือ base64
   * @returns relative path (เช่น uploads/profile/image.jpg) หรือ null
   */
  private convertToRelativePath(imageUrl: string | null | undefined): string | null {
    if (!imageUrl) {
      return null;
    }

    // ถ้าเป็น base64 (เริ่มต้นด้วย data:) ให้ return null (ไม่รองรับ base64 แล้ว)
    if (imageUrl.startsWith('data:')) {
      console.warn('⚠️ Base64 image detected, but base64 is no longer supported. Please use upload endpoint.');
      return null;
    }

    // ถ้าเป็น relative path อยู่แล้ว (เริ่มต้นด้วย uploads/) ให้ return ตามเดิม
    if (imageUrl.startsWith('uploads/')) {
      return imageUrl;
    }

    // ถ้าเป็น relative path ที่มี leading slash (เช่น /uploads/profile/image.jpg)
    if (imageUrl.startsWith('/uploads/')) {
      return imageUrl.substring(1); // ลบ leading slash
    }

    // ถ้าเป็น proxy URL (เช่น http://localhost:3001/api/images/uploads/profile/image.jpg)
    // หรือ full URL (เช่น https://internship.sgp1.digitaloceanspaces.com/uploads/profile/image.jpg)
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const url = new URL(imageUrl);
        const pathname = url.pathname;
        
        // ถ้าเป็น proxy URL (มี /api/images ใน path)
        if (pathname.includes('/api/images/')) {
          // Extract path หลังจาก /api/images
          const match = pathname.match(/\/api\/images\/(.+)/);
          if (match && match[1]) {
            return match[1];
          }
        }
        
        // ถ้าเป็น full URL จาก DigitalOcean Spaces หรือ CDN
        // Extract path หลังจาก domain
        const match = pathname.match(/\/uploads\/(.+)/);
        if (match && match[1]) {
          return `uploads/${match[1]}`;
        }
        
        // ถ้า pathname เริ่มต้นด้วย /uploads/ โดยตรง
        if (pathname.startsWith('/uploads/')) {
          return pathname.substring(1); // ลบ leading slash
        }
      } catch (e) {
        // ถ้า parse URL ไม่ได้ ให้ลอง extract จาก string
        const match = imageUrl.match(/\/uploads\/(.+)/);
        if (match && match[1]) {
          return `uploads/${match[1]}`;
        }
      }
    }

    // ถ้าไม่สามารถแปลงได้ ให้ return null
    console.warn(`⚠️ Could not convert image URL to relative path: ${imageUrl}`);
    return null;
  }

  /**
   * แปลง image URL/path เป็น proxy URL
   * Handle ทั้งกรณีที่เป็น full URL (ข้อมูลเก่า) และ relative path (ข้อมูลใหม่)
   */
  private convertToProxyUrl(imageUrl: string | null | undefined): string | undefined {
    if (!imageUrl) {
      return undefined;
    }

    // ถ้าเป็น base64 (เริ่มต้นด้วย data:) ให้ return ตามเดิม
    if (imageUrl.startsWith('data:')) {
      return imageUrl;
    }

    // ถ้าเป็น full URL (ข้อมูลเก่า) ให้แปลงเป็น relative path ก่อน
    // เช่น https://internship.sgp1.digitaloceanspaces.com/uploads/portfolio/image.jpg
    // จะแปลงเป็น /uploads/portfolio/image.jpg
    let relativePath = imageUrl;
    
    // ตรวจสอบว่าเป็น full URL หรือไม่
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      // แยก path จาก URL
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
   * Legacy method: return profile แรกที่เจอ (สำหรับ public access)
   */
  async getProfileLegacy() {
    let profile = await this.prisma.profile.findFirst({
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
          } as any,
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

    if (!profile) {
      // หา User แรกในระบบ หรือสร้าง default user
      let user = await this.prisma.user.findFirst();
      
      if (!user) {
        // สร้าง default user ถ้ายังไม่มี
        user = await this.prisma.user.create({
          data: {
            username: 'Admin',
            email: 'kik550123@gmail.com',
            password: '$2b$10$defaultpasswordhash', // Default hash (ควรเปลี่ยนในภายหลัง)
            name: 'เกรียงไกร ภูทองก้าน',
          },
        });
      }

      // สร้างโปรไฟล์เริ่มต้น
      profile = await this.prisma.profile.create({
        data: {
          userId: user.id,
          name: 'เกรียงไกร ภูทองก้าน',
          email: 'kik550123@gmail.com',
          phone: '091-826-6369',
          location: 'Phuket, Thailand',
          description:
            'นักศึกษาปี 4 สาขาวิชาคอมพิวเตอร์ สนใจออกแบบระบบ พัฒนาเว็บไซต์ เขียนโปรแกรม และสร้างเกม พร้อมพัฒนาทักษะอย่างต่อเนื่อง',
          bio: 'ฉันเป็นนักศึกษาปี 4 สาขาวิชาคอมพิวเตอร์ มหาวิทยาลัยราชภัฏภูเก็ต มีความสนใจด้านการออกแบบระบบ การพัฒนาเว็บไซต์ การเขียนโปรแกรม รวมถึงการสร้างเกม มีความสนใจในสิ่งใหม่ๆ และพร้อมพัฒนาทักษะในสายงานเทคโนโลยีอย่างต่อเนื่อง',
          achievement:
            'เคยทำโปรเจกต์เกี่ยวกับทางด้านเกมโดยใช้ Unreal Engine 5 และมีผลงานตีพิมพ์ในงานประชุมวิชาการระดับนานาชาติเรื่อง "Development of Adventure Games and Puzzle Solving in Mysterious Museums" ตีพิมพ์ IEEE Xplore',
          skills: {
            create: [
              { name: 'HTML, CSS, JavaScript' },
              { name: 'Unreal Engine (Blueprint)' },
              { name: 'Game Design & Puzzle Logic' },
            ],
          },
          education: {
            create: [
              {
                type: 'university',
                field: 'สาขาวิชาคอมพิวเตอร์',
                institution: 'มหาวิทยาลัยราชภัฏภูเก็ต',
                year: 'ปี 4',
              },
              {
                type: 'highschool',
                field: 'คณิต-อังกฤษ',
                institution: 'โรงเรียนเมืองถลาง',
                gpa: '3.03',
              },
            ],
          },
          experiences: {
            create: [
              {
                title: 'ออกแบบเว็บไซต์ด้วย WordPress',
                company: 'บริษัท ภูเก็ตดีมีเดีย',
                location: 'ภูเก็ต',
                period: 'ปี พ.ศ. 2568 - พ.ศ. 2568',
              },
            ],
          },
          portfolios: {
            create: [
              { title: 'โปรเจกต์ที่ 1', description: 'คำอธิบายโปรเจกต์' },
              { title: 'โปรเจกต์ที่ 2', description: 'คำอธิบายโปรเจกต์' },
              { title: 'โปรเจกต์ที่ 3', description: 'คำอธิบายโปรเจกต์' },
            ],
          },
        },
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
            } as any,
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
    }

    // แปลงข้อมูลให้ตรงกับ interface
    const university = profile.education.find((e) => e.type === 'university');
    const highschool = profile.education.find((e) => e.type === 'highschool');

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      description: profile.description,
      bio: profile.bio,
      achievement: profile.achievement,
      heroImage: this.convertToProxyUrl(profile.heroImage),
      contactImage: this.convertToProxyUrl(profile.contactImage),
      skills: profile.skills.map((s) => s.name),
      education: {
        university: {
          field: university?.field || '',
          university: university?.institution || '',
          year: university?.year || '',
          gpa: university?.gpa || '', // เพิ่ม GPA สำหรับมหาวิทยาลัย
          status: university?.status || 'studying', // อ่าน status จาก database
        },
        highschool: {
          field: highschool?.field || '',
          school: highschool?.institution || '',
          gpa: highschool?.gpa || '',
        },
      },
      experience: profile.experiences.map((exp) => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        location: exp.location,
        period: exp.period,
        description: exp.description || undefined,
      })),
      portfolio: profile.portfolios.map((port) => ({
        id: port.id,
        title: port.title,
        description: port.description,
        image: this.convertToProxyUrl(port.image),
        link: port.link || undefined,
      })),
    };
  }

  async getProfile(userId: number) {
    // IMPORTANT: ใช้ userId จาก JWT token เพื่อความปลอดภัย
    let profile = await this.prisma.profile.findUnique({
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
          } as any,
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

    if (!profile) {
      // สร้างโปรไฟล์เริ่มต้นสำหรับ userId นี้
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
            } as any,
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
    }

    // แปลงข้อมูลให้ตรงกับ interface
    const university = profile.education.find((e) => e.type === 'university');
    const highschool = profile.education.find((e) => e.type === 'highschool');

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      location: profile.location,
      description: profile.description,
      bio: profile.bio,
      achievement: profile.achievement,
      heroImage: this.convertToProxyUrl(profile.heroImage),
      contactImage: this.convertToProxyUrl(profile.contactImage),
      skills: profile.skills.map((s) => s.name),
      education: {
        university: {
          field: university?.field || '',
          university: university?.institution || '',
          year: university?.year || '',
          gpa: university?.gpa || '',
          status: university?.status || 'studying',
        },
        highschool: {
          field: highschool?.field || '',
          school: highschool?.institution || '',
          gpa: highschool?.gpa || '',
        },
      },
      experience: profile.experiences.map((exp) => ({
        id: exp.id,
        title: exp.title,
        company: exp.company,
        location: exp.location,
        period: exp.period,
        description: exp.description || undefined,
      })),
      portfolio: profile.portfolios.map((port) => ({
        id: port.id,
        title: port.title,
        description: port.description,
        image: this.convertToProxyUrl(port.image),
        link: port.link || undefined,
      })),
    };
  }

  async updateProfile(userId: number, data: any) {
    // IMPORTANT: ใช้ userId จาก JWT token เพื่อความปลอดภัย
    // ไม่มีการอ่าน userId จาก request body
    
    // IMPORTANT: อัปเดตทั้ง Profile และ PageContent tables เพื่อให้ข้อมูล sync กัน
    // เพราะ frontend ดึงข้อมูลจาก PageContent table
    
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    let pageContent = await this.prisma.pageContent.findUnique({
      where: { userId },
    });

    // เตรียมข้อมูลที่จะอัปเดต
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.location !== undefined) updateData.location = data.location;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.achievement !== undefined) updateData.achievement = data.achievement;
    
    // แปลง heroImage และ contactImage เป็น relative path ก่อนบันทึก
    if (data.heroImage !== undefined) {
      if (data.heroImage === null || data.heroImage === '') {
        updateData.heroImage = null;
      } else {
        const relativePath = this.convertToRelativePath(data.heroImage);
        updateData.heroImage = relativePath;
        if (relativePath) {
          console.log(`📸 Converting heroImage to relative path: ${relativePath}`);
        }
      }
    }
    
    if (data.contactImage !== undefined) {
      if (data.contactImage === null || data.contactImage === '') {
        updateData.contactImage = null;
      } else {
        const relativePath = this.convertToRelativePath(data.contactImage);
        updateData.contactImage = relativePath;
        if (relativePath) {
          console.log(`📸 Converting contactImage to relative path: ${relativePath}`);
        }
      }
    }

    // บันทึกค่าเก่าก่อนอัปเดต
    const oldValues = {
      name: profile?.name || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      location: profile?.location || '',
      description: profile?.description || '',
      bio: profile?.bio || '',
      achievement: profile?.achievement || '',
      heroImage: profile?.heroImage || null,
      contactImage: profile?.contactImage || null,
    };

    // อัปเดตหรือสร้าง Profile
    if (!profile) {
      profile = await this.prisma.profile.create({
        data: {
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
      console.log(`✅ Created new Profile for user: ${userId}`);
    } else {
      profile = await this.prisma.profile.update({
        where: { id: profile.id },
        data: updateData,
      });
      console.log(`✅ Updated Profile for user: ${userId}`);
    }

    // อัปเดตหรือสร้าง PageContent (สำคัญ! เพราะ frontend ดึงข้อมูลจากนี่)
    if (!pageContent) {
      pageContent = await this.prisma.pageContent.create({
        data: {
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
      console.log(`✅ Created new PageContent for user: ${userId}`);
    } else {
      pageContent = await this.prisma.pageContent.update({
        where: { id: pageContent.id },
        data: updateData,
      });
      console.log(`✅ Updated PageContent for user: ${userId}`);
    }

    // บันทึกประวัติการแก้ไข
    try {
      await this.prisma.editHistory.create({
        data: {
          userId,
          page: 'profile',
          section: 'main',
          action: 'update',
          oldValue: JSON.stringify(oldValues),
          newValue: JSON.stringify({
            ...data,
            heroImage: data.heroImage ? 'updated' : undefined,
            contactImage: data.contactImage ? 'updated' : undefined,
          }),
        },
      });
    } catch (historyError) {
      console.error('Error logging edit history:', historyError);
    }

    return { success: true, message: 'อัปเดตข้อมูลสำเร็จ' };
  }
}

