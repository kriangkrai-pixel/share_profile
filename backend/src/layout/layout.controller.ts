import { Controller, Get, Put, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { LayoutService } from './layout.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('layout')
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  /**
   * GET /api/layout
   * ดึงข้อมูล Layout ที่ใช้งานอยู่
   * Query parameter: includeHidden=true เพื่อดึง widgets ที่ซ่อนอยู่ด้วย (สำหรับ admin)
   * Query parameter: username=xxx เพื่อดึง layout ของ user นั้นๆ
   */
  @Get()
  async getLayout(
    @Query('includeHidden') includeHidden?: string,
    @Query('username') username?: string,
  ) {
    const includeHiddenBool = includeHidden === 'true';
    // ✅ ลด logging ใน production
    if (process.env.NODE_ENV === 'development') {
      console.log(`📋 Fetching layout for user: ${username || 'default'} (includeHidden: ${includeHiddenBool})`);
    }
    return this.layoutService.getActiveLayout(includeHiddenBool, username);
  }

  /**
   * POST /api/layout
   * สร้าง Layout ใหม่
   * Protected: ต้อง login ก่อน
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createLayout(@Request() req: any, @Body() data: { name?: string }) {
    const userId = req.user?.userId;
    if (process.env.NODE_ENV === 'development') {
      console.log(`➕ Creating new layout: ${data.name || 'Unnamed'} for user: ${userId || 'unknown'}`);
    }
    return this.layoutService.createLayout(data.name, userId);
  }

  /**
   * PUT /api/layout
   * อัปเดต Layout
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateLayout(@Body() data: any) {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✏️ Updating layout ID: ${data.id}`);
    }
    return this.layoutService.updateLayout(data.id, data);
  }
}

