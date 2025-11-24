import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw error if no token
  // This allows the request to proceed even if there's no valid JWT token
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // ถ้ามี error หรือไม่มี user (ไม่มี token) ให้ return undefined แทนที่จะ throw error
    // Controller จะตรวจสอบ req.user?.userId และใช้ legacy method ถ้าไม่มี
    if (err || !user) {
      return undefined;
    }
    return user;
  }
}

