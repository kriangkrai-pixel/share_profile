import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if username already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { username: registerDto.username },
    });

    if (existingUser) {
      throw new ConflictException('ชื่อผู้ใช้นี้ถูกใช้งานแล้ว');
    }

    // Check if email already exists
    const existingEmail = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingEmail) {
      throw new ConflictException('อีเมลนี้ถูกใช้งานแล้ว');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username: registerDto.username,
        email: registerDto.email,
        password: hashedPassword,
      },
      select: {
        id: true,
        username: true,
        createdAt: true,
      },
    });

    // Create default PageContent for the user
    await this.prisma.pageContent.create({
      data: {
        userId: user.id,
        name: '',
        email: '',
        phone: '',
        location: '',
        description: '',
        bio: '',
        achievement: '',
      },
    });

    // Generate JWT token
    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
      },
      message: 'สมัครสมาชิกสำเร็จ',
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by username
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
    });

    if (!user) {
      throw new UnauthorizedException('คุณยังไม่ได้สมัครสมาชิก');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    }

    // Generate JWT token
    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    return {
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
      },
      message: 'เข้าสู่ระบบสำเร็จ',
    };
  }

  async logout() {
    return {
      success: true,
      message: 'ออกจากระบบสำเร็จ',
    };
  }

  /**
   * ดึงการตั้งค่าของ user
   */
  async getUserSettings(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        allowMultipleSessions: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้');
    }

    return {
      success: true,
      settings: {
        allowMultipleSessions: user.allowMultipleSessions,
      },
    };
  }

  /**
   * อัปเดตการตั้งค่าของ user
   */
  async updateUserSettings(userId: number, updateDto: { allowMultipleSessions?: boolean }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('ไม่พบข้อมูลผู้ใช้');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        allowMultipleSessions: updateDto.allowMultipleSessions ?? user.allowMultipleSessions,
      },
      select: {
        id: true,
        username: true,
        allowMultipleSessions: true,
      },
    });

    return {
      success: true,
      message: 'อัปเดตการตั้งค่าสำเร็จ',
      settings: {
        allowMultipleSessions: updatedUser.allowMultipleSessions,
      },
    };
  }
}

