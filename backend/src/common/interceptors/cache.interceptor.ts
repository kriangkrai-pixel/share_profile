import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.method}:${request.url}`;

    // Skip caching for POST/PUT/DELETE/PATCH
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) {
      return next.handle();
    }

    // Skip caching for authenticated requests (อาจมีข้อมูลที่เปลี่ยนแปลง)
    if (request.headers.authorization) {
      return next.handle();
    }

    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        this.cache.set(key, {
          data,
          expiry: Date.now() + this.TTL,
        });
      }),
    );
  }

  // Method สำหรับ clear cache (ถ้าต้องการ)
  clearCache() {
    this.cache.clear();
  }
}

