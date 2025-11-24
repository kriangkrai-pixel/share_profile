import { Controller, Get, Put, Body } from '@nestjs/common';
import { SettingsResponse, SettingsService } from './settings.service';

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

  /**
   * PUT /api/settings
   * อัปเดตการตั้งค่า
   */
  @Put()
  async updateSettings(@Body() data: any): Promise<SettingsResponse> {
    console.log('✏️ Updating settings');
    return this.settingsService.updateSettings(data);
  }
}

