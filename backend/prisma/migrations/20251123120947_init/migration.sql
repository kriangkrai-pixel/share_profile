-- AlterTable
ALTER TABLE `Education` ADD COLUMN `status` VARCHAR(191) NULL DEFAULT 'studying';

-- AlterTable
ALTER TABLE `Portfolio` MODIFY `image` LONGTEXT NULL;

-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `footerDescription` TEXT NULL,
    ADD COLUMN `footerEmail` VARCHAR(191) NOT NULL DEFAULT 'kik550123@gmail.com',
    ADD COLUMN `footerLinks` TEXT NULL,
    ADD COLUMN `footerLocation` VARCHAR(191) NOT NULL DEFAULT 'ภูเก็ต, Thailand',
    ADD COLUMN `footerLogoText` VARCHAR(191) NOT NULL DEFAULT 'KRIANGKRAI.P',
    ADD COLUMN `footerTextColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    ADD COLUMN `headerLogoText` VARCHAR(191) NOT NULL DEFAULT 'KRIANGKRAI.P',
    ADD COLUMN `headerMenuItems` TEXT NULL,
    ADD COLUMN `headerTextColor` VARCHAR(191) NOT NULL DEFAULT '#1f2937';
