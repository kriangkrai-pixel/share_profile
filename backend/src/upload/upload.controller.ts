import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
  Body,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';
import { WidgetsService } from '../widgets/widgets.service';
import { PrismaService } from '../prisma/prisma.service';

@Controller('upload')
export class UploadController {
  constructor(
    private readonly uploadService: UploadService,
    @Inject(forwardRef(() => WidgetsService))
    private readonly widgetsService: WidgetsService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * POST /api/upload/profile
   * อัปโหลดไฟล์รูป profile (heroImage, contactImage)
   */
  @Post('profile')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfileFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    console.log(`📤 Uploading profile file: ${file.originalname}`);
    return this.uploadService.uploadFile(file, 'profile');
  }

  /**
   * POST /api/upload/portfolio?portfolioId=123&owner=username
   * อัปโหลดไฟล์รูป portfolio และบันทึก imageUrl ลง database (ถ้ามี portfolioId)
   */
  @Post('portfolio')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPortfolioFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('portfolioId') portfolioId?: string,
    @Query('owner') owner?: string,
    @Body('portfolioId') bodyPortfolioId?: string,
    @Body('owner') bodyOwner?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // รับ portfolioId และ owner จาก query parameter หรือ body
    const id = portfolioId || bodyPortfolioId;
    const portfolioIdNum = id ? parseInt(id, 10) : null;
    const finalOwner = owner || bodyOwner;

    console.log(`📤 Uploading portfolio file: ${file.originalname}${portfolioIdNum ? ` for portfolio ID: ${portfolioIdNum}` : ''}${finalOwner ? ` for owner: ${finalOwner}` : ''}`);

    // อัปโหลดไปยัง S3
    const uploadResult = await this.uploadService.uploadFile(file, 'portfolio', finalOwner);

    // ถ้ามี portfolioId ให้บันทึก relativePath ลง database (ไม่ใช่ proxy URL)
    if (portfolioIdNum) {
      try {
        await this.prisma.portfolio.update({
          where: { id: portfolioIdNum },
          data: { image: uploadResult.relativePath }, // บันทึก relative path (เช่น uploads/portfolio/image.jpg) แทน proxy URL
        });
        console.log(`✅ Updated portfolio ID ${portfolioIdNum} with relativePath: ${uploadResult.relativePath}`);
      } catch (error) {
        console.error(`❌ Error updating portfolio ID ${portfolioIdNum}:`, error);
        // ไม่ throw error เพราะอัปโหลดสำเร็จแล้ว แค่บันทึกไม่สำเร็จ
      }
    }

    return {
      ...uploadResult,
      portfolioId: portfolioIdNum,
    };
  }

  /**
   * POST /api/upload/widget?widgetId=123&owner=username
   * อัปโหลดไฟล์รูป widget และบันทึก imageUrl ลง database
   */
  @Post('widget')
  @UseInterceptors(FileInterceptor('file'))
  async uploadWidgetFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('widgetId') widgetId?: string,
    @Query('owner') owner?: string,
    @Body('widgetId') bodyWidgetId?: string,
    @Body('owner') bodyOwner?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // รับ widgetId และ owner จาก query parameter หรือ body
    const id = widgetId || bodyWidgetId;
    const widgetIdNum = id ? parseInt(id, 10) : null;
    const finalOwner = owner || bodyOwner;

    console.log(`📤 Uploading widget file: ${file.originalname}${widgetIdNum ? ` for widget ID: ${widgetIdNum}` : ''}${finalOwner ? ` for owner: ${finalOwner}` : ''}`);

    // อัปโหลดไปยัง S3 พร้อม owner เพื่อแยก path ตาม user
    const uploadResult = await this.uploadService.uploadFile(file, 'widget', finalOwner);

    // ถ้ามี widgetId ให้บันทึก relativePath ลง database (ไม่ใช่ proxy URL)
    if (widgetIdNum) {
      try {
        await this.widgetsService.updateWidget(widgetIdNum, {
          imageUrl: uploadResult.relativePath, // บันทึก relative path (เช่น uploads/widget/username/image.jpg) แทน proxy URL
        });
        console.log(`✅ Updated widget ID ${widgetIdNum} with relativePath: ${uploadResult.relativePath}`);
      } catch (error) {
        console.error(`❌ Error updating widget ID ${widgetIdNum}:`, error);
        // ไม่ throw error เพราะอัปโหลดสำเร็จแล้ว แค่บันทึกไม่สำเร็จ
      }
    }

    return {
      ...uploadResult,
      widgetId: widgetIdNum,
    };
  }
}

