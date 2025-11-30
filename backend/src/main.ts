import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { json, urlencoded } from 'express';

let appInstance: any = null;

async function createApp() {
  const app = await NestFactory.create(AppModule);

  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Handle static files (favicon.ico, robots.txt, etc.) - return 404 instead of 500
  app.use((req, res, next) => {
    // ถ้าเป็น static files ที่ไม่ใช่ API routes ให้ return 404
    if (req.path === '/favicon.ico' || req.path === '/robots.txt' || req.path === '/sitemap.xml') {
      return res.status(404).end();
    }
    next();
  });

  
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

// ตรวจสอบว่าเป็น Vercel serverless หรือไม่
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL_ENV;

// ถ้าไม่ใช่ Vercel ให้รัน bootstrap() (รองรับ Render, Railway, Docker, local development)
if (!isVercel) {
  bootstrap().catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
}

// Export สำหรับ Vercel serverless function
export default async (req: any, res: any) => {
  try {
    if (!appInstance) {
      console.log('🚀 Initializing NestJS app for Vercel...');
      console.log('📝 Request URL:', req.url);
      console.log('📝 Request Method:', req.method);
      console.log('📝 NODE_ENV:', process.env.NODE_ENV);
      console.log('📝 DATABASE_URL exists:', !!process.env.DATABASE_URL);
      
      appInstance = await createApp();
      console.log('✅ NestJS app initialized successfully');
    }
    
    const handler = appInstance.getHttpAdapter().getInstance();
    return handler(req, res);
  } catch (error) {
    console.error('❌ Error in Vercel serverless function:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      });
    }
  }
};

