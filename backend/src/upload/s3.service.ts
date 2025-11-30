import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;
  private readonly cdnUrl?: string;
  private readonly apiBaseUrl: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('DO_SPACES_ENDPOINT');
    const region = this.configService.get<string>('DO_SPACES_REGION');
    const accessKeyId = this.configService.get<string>('DO_SPACES_KEY');
    const secretAccessKey = this.configService.get<string>('DO_SPACES_SECRET');

    if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing DigitalOcean Spaces configuration');
    }

    this.bucket = this.configService.get<string>('DO_SPACES_BUCKET') || '';
    this.publicUrl = this.configService.get<string>('DO_SPACES_PUBLIC_URL') || '';
    this.cdnUrl = this.configService.get<string>('DO_SPACES_CDN_URL');
    
    // สร้าง API base URL จาก PORT หรือใช้ environment variable
    const port = this.configService.get<string>('PORT') || '3001';
    const apiBaseUrlEnv = this.configService.get<string>('API_BASE_URL') || 
                          this.configService.get<string>('NEXT_PUBLIC_API_URL');
    
    if (apiBaseUrlEnv) {
      this.apiBaseUrl = apiBaseUrlEnv;
      this.logger.log(`📡 API Base URL from environment: ${this.apiBaseUrl}`);
    } else {
      // สร้าง URL จาก PORT (สำหรับ development)
      this.apiBaseUrl = `http://localhost:${port}/api`;
      this.logger.warn(`⚠️ API_BASE_URL not set, using default: ${this.apiBaseUrl}`);
      this.logger.warn(`💡 Please set API_BASE_URL or NEXT_PUBLIC_API_URL environment variable for production`);
    }

    this.s3Client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });

    this.logger.log('S3Service initialized');
  }

  /**
   * สร้าง unique filename เพื่อป้องกันการชนกัน
   */
  private generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '-');
    return `${nameWithoutExt}-${timestamp}-${random}.${extension}`;
  }

  /**
   * อัปโหลดไฟล์ไปยัง DigitalOcean Spaces
   * @param file ไฟล์ที่ต้องการอัปโหลด
   * @param type ประเภทไฟล์ (profile, portfolio, widget)
   * @param owner username หรือ user identifier สำหรับแยก path ตาม user
   * @returns relative path ของไฟล์ที่อัปโหลด (เช่น /uploads/widget/username/image.jpg)
   */
  async uploadFile(file: Express.Multer.File, type: string, owner?: string): Promise<string> {
    if (!file) {
      throw new Error('No file provided');
    }

    // Validate type
    const allowedTypes = ['profile', 'portfolio', 'widget'];
    if (!allowedTypes.includes(type)) {
      throw new Error(`Invalid type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // สร้าง unique filename
    const uniqueFileName = this.generateUniqueFileName(file.originalname);
    
    // แยก path ตาม owner (user) สำหรับ widget type เท่านั้น
    // profile และ portfolio อาจจะยังไม่ต้องแยก (ขึ้นอยู่กับความต้องการ)
    let key: string;
    if (type === 'widget' && owner) {
      // สำหรับ widget ให้แยกตาม user: uploads/widget/{username}/image.jpg
      // ทำความสะอาด owner เพื่อใช้เป็น path (ลบ special characters)
      const cleanOwner = owner.replace(/[^a-zA-Z0-9_-]/g, '_');
      key = `uploads/${type}/${cleanOwner}/${uniqueFileName}`;
    } else {
      // สำหรับ profile และ portfolio หรือ widget ที่ไม่มี owner
      key = `uploads/${type}/${uniqueFileName}`;
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: 'private', // ทำให้ไฟล์เป็น private (ไม่สามารถเข้าถึงได้โดยตรง)
      });

      await this.s3Client.send(command);
      this.logger.log(`File uploaded successfully: ${key} (private)`);

      // Return relative path โดยไม่มี leading slash (เช่น uploads/widget/username/image.jpg)
      // เพื่อให้บันทึกลง database ได้ง่าย และ getProxyUrl จะจัดการ leading slash ให้เอง
      return key;
    } catch (error) {
      this.logger.error(`Error uploading file: ${error.message}`, error.stack);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * อ่านไฟล์จาก DigitalOcean Spaces (private files)
   * @param relativePath relative path ของไฟล์ (เช่น /uploads/portfolio/image.jpg)
   * @returns Buffer และ ContentType ของไฟล์
   */
  async getFile(relativePath: string): Promise<{ body: Buffer; contentType: string }> {
    if (!relativePath) {
      throw new Error('No path provided');
    }

    // ลบ / หน้าแรกถ้ามี
    const key = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);
      
      if (!response.Body) {
        throw new Error('File not found');
      }

      // Convert stream to buffer
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }
      const buffer = Buffer.concat(chunks);

      const contentType = response.ContentType || 'application/octet-stream';

      this.logger.log(`File retrieved successfully: ${key}`);
      return { body: buffer, contentType };
    } catch (error: any) {
      // ปรับปรุง error handling ให้แสดงข้อมูลชัดเจนขึ้น
      const errorName = error.name || error.constructor?.name || 'UnknownError';
      const errorCode = error.$metadata?.httpStatusCode || error.Code || error.statusCode || 'N/A';
      const errorMessage = error.message || String(error) || 'Unknown error occurred';
      const requestId = error.$metadata?.requestId || error.RequestId || 'N/A';
      
      // ตรวจสอบว่าเป็น NoSuchKey (ไฟล์ไม่มี) หรือไม่
      const isNotFound = 
        errorName === 'NoSuchKey' ||
        errorName === 'NotFound' ||
        errorCode === 404 ||
        errorMessage.includes('NoSuchKey') ||
        errorMessage.includes('not found') ||
        errorMessage.includes('NotFound') ||
        errorMessage.includes('does not exist');
      
      if (isNotFound) {
        // ไฟล์ไม่มีใน S3 - ไม่ใช่ error ร้ายแรง (เป็นเรื่องปกติสำหรับ theme config)
        // ไม่ต้อง log เพราะเป็นเรื่องปกติ (ลด log noise)
        // this.logger.debug(`File not found in S3: ${key} (this is normal for new users)`);
        throw new Error(`File not found: ${key}`);
      }
      
      // สำหรับ UnknownError ให้ลองหา error details เพิ่มเติม
      let detailedMessage = errorMessage;
      if (errorName === 'UnknownError' || errorCode === 'N/A') {
        // ลองดึง error details จาก error object
        try {
          const errorDetails: any = {
            name: error.name,
            code: error.code,
            statusCode: error.statusCode,
            $metadata: error.$metadata,
            message: error.message,
            cause: error.cause,
          };
          // ลอง stringify error object เพื่อดูรายละเอียด
          detailedMessage = `UnknownError details: ${JSON.stringify(errorDetails)}`;
        } catch (e) {
          detailedMessage = `UnknownError: ${String(error)}`;
        }
      }
      
      // Log error พร้อมรายละเอียดเต็ม (สำหรับ error จริงๆ)
      this.logger.error(
        `Error retrieving file "${key}": ${errorName} (HTTP ${errorCode}, RequestId: ${requestId}) - ${detailedMessage}`,
        {
          key,
          bucket: this.bucket,
          errorName,
          errorCode,
          errorMessage: detailedMessage,
          requestId,
          stack: error.stack,
          fullError: error,
        },
      );
      
      // สร้าง error message ที่ชัดเจน
      throw new Error(`Failed to retrieve file: ${errorName} - ${detailedMessage}`);
    }
  }

  /**
   * สร้าง proxy URL จาก relative path
   * @param relativePath relative path ของไฟล์ (เช่น /uploads/portfolio/image.jpg)
   * @returns full proxy URL สำหรับ frontend (เช่น http://localhost:3001/api/images/uploads/portfolio/image.jpg)
   */
  getProxyUrl(relativePath: string): string {
    if (!relativePath) {
      return '';
    }

    // ลบ / หน้าแรกถ้ามี
    const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    
    // สร้าง full proxy URL โดยใช้ API_BASE_URL
    // ลบ /api ท้าย API_BASE_URL ถ้ามี (เพราะเราจะเพิ่ม /api/images เอง)
    let baseUrl = this.apiBaseUrl;
    if (baseUrl.endsWith('/api')) {
      baseUrl = baseUrl.slice(0, -4); // ลบ /api
    } else if (baseUrl.endsWith('/api/')) {
      baseUrl = baseUrl.slice(0, -5); // ลบ /api/
    }
    
    const proxyUrl = `${baseUrl}/api/images${path}`;
    this.logger.debug(`🔗 Generated proxy URL: ${proxyUrl} (from path: ${relativePath})`);
    
    return proxyUrl;
  }

  /**
   * ลบไฟล์จาก DigitalOcean Spaces
   * @param path relative path ของไฟล์ที่ต้องการลบ (เช่น /uploads/profile/image.jpg)
   * @returns true ถ้าลบสำเร็จ
   */
  async deleteFile(path: string): Promise<boolean> {
    if (!path) {
      throw new Error('No path provided');
    }

    // ลบ / หน้าแรกถ้ามี
    const key = path.startsWith('/') ? path.substring(1) : path;

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Error deleting file: ${error.message}`, error.stack);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * สร้าง full URL จาก relative path
   * @param relativePath relative path ของไฟล์
   * @returns full URL
   */
  getPublicUrl(relativePath: string): string {
    const baseUrl = this.cdnUrl || this.publicUrl;
    if (!baseUrl) {
      throw new Error('No public URL configured');
    }
    
    // ลบ / หน้าแรกถ้ามี
    const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
    return `${baseUrl}${path}`;
  }
}

