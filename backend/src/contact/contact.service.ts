import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  async createMessage(data: CreateContactDto) {
    // หาเจ้าของโปรไฟล์จาก username
    const recipient = await this.prisma.user.findUnique({
      where: { username: data.username },
    });

    if (!recipient) {
      throw new NotFoundException('ไม่พบเจ้าของโปรไฟล์ที่ระบุ');
    }

    // Validation is handled by DTO decorators
    const contactMessage = await this.prisma.contactMessage.create({
      data: {
        name: data.name,
        email: data.email,
        message: data.message,
        recipientId: recipient.id,
      },
    });

    return {
      success: true,
      message: 'บันทึกข้อความเรียบร้อยแล้ว',
      data: contactMessage,
    };
  }

  async getMessages(userId: number, unreadOnly?: boolean) {
    const messages = await this.prisma.contactMessage.findMany({
      where: {
        recipientId: userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return messages;
  }

  async updateMessage(userId: number, data: UpdateMessageDto) {
    // Validation is handled by DTO decorators
    const message = await this.prisma.contactMessage.findUnique({
      where: { id: data.id },
    });

    if (!message || message.recipientId !== userId) {
      throw new NotFoundException('ไม่พบข้อความนี้หรือคุณไม่มีสิทธิ์เข้าถึง');
    }

    const updated = await this.prisma.contactMessage.update({
      where: { id: data.id },
      data: { isRead: data.isRead },
    });

    return updated;
  }

  async deleteMessage(userId: number, id: number) {
    const message = await this.prisma.contactMessage.findUnique({
      where: { id },
    });

    if (!message || message.recipientId !== userId) {
      throw new NotFoundException(`ไม่พบข้อความที่ต้องการลบ (ID: ${id})`);
    }

    await this.prisma.contactMessage.delete({
      where: { id },
    });

    return { success: true };
  }
}

