import { Controller, Get, Param } from '@nestjs/common';
import { ThemeConfigService } from './theme-config.service';

@Controller('theme-config')
export class ThemeConfigController {
  constructor(private readonly themeConfigService: ThemeConfigService) {}

  @Get()
  async getDefaultTheme() {
    return this.themeConfigService.getTheme();
  }

  @Get(':username')
  async getThemeForUser(@Param('username') username: string) {
    return this.themeConfigService.getTheme(username);
  }
}

