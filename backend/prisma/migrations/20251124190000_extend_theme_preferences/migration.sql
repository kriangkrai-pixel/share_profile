-- Add header/footer color tokens to per-user theme preferences
ALTER TABLE `ThemePreference`
  ADD COLUMN `headerBgColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
  ADD COLUMN `headerTextColor` VARCHAR(191) NOT NULL DEFAULT '#1f2937',
  ADD COLUMN `footerBgColor` VARCHAR(191) NOT NULL DEFAULT '#1f2937',
  ADD COLUMN `footerTextColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff';

