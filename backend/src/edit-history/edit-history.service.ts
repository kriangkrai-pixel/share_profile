import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EditHistoryService {
  constructor(private prisma: PrismaService) {}

  async getHistory(userId: number, page?: string, limit?: number) {
    const where: any = { userId };
    if (page) {
      where.page = page;
    }

    const history = await this.prisma.editHistory.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...(limit ? { take: limit } : {}),
    });

    return history;
  }

  async createHistory(userId: number, data: any) {
    const { page, section, action, oldValue, newValue, itemId } = data;

    if (!page || !action) {
      throw new BadRequestException('กรุณาระบุ page และ action');
    }

    const history = await this.prisma.editHistory.create({
      data: {
        userId,
        page,
        section: section || null,
        action,
        oldValue: oldValue || null,
        newValue: newValue || null,
        itemId: itemId || null,
      },
    });

    return { success: true, history };
  }
}

