import { IsNotEmpty, IsEmail, Length } from 'class-validator';

export class CreateContactDto {

  // IsNotEmpty ตรวจสอบให้แน่ใจว่าไม่ได้ปล่อยว่างไว้
  @Length(2, 50, { message: 'ชื่อต้องมีอย่างน้อย 2 ตัวอักษร' })
  @IsNotEmpty({ message: 'กรุณากรอกชื่อ' })
  name: string;
  
  // IsEmail ตรวจสอบรูปแบบอีเมล
  @IsNotEmpty({ message: 'กรุณากรอกอีเมล' })
  @IsEmail({}, { message: 'รูปแบบอีเมลไม่ถูกต้อง' }) 
  email: string;

  @IsNotEmpty({ message: 'กรุณากรอกข้อความ' })
  message: string;

  @IsNotEmpty({ message: 'กรุณาระบุ username ของเจ้าของโปรไฟล์' })
  username: string;
}