import { Controller, Get, Put, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ContentService } from './content.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * GET /api/content/me
   * ดึงข้อมูลเนื้อหาของผู้ใช้ที่ล็อกอินอยู่
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyContent(@Request() req: any) {
    console.log(`📋 Fetching content for user: ${req.user.username}`);
    return this.contentService.getMyContent(req.user.userId);
  }

  /**
   * PUT /api/content/me
   * อัปเดตข้อมูลเนื้อหาของผู้ใช้ที่ล็อกอินอยู่
   */
  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMyContent(@Request() req: any, @Body() data: any) {
    console.log(`✏️ Updating content for user: ${req.user.username}`);
    // IMPORTANT: ใช้ userId จาก JWT token เท่านั้น ไม่อ่านจาก request body
    return this.contentService.updateMyContent(req.user.userId, data);
  }

  /**
   * GET /api/content/public/:username
   * ดึงข้อมูลเนื้อหาสาธารณะตาม username (Public access - no authentication required)
   * Note: Route order matters - 'public/:username' must be before ':username' to avoid conflicts
   */
  @Get('public/:username')
  async getPublicContent(@Param('username') username: string) {
    console.log(`🌐 Fetching public content for username: ${username}`);
    return this.contentService.getContentByUsername(username);
  }

  /**
   * GET /api/content/:username
   * ดึงข้อมูลเนื้อหาสาธารณะตาม username (Public access - no authentication required)
   * Note: This route must be after 'public/:username' and 'me' to avoid route conflicts
   */
  @Get(':username')
  async getContentByUsername(@Param('username') username: string) {
    console.log(`🌐 Fetching public content for username: ${username}`);
    return this.contentService.getContentByUsername(username);
  }
}

