import { Controller, Get, Put, Post, Body, Query, UseGuards } from '@nestjs/common';
import { LayoutService } from './layout.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('layout')
export class LayoutController {
  constructor(private readonly layoutService: LayoutService) {}

  /**
   * GET /api/layout
   * ดึงข้อมูล Layout ที่ใช้งานอยู่
   * Query parameter: includeHidden=true เพื่อดึง widgets ที่ซ่อนอยู่ด้วย (สำหรับ admin)
   */
  @Get()
  async getLayout(@Query('includeHidden') includeHidden?: string) {
    const includeHiddenBool = includeHidden === 'true';
    console.log(`📋 Fetching active layout (includeHidden: ${includeHiddenBool})`);
    return this.layoutService.getActiveLayout(includeHiddenBool);
  }

  /**
   * POST /api/layout
   * สร้าง Layout ใหม่
   * Protected: ต้อง login ก่อน
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createLayout(@Body() data: { name?: string }) {
    console.log(`➕ Creating new layout: ${data.name || 'Unnamed'}`);
    return this.layoutService.createLayout(data.name);
  }

  /**
   * PUT /api/layout
   * อัปเดต Layout
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateLayout(@Body() data: any) {
    console.log(`✏️ Updating layout ID: ${data.id}`);
    return this.layoutService.updateLayout(data.id, data);
  }
}

