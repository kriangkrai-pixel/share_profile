import { Controller, Get, Post, Put, Delete, Body, Query, UseGuards } from '@nestjs/common';
import { WidgetsService } from './widgets.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('widgets')
export class WidgetsController {
  constructor(private readonly widgetsService: WidgetsService) {}

  /**
   * GET /api/widgets?layoutId=X
   * ดึงข้อมูล Widgets ตาม Layout ID
   */
  @Get()
  async getWidgets(@Query('layoutId') layoutId: string) {
    console.log(`📋 Fetching widgets for layout ID: ${layoutId}`);
    return this.widgetsService.getWidgets(parseInt(layoutId));
  }

  /**
   * POST /api/widgets
   * สร้าง Widget ใหม่
   * Protected: ต้อง login ก่อน
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createWidget(@Body() data: any) {
    console.log(`➕ Creating new widget: ${data.type}`);
    return this.widgetsService.createWidget(data);
  }

  /**
   * PUT /api/widgets
   * อัปเดต Widget
   * Protected: ต้อง login ก่อน
   */
  @Put()
  @UseGuards(JwtAuthGuard)
  async updateWidget(@Body() data: any) {
    console.log(`✏️ Updating widget ID: ${data.id}`);
    return this.widgetsService.updateWidget(data.id, data);
  }

  /**
   * DELETE /api/widgets?id=X
   * ลบ Widget
   * Protected: ต้อง login ก่อน
   */
  @Delete()
  @UseGuards(JwtAuthGuard)
  async deleteWidget(@Query('id') id: string) {
    console.log(`🗑️ Deleting widget ID: ${id}`);
    return this.widgetsService.deleteWidget(parseInt(id));
  }
}

