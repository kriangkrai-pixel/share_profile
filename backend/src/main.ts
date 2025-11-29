import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { json, urlencoded } from 'express';

let appInstance: any = null;

async function createApp() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  
  // Enable CORS with proper configuration
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      process.env.FRONTEND_URL || 'http://localhost:3000',
      '*'
    ],
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Set-Cookie'],
  });

  // Enable validation with custom error messages
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    exceptionFactory: (errors) => {
      // แปลง validation errors เป็นข้อความภาษาไทย
      const messages = errors.map(error => {
        // ถ้ามี custom message ใน decorator ให้ใช้ข้อความนั้น
        if (error.constraints) {
          return Object.values(error.constraints)[0];
        }
        return `${error.property} ไม่ถูกต้อง`;
      });
      
      return new BadRequestException({
        statusCode: 400,
        message: messages,
        error: 'Validation failed'
      });
    }
  }));

  // Set global prefix
  app.setGlobalPrefix('api');

  return app;
}

async function bootstrap() {
  const app = await createApp();
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`🚀 Backend server is running on http://localhost:${port}`);
  console.log(`📦 Body parser limit: 10mb (supports Base64 images)`);
}

// ถ้าเป็นการรัน Local (ในเครื่องตัวเอง) ให้ทำงานปกติ
if (process.env.NODE_ENV !== 'production') {
  bootstrap();
}

// ถ้าอยู่บน Vercel ให้ Export ออกไปเป็น Function
export default async (req: any, res: any) => {
  if (!appInstance) {
    appInstance = await createApp();
    await appInstance.init();
  }
  
  const instance = appInstance.getHttpAdapter().getInstance();
  return instance(req, res);
};

