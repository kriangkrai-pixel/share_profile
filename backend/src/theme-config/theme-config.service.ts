import { Injectable, Logger } from '@nestjs/common';
import { S3Service } from '../upload/s3.service';
import { DEFAULT_THEME_CONFIG, ThemeConfig } from './default-theme';

function mergeThemeConfig(
  base: ThemeConfig,
  override?: Partial<ThemeConfig>,
  username?: string,
): ThemeConfig {
  if (!override) {
    return {
      ...base,
      metadata: {
        ...base.metadata,
        username: username || base.metadata?.username || 'default',
        updatedAt: base.metadata?.updatedAt,
      },
    };
  }

  return {
    ...base,
    ...override,
    palette: {
      ...base.palette,
      ...(override.palette || {}),
    },
    header: {
      ...base.header,
      ...(override.header || {}),
      links: override.header?.links ?? base.header.links,
      cta: override.header?.cta ?? base.header.cta,
    },
    footer: {
      ...base.footer,
      ...(override.footer || {}),
      links: override.footer?.links ?? base.footer.links,
      social: override.footer?.social ?? base.footer.social,
    },
    components: {
      ...base.components,
      ...(override.components || {}),
      buttons: {
        ...base.components.buttons,
        ...(override.components?.buttons || {}),
      },
      cards: {
        ...base.components.cards,
        ...(override.components?.cards || {}),
      },
    },
    background: {
      ...base.background,
      ...(override.background || {}),
    },
    metadata: {
      ...base.metadata,
      ...(override.metadata || {}),
      username:
        username ||
        override.metadata?.username ||
        base.metadata?.username ||
        'default',
    },
  };
}

@Injectable()
export class ThemeConfigService {
  private readonly logger = new Logger(ThemeConfigService.name);
  private readonly prefix = 'config/themes';
  // Cache สำหรับเก็บผลลัพธ์ว่า user ไหนไม่มี theme config (เพื่อลด S3 requests)
  private readonly notFoundCache = new Map<string, number>(); // username -> timestamp
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 นาที

  constructor(private readonly s3Service: S3Service) {}

  async getTheme(username?: string): Promise<ThemeConfig> {
    const normalized = this.normalizeUsername(username);

    if (!normalized) {
      return mergeThemeConfig(DEFAULT_THEME_CONFIG);
    }

    // ตรวจสอบ cache ว่ามีการตรวจสอบแล้วว่าไม่มีไฟล์หรือไม่
    const cachedNotFound = this.notFoundCache.get(normalized);
    if (cachedNotFound) {
      const now = Date.now();
      if (now - cachedNotFound < this.CACHE_TTL) {
        // ยังอยู่ใน cache TTL - ไม่ต้อง query S3 อีก
        return mergeThemeConfig(DEFAULT_THEME_CONFIG, undefined, normalized);
      } else {
        // Cache หมดอายุ - ลบออก
        this.notFoundCache.delete(normalized);
      }
    }

    const key = `${this.prefix}/${normalized}.json`;

    try {
      const { body } = await this.s3Service.getFile(key);
      const parsed = JSON.parse(body.toString('utf-8'));
      this.logger.log(`Theme config loaded successfully for "${normalized}"`);
      // ลบ cache ถ้ามี (เพราะตอนนี้มีไฟล์แล้ว)
      this.notFoundCache.delete(normalized);
      return mergeThemeConfig(DEFAULT_THEME_CONFIG, parsed, normalized);
    } catch (error: any) {
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'unknown error';
      
      // ถ้าเป็นไฟล์ไม่มี (not found)
      if (message.includes('not found') || message.includes('File not found')) {
        // เก็บใน cache เพื่อลด S3 requests ในอนาคต
        this.notFoundCache.set(normalized, Date.now());
        // ไม่ต้อง log เพราะเป็นเรื่องปกติ (ลด log noise)
        // this.logger.debug(`Theme config not found for "${normalized}", using default theme`);
      } else {
        // ถ้าเป็น error อื่นๆ (เช่น network, permission) แสดง warning
        this.logger.warn(
          `Falling back to default theme for "${normalized}": ${message}`,
        );
      }
      
      return mergeThemeConfig(DEFAULT_THEME_CONFIG, undefined, normalized);
    }
  }

  private normalizeUsername(username?: string): string | undefined {
    if (!username) {
      return undefined;
    }
    const trimmed = username.trim().toLowerCase();
    return trimmed || undefined;
  }
}

