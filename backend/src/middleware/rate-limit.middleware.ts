import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
  limit: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private requests = new Map<string, RateLimitRecord>();
  private readonly isProduction = process.env.NODE_ENV === 'production';
  private readonly isEnabled = process.env.RATE_LIMIT_ENABLED !== 'false';
  private readonly WINDOW_MS = this.parseIntEnv('RATE_LIMIT_WINDOW_MS', 60000);
  private readonly MAX_REQUESTS_ANON = this.parseIntEnv(
    'RATE_LIMIT_MAX_REQUESTS_ANON',
    this.isProduction ? 80 : 2000,
  );
  private readonly MAX_REQUESTS_AUTH = this.parseIntEnv(
    'RATE_LIMIT_MAX_REQUESTS_AUTH',
    this.isProduction ? 400 : 4000,
  );
  private readonly CLEANUP_INTERVAL = 300000; // Clean up every 5 minutes

  constructor() {
    // Cleanup old records periodically
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  use(req: Request, res: Response, next: NextFunction) {
    if (!this.isEnabled) {
      return next();
    }

    const ip = this.getClientIp(req);
    const now = Date.now();
    const hasAuthHeader = this.hasAuth(req);
    const limit = hasAuthHeader ? this.MAX_REQUESTS_AUTH : this.MAX_REQUESTS_ANON;

    if (limit <= 0) {
      return next();
    }

    const bucketKey = `${ip}:${hasAuthHeader ? 'auth' : 'anon'}`;
    let record = this.requests.get(bucketKey);

    // Check if record exists and is still valid
    if (!record || now > record.resetTime || record.limit !== limit) {
      record = { count: 1, resetTime: now + this.WINDOW_MS, limit };
      this.requests.set(bucketKey, record);
      this.setRateLimitHeaders(res, record.limit, record.limit - record.count, this.WINDOW_MS);
      return next();
    }

    // Check if limit exceeded
    if (record.count >= record.limit) {
      const retryAfter = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        success: false,
        error: 'Too Many Requests',
        message: 'กรุณารอสักครู่ก่อนลองใหม่ (Rate limit exceeded)',
        retryAfter,
      });
    }

    // Increment count
    record.count++;
    this.setRateLimitHeaders(
      res,
      record.limit,
      Math.max(0, record.limit - record.count),
      record.resetTime - now,
    );
    next();
  }

  private getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.ip ||
      req.connection.remoteAddress ||
      'unknown'
    );
  }

  private hasAuth(req: Request) {
    return Boolean(req.headers['authorization']);
  }

  private parseIntEnv(key: string, fallback: number) {
    const value = Number(process.env[key]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private setRateLimitHeaders(res: Response, limit: number, remaining: number, resetMs: number) {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, remaining).toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetMs / 1000).toString());
  }

  private cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(ip);
      }
    }
  }
}

