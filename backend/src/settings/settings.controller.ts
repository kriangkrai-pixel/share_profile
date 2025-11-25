import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { SettingsResponse, SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  /**
   * GET /api/settings
   * ดึงการตั้งค่าทั้งหมด (Theme, Colors, ฯลฯ)
   */
  @Get()
  async getSettings(): Promise<SettingsResponse> {
    console.log('📋 Fetching settings');
    return this.settingsService.getSettings();
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMySettings(@Request() req: any): Promise<SettingsResponse> {
    return this.settingsService.getSettingsForUserId(req.user.userId);
  }

  @Get(':username')
  async getSettingsByUsername(@Param('username') username: string): Promise<SettingsResponse> {
    return this.settingsService.getSettingsByUsername(username);
  }

  /**
   * PUT /api/settings
   * อัปเดตการตั้งค่า
   */
  @Put()
  async updateSettings(@Body() data: any): Promise<SettingsResponse> {
    console.log('✏️ Updating settings');
    return this.settingsService.updateSettings(data);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  async updateMySettings(@Request() req: any, @Body() data: any): Promise<SettingsResponse> {
    return this.settingsService.updateSettingsForUser(req.user.userId, data);
  }
}

