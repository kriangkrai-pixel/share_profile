import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { EditHistoryService } from './edit-history.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admin/edit-history')
export class EditHistoryController {
  constructor(private readonly editHistoryService: EditHistoryService) {}

  /**
   * GET /api/admin/edit-history
   * ดึงประวัติการแก้ไข (เฉพาะของผู้ใช้ที่ล็อกอิน)
   * Query: ?page=portfolio&limit=50 (optional)
   */
  @Get()
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    console.log(`📋 Fetching edit history for user: ${req.user.username} (page: ${page || 'all'}, limit: ${limit || 'all'})`);
    return this.editHistoryService.getHistory(req.user.userId, page, limit ? parseInt(limit) : undefined);
  }

  /**
   * POST /api/admin/edit-history
   * บันทึกประวัติการแก้ไข (บันทึก userId อัตโนมัติจาก JWT token)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createHistory(@Request() req: any, @Body() data: any) {
    console.log(`📝 Creating edit history for user: ${req.user.username}, page: ${data.page} (${data.action})`);
    return this.editHistoryService.createHistory(req.user.userId, data);
  }
}

