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

  constructor(private readonly s3Service: S3Service) {}

  async getTheme(username?: string): Promise<ThemeConfig> {
    const normalized = this.normalizeUsername(username);

    if (!normalized) {
      return mergeThemeConfig(DEFAULT_THEME_CONFIG);
    }

    const key = `${this.prefix}/${normalized}.json`;

    try {
      const { body } = await this.s3Service.getFile(key);
      const parsed = JSON.parse(body.toString('utf-8'));
      return mergeThemeConfig(DEFAULT_THEME_CONFIG, parsed, normalized);
    } catch (error: any) {
      const message =
        typeof error?.message === 'string'
          ? error.message
          : 'unknown error';
      this.logger.warn(
        `Falling back to default theme for "${normalized}": ${message}`,
      );
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

