import { IsOptional, Matches } from 'class-validator';

const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export class UpdateThemePreferenceDto {
  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'primaryColor ต้องเป็นรหัสสี HEX เช่น #ffffff',
  })
  primaryColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'secondaryColor ต้องเป็นรหัสสี HEX เช่น #ffffff',
  })
  secondaryColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'accentColor ต้องเป็นรหัสสี HEX เช่น #ffffff',
  })
  accentColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'backgroundColor ต้องเป็นรหัสสี HEX เช่น #ffffff',
  })
  backgroundColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'textColor ต้องเป็นรหัสสี HEX เช่น #111111',
  })
  textColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'headerBgColor ต้องเป็นรหัสสี HEX เช่น #ffffff',
  })
  headerBgColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'headerTextColor ต้องเป็นรหัสสี HEX เช่น #111111',
  })
  headerTextColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'footerBgColor ต้องเป็นรหัสสี HEX เช่น #111111',
  })
  footerBgColor?: string;

  @IsOptional()
  @Matches(HEX_COLOR_REGEX, {
    message: 'footerTextColor ต้องเป็นรหัสสี HEX เช่น #ffffff',
  })
  footerTextColor?: string;
}

export { HEX_COLOR_REGEX };

