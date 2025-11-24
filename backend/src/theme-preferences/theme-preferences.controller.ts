import { Body, Controller, Get, Param, Put, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ThemePreferencesService } from './theme-preferences.service';
import { UpdateThemePreferenceDto } from './dto/update-theme-preference.dto';

@Controller('theme')
export class ThemePreferencesController {
  constructor(private readonly themePreferencesService: ThemePreferencesService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMyTheme(@Request() req: any) {
    return this.themePreferencesService.getThemeForUser(req.user.userId);
  }

  @Get(':username')
  async getThemeByUsername(@Param('username') username: string) {
    try {
      return await this.themePreferencesService.getThemeForUsername(username);
    } catch (error) {
      console.error(`❌ Failed to load theme for "${username}":`, error);
      return this.themePreferencesService.getDefaultTheme();
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  async updateMyTheme(@Request() req: any, @Body() dto: UpdateThemePreferenceDto) {
    return this.themePreferencesService.updateTheme(req.user.userId, dto);
  }
}

