import { Injectable } from '@nestjs/common';
import { SiteSettings } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type HeaderMenuLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type HeaderCta = {
  label: string;
  href: string;
  external?: boolean;
  enabled?: boolean;
};

export interface HeaderMenuConfig {
  links: HeaderMenuLink[];
  cta?: HeaderCta;
}

export type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type SettingsResponse = Omit<SiteSettings, 'headerMenuItems' | 'footerLinks'> & {
  headerMenuItems: HeaderMenuConfig;
  footerLinks: FooterLink[];
};

const DEFAULT_HEADER_MENU: HeaderMenuConfig = {
  links: [
    { label: 'หน้าแรก', href: '/#hero' },
    { label: 'เกี่ยวกับฉัน', href: '/#about' },
    { label: 'ทักษะ', href: '/#skills' },
    { label: 'ผลงาน', href: '/#portfolio' },
    { label: 'ติดต่อ', href: '/#contact' },
  ],
  cta: {
    label: 'จ้างงานเลย',
    href: '/contact',
    enabled: true,
  },
};

const DEFAULT_FOOTER_LINKS: FooterLink[] = [
  { label: 'งานทั้งหมด', href: '/#portfolio' },
  { label: 'ประสบการณ์', href: '/#experience' },
  { label: 'ติดต่อ', href: '/#contact' },
];

const parseJson = <T>(value: string | null | undefined, fallback: T): T => {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    // Ensure parsed is object/array expected
    if (parsed === null || typeof parsed !== 'object') {
      return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
};

const serializeJson = (value: any) => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return JSON.stringify(value);
};

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  private buildDefaultData() {
    return {
      primaryColor: '#3b82f6',
      secondaryColor: '#8b5cf6',
      accentColor: '#10b981',
      backgroundColor: '#ffffff',
      textColor: '#1f2937',
      headerBgColor: '#ffffff',
      headerTextColor: '#1f2937',
      footerBgColor: '#1f2937',
      footerTextColor: '#ffffff',
      headerLogoText: 'PORTFOLIO.PRO',
      footerLogoText: 'PORTFOLIO.PRO',
      footerDescription: 'ช่วยคุณนำเสนอโปรไฟล์และผลงานอย่างมืออาชีพ',
      footerEmail: 'hello@portfolio.pro',
      footerLocation: 'Bangkok, Thailand',
      footerShowLocation: true,
      footerShowEmail: true,
      footerShowPhone: true,
      footerLinks: JSON.stringify(DEFAULT_FOOTER_LINKS),
      headerMenuItems: JSON.stringify(DEFAULT_HEADER_MENU),
    };
  }

  private toResponse(settings: SiteSettings): SettingsResponse {
    const headerMenu = parseJson<HeaderMenuConfig>(settings.headerMenuItems, DEFAULT_HEADER_MENU);
    const footerLinks = parseJson<FooterLink[]>(settings.footerLinks, DEFAULT_FOOTER_LINKS);
    return {
      ...settings,
      headerMenuItems: headerMenu,
      footerLinks,
    };
  }

  private async getOrCreateGlobalSettings(): Promise<SiteSettings> {
    let settings = await this.prisma.siteSettings.findFirst({
      where: { userId: null },
    });

    if (!settings) {
      settings = await this.prisma.siteSettings.create({
        data: {
          ...this.buildDefaultData(),
        } as any,
      });
    }

    return settings;
  }

  private async getOrCreateSettingsForUser(userId: number): Promise<SiteSettings> {
    let settings = await this.prisma.siteSettings.findUnique({
      where: { userId },
    });

    if (!settings) {
      settings = await this.prisma.siteSettings.create({
        data: {
          ...this.buildDefaultData(),
          user: {
            connect: { id: userId },
          },
        } as any,
      });
    }

    return settings;
  }

  async getSettings(): Promise<SettingsResponse> {
    const settings = await this.getOrCreateGlobalSettings();
    return this.toResponse(settings);
  }

  async getSettingsForUserId(userId: number): Promise<SettingsResponse> {
    const settings = await this.getOrCreateSettingsForUser(userId);
    return this.toResponse(settings);
  }

  async getSettingsByUsername(username: string): Promise<SettingsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (!user) {
      return this.getSettings();
    }

    const settings = await this.getOrCreateSettingsForUser(user.id);
    return this.toResponse(settings);
  }

  async updateSettings(data: any): Promise<SettingsResponse> {
    const {
      primaryColor,
      secondaryColor,
      accentColor,
      backgroundColor,
      textColor,
      headerBgColor,
      headerTextColor,
      footerBgColor,
      footerTextColor,
      headerLogoText,
      headerMenuItems,
      footerLogoText,
      footerDescription,
      footerEmail,
      footerLocation,
      footerShowLocation,
      footerShowEmail,
      footerShowPhone,
      footerLinks,
    } = data;

    // ดึงการตั้งค่าปัจจุบัน
    let settings = await this.prisma.siteSettings.findFirst({
      where: { userId: null },
    });

    if (!settings) {
      // สร้างใหม่ถ้ายังไม่มี
      settings = await this.prisma.siteSettings.create({
        data: {
          ...this.buildDefaultData(),
          primaryColor: primaryColor ?? '#3b82f6',
          secondaryColor: secondaryColor ?? '#8b5cf6',
          accentColor: accentColor ?? '#10b981',
          backgroundColor: backgroundColor ?? '#ffffff',
          textColor: textColor ?? '#1f2937',
          headerBgColor: headerBgColor ?? '#ffffff',
          headerTextColor: headerTextColor ?? '#1f2937',
          footerBgColor: footerBgColor ?? '#1f2937',
          footerTextColor: footerTextColor ?? '#ffffff',
          headerLogoText: headerLogoText ?? 'PORTFOLIO.PRO',
          footerLogoText: footerLogoText ?? 'PORTFOLIO.PRO',
          footerDescription: footerDescription ?? 'ช่วยคุณนำเสนอโปรไฟล์และผลงานอย่างมืออาชีพ',
          footerEmail: footerEmail ?? 'hello@portfolio.pro',
          footerLocation: footerLocation ?? 'Bangkok, Thailand',
          footerShowLocation: footerShowLocation ?? true,
          footerShowEmail: footerShowEmail ?? true,
          footerShowPhone: footerShowPhone ?? true,
          footerLinks: serializeJson(footerLinks ?? DEFAULT_FOOTER_LINKS),
          headerMenuItems: serializeJson(headerMenuItems ?? DEFAULT_HEADER_MENU),
        } as any,
      });
    } else {
      // อัปเดตค่าที่มีอยู่
      const updateData: any = {};
      if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
      if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
      if (accentColor !== undefined) updateData.accentColor = accentColor;
      if (backgroundColor !== undefined) updateData.backgroundColor = backgroundColor;
      if (textColor !== undefined) updateData.textColor = textColor;
      if (headerBgColor !== undefined) updateData.headerBgColor = headerBgColor;
      if (headerTextColor !== undefined) updateData.headerTextColor = headerTextColor;
      if (footerBgColor !== undefined) updateData.footerBgColor = footerBgColor;
      if (footerTextColor !== undefined) updateData.footerTextColor = footerTextColor;
      if (headerLogoText !== undefined) updateData.headerLogoText = headerLogoText;
      if (headerMenuItems !== undefined) updateData.headerMenuItems = serializeJson(headerMenuItems);
      if (footerLogoText !== undefined) updateData.footerLogoText = footerLogoText;
      if (footerDescription !== undefined) updateData.footerDescription = footerDescription;
      if (footerEmail !== undefined) updateData.footerEmail = footerEmail;
      if (footerLocation !== undefined) updateData.footerLocation = footerLocation;
      if (footerShowLocation !== undefined) updateData.footerShowLocation = footerShowLocation;
      if (footerShowEmail !== undefined) updateData.footerShowEmail = footerShowEmail;
      if (footerShowPhone !== undefined) updateData.footerShowPhone = footerShowPhone;
      if (footerLinks !== undefined) updateData.footerLinks = serializeJson(footerLinks);

      settings = await this.prisma.siteSettings.update({
        where: { id: settings.id },
        data: updateData,
      });
    }

    const headerMenu = parseJson<HeaderMenuConfig>(
      typeof settings.headerMenuItems === 'string' ? settings.headerMenuItems : JSON.stringify(settings.headerMenuItems),
      DEFAULT_HEADER_MENU,
    );
    const footerLinksParsed = parseJson<FooterLink[]>(
      typeof settings.footerLinks === 'string' ? settings.footerLinks : JSON.stringify(settings.footerLinks),
      DEFAULT_FOOTER_LINKS,
    );

    return {
      ...settings,
      headerMenuItems: headerMenu,
      footerLinks: footerLinksParsed,
    };
  }

  async updateSettingsForUser(userId: number, data: any): Promise<SettingsResponse> {
    const settings = await this.getOrCreateSettingsForUser(userId);
    const updateData: any = {};

    const fields: Array<keyof typeof data> = [
      'primaryColor',
      'secondaryColor',
      'accentColor',
      'backgroundColor',
      'textColor',
      'headerBgColor',
      'headerTextColor',
      'footerBgColor',
      'footerTextColor',
      'headerLogoText',
      'footerLogoText',
      'footerDescription',
      'footerEmail',
      'footerLocation',
      'footerShowLocation',
      'footerShowEmail',
      'footerShowPhone',
    ];

    fields.forEach((field) => {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    });

    if (data.headerMenuItems !== undefined) {
      updateData.headerMenuItems = serializeJson(data.headerMenuItems);
    }
    if (data.footerLinks !== undefined) {
      updateData.footerLinks = serializeJson(data.footerLinks);
    }

    const updated = await this.prisma.siteSettings.update({
      where: { id: settings.id },
      data: updateData,
    });

    return this.toResponse(updated);
  }
}

