import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  /**
   * GET /api/profile
   * ดึงข้อมูลโปรไฟล์ทั้งหมด (รวม Portfolio, Experience, Education, Skills)
   * Public endpoint: ถ้ามี JWT token จะ return profile ของ user นั้น, ถ้าไม่มีจะ return profile แรกที่เจอ (legacy behavior)
   */
  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async getProfile(@Request() req: any) {
    // ถ้ามี JWT token (optional) ให้ใช้ userId จาก token
    // ถ้าไม่มี token ให้ return profile แรกที่เจอ (legacy behavior สำหรับ public page)
    const userId = req.user?.userId;
    
    if (userId) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`📋 Fetching complete profile data for user: ${req.user.username}`);
      }
      return this.profileService.getProfile(userId);
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('📋 Fetching profile data (public access - no user specified)');
      }
      return this.profileService.getProfileLegacy();
    }
  }

  /**
   * PUT /api/profile
   * อัปเดตข้อมูลโปรไฟล์หลัก (ชื่อ, อีเมล, ฯลฯ)
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req: any, @Body() data: UpdateProfileDto) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✏️ Updating profile data for user: ${req.user.username}`);
    }
    // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น ไม่อ่านจาก request body
    // Validation จะทำงานอัตโนมัติผ่าน ValidationPipe และ UpdateProfileDto
    return this.profileService.updateProfile(req.user.userId, data);
  }
}

