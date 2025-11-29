import { Controller, Post, Body, Get, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/register
   * สมัครสมาชิก
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    console.log(`📝 Registration attempt for user: ${registerDto.username}`);
    return this.authService.register(registerDto);
  }

  /**
   * POST /api/auth/login
   * เข้าสู่ระบบ
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    console.log(`🔐 Login attempt for user: ${loginDto.username}`);
    return this.authService.login(loginDto);
  }

  /**
   * POST /api/auth/logout
   * ออกจากระบบ
   */
  @Post('logout')
  async logout() {
    console.log('🚪 Logout request');
    return this.authService.logout();
  }

  /**
   * GET /api/auth/user/settings/me
   * ดึงการตั้งค่าของ user ปัจจุบัน
   */
  @Get('user/settings/me')
  @UseGuards(JwtAuthGuard)
  async getUserSettings(@Request() req) {
    return this.authService.getUserSettings(req.user.userId);
  }

  /**
   * PUT /api/auth/user/settings/me
   * อัปเดตการตั้งค่าของ user ปัจจุบัน
   */
  @Put('user/settings/me')
  @UseGuards(JwtAuthGuard)
  async updateUserSettings(@Request() req, @Body() updateDto: UpdateUserSettingsDto) {
    return this.authService.updateUserSettings(req.user.userId, updateDto);
  }
}

