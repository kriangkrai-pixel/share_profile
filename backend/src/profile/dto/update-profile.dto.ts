import { IsOptional, IsEmail, IsString, MaxLength, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'ชื่อต้องไม่เกิน 255 ตัวอักษร' })
  @Transform(({ value }) => (value === '' ? undefined : value))
  name?: string;

  @IsOptional()
  @Transform(({ value }) => {
    // แปลง empty string เป็น undefined เพื่อให้ @IsOptional() ทำงาน
    if (value === '' || value === null) {
      return undefined;
    }
    return value;
  })
  @ValidateIf((o) => o.email !== undefined && o.email !== null && o.email !== '')
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' })
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50, { message: 'เบอร์โทรต้องไม่เกิน 50 ตัวอักษร' })
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255, { message: 'ที่อยู่ต้องไม่เกิน 255 ตัวอักษร' })
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  achievement?: string;

  @IsOptional()
  @IsString()
  heroImage?: string;

  @IsOptional()
  @IsString()
  contactImage?: string;
}

