import { IsString, Matches, MinLength, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
  @IsString({ message: 'ชื่อผู้ใช้ต้องเป็นข้อความ' })
  @Matches(/^[A-Z][a-zA-Z0-9_]{2,}$/, {
    message: 'ชื่อผู้ใช้ต้องขึ้นต้นด้วยตัวอักษรพิมพ์ใหญ่และตามด้วยตัวอักษร ตัวเลข หรือ underscore อย่างน้อย 2 ตัว',
  })
  username: string;

  @IsNotEmpty({ message: 'กรุณากรอกอีเมล' })
  @IsString({ message: 'อีเมลต้องเป็นข้อความ' })
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email: string;

  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @IsString({ message: 'รหัสผ่านต้องเป็นข้อความ' })
  @MinLength(6, { message: 'รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ ตัวอักษรพิมพ์เล็ก และตัวเลขอย่างน้อย 1 ตัว',
  })
  password: string;
}

