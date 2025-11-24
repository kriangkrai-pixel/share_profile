import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'กรุณากรอกชื่อผู้ใช้' })
  @IsString({ message: 'ชื่อผู้ใช้ต้องเป็นข้อความ' })
  username: string;

  @IsNotEmpty({ message: 'กรุณากรอกรหัสผ่าน' })
  @IsString({ message: 'รหัสผ่านต้องเป็นข้อความ' })
  password: string;
}

