import { Injectable } from '@nestjs/common';
import { ThemePreference } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateThemePreferenceDto } from './dto/update-theme-preference.dto';

type ThemeColorTokens = {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  headerBgColor: string;
  headerTextColor: string;
  footerBgColor: string;
  footerTextColor: string;
};

type ThemePreferenceResponse = ThemeColorTokens & {
  isCustom: boolean;
  updatedAt?: Date;
};

const DEFAULT_THEME: ThemeColorTokens = {
  primaryColor: '#3b82f6',
  secondaryColor: '#8b5cf6',
  accentColor: '#10b981',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  headerBgColor: '#ffffff',
  headerTextColor: '#1f2937',
  footerBgColor: '#1f2937',
  footerTextColor: '#ffffff',
};

@Injectable()
export class ThemePreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getThemeForUser(userId: number): Promise<ThemePreferenceResponse> {
    try {
      const [preference, fallback] = await Promise.all([
        this.prisma.themePreference.findUnique({
          where: { userId },
        }),
        this.resolveGlobalFallback(),
      ]);

      return this.composeResponse(preference, fallback);
    } catch (error) {
      console.error(`❌ Failed to load theme for user ${userId}:`, error);
      return this.getDefaultTheme();
    }
  }

  async getThemeForUsername(username: string): Promise<ThemePreferenceResponse> {
    const normalized = username?.trim().toLowerCase();
    if (!normalized) {
      return this.getDefaultTheme();
    }

    try {
      const user = await this.prisma.user.findFirst({
        where: { username: normalized },
      });

      if (!user) {
        return this.getDefaultTheme();
      }

      return this.getThemeForUser(user.id);
    } catch (error) {
      console.error(`❌ Failed to load theme for username "${username}":`, error);
      return this.getDefaultTheme();
    }
  }

  async updateTheme(
    userId: number,
    dto: UpdateThemePreferenceDto,
  ): Promise<ThemePreferenceResponse> {
    const payload = this.buildPayload(dto);
    const hasUpdates = Object.keys(payload).length > 0;

    if (!hasUpdates) {
      return this.getThemeForUser(userId);
    }

    await this.prisma.themePreference
      .upsert({
        where: { userId },
        create: {
          userId,
          ...payload,
        },
        update: payload,
      })
      .catch((error) => {
        console.error(`❌ Failed to update theme for user ${userId}:`, error);
        throw error;
      });

    return this.getThemeForUser(userId);
  }

  async getDefaultTheme(): Promise<ThemePreferenceResponse> {
    const fallback = await this.resolveGlobalFallback();
    return {
      ...fallback,
      isCustom: false,
      updatedAt: undefined,
    };
  }

  private buildPayload(dto: UpdateThemePreferenceDto) {
    const payload: Partial<ThemePreference> = {};

    const setIfDefined = <K extends keyof ThemePreference>(
      key: K,
      value: ThemePreference[K] | undefined,
    ) => {
      if (value !== undefined) {
        payload[key] = value;
      }
    };

    setIfDefined('primaryColor', dto.primaryColor);
    setIfDefined('secondaryColor', dto.secondaryColor);
    setIfDefined('accentColor', dto.accentColor);
    setIfDefined('backgroundColor', dto.backgroundColor);
    setIfDefined('textColor', dto.textColor);
    setIfDefined('headerBgColor', dto.headerBgColor);
    setIfDefined('headerTextColor', dto.headerTextColor);
    setIfDefined('footerBgColor', dto.footerBgColor);
    setIfDefined('footerTextColor', dto.footerTextColor);

    return payload;
  }

  private async resolveGlobalFallback(): Promise<ThemeColorTokens> {
    try {
      const settings = await this.prisma.siteSettings.findFirst();
      if (!settings) {
        return DEFAULT_THEME;
      }

      return {
        primaryColor: settings.primaryColor || DEFAULT_THEME.primaryColor,
        secondaryColor: settings.secondaryColor || DEFAULT_THEME.secondaryColor,
        accentColor: settings.accentColor || DEFAULT_THEME.accentColor,
        backgroundColor: settings.backgroundColor || DEFAULT_THEME.backgroundColor,
        textColor: settings.textColor || DEFAULT_THEME.textColor,
        headerBgColor: settings.headerBgColor || DEFAULT_THEME.headerBgColor,
        headerTextColor: settings.headerTextColor || DEFAULT_THEME.headerTextColor,
        footerBgColor: settings.footerBgColor || DEFAULT_THEME.footerBgColor,
        footerTextColor: settings.footerTextColor || DEFAULT_THEME.footerTextColor,
      };
    } catch (error) {
      console.error('❌ Failed to resolve global theme fallback:', error);
      return DEFAULT_THEME;
    }
  }

  private composeResponse(
    preference: ThemePreference | null,
    fallback: ThemeColorTokens,
  ): ThemePreferenceResponse {
    if (!preference) {
      return {
        ...fallback,
        isCustom: false,
        updatedAt: undefined,
      };
    }

    return {
      primaryColor: preference.primaryColor || fallback.primaryColor,
      secondaryColor: preference.secondaryColor || fallback.secondaryColor,
      accentColor: preference.accentColor || fallback.accentColor,
      backgroundColor: preference.backgroundColor || fallback.backgroundColor,
      textColor: preference.textColor || fallback.textColor,
      headerBgColor: preference.headerBgColor || fallback.headerBgColor,
      headerTextColor: preference.headerTextColor || fallback.headerTextColor,
      footerBgColor: preference.footerBgColor || fallback.footerBgColor,
      footerTextColor: preference.footerTextColor || fallback.footerTextColor,
      isCustom: true,
      updatedAt: preference.updatedAt,
    };
  }
}

