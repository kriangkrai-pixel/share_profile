import { Controller, Get, Req, Res, NotFoundException } from '@nestjs/common';
import { Response, Request } from 'express';
import { ImagesService } from './images.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) {}

  /**
   * GET /api/images/*
   * Serve รูปภาพจาก S3 (private) ผ่าน proxy endpoint
   * 
   * ตัวอย่าง:
   * GET /api/images/uploads/portfolio/image.jpg
   * GET /api/images/uploads/profile/hero.jpg
   */
  @Get('*')
  async getImage(@Req() req: Request, @Res() res: Response) {
    // ✅ ใช้ req.params['0'] สำหรับ wildcard routes ใน NestJS
    // NestJS จะ extract wildcard path ให้อัตโนมัติ
    let path = req.params['0'] || req.params[0];
    
    // ✅ Fallback: ถ้าไม่มี params ให้ extract จาก req.url หรือ req.path
    if (!path) {
      // req.path ใน NestJS จะเป็น "/images/uploads/..." (ไม่มี /api เพราะ global prefix)
      // req.url อาจมี query string
      const urlPath = req.url.split('?')[0]; // ตัด query string ออก
      
      // ลอง extract จาก req.path ก่อน (ไม่มี /api)
      if (req.path && req.path.startsWith('/images/')) {
        path = req.path.replace(/^\/images\//, '');
      } 
      // ถ้ายังไม่มี ให้ลอง extract จาก req.url (อาจมี /api)
      else if (urlPath) {
        const match = urlPath.match(/\/(?:api\/)?images\/(.+)/);
        if (match && match[1]) {
          path = match[1];
        }
      }
    }
    
    console.log(`🖼️ Fetching image via proxy: ${path}`);
    console.log(`🔍 Request URL: ${req.url}`);
    console.log(`🔍 Request path: ${req.path}`);
    console.log(`🔍 Request params:`, req.params);
    console.log(`🔍 Extracted path: ${path}`);
    
    if (!path || path === '/') {
      throw new NotFoundException('Image path is required');
    }

    try {
      // ✅ Normalize path: เพิ่ม leading slash ถ้ายังไม่มี
      // Path ควรเป็น "/uploads/portfolio/..." เพื่อให้ตรงกับ S3 key format
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      
      console.log(`🔍 Normalized path for S3: ${normalizedPath}`);
      
      const { body, contentType } = await this.imagesService.getImage(normalizedPath);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('Content-Length', body.length.toString());

      res.send(body);
    } catch (error: any) {
      console.error(`❌ Error fetching image: ${path}`, {
        path,
        normalizedPath: path.startsWith('/') ? path : `/${path}`,
        error: error.message,
        errorName: error.name,
        stack: error.stack?.substring(0, 500), // จำกัด stack trace
      });
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve image',
        error: error.message,
      });
    }
  }
}

