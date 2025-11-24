import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

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
}

