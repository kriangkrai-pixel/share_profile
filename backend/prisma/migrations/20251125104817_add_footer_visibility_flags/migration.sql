-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `footerShowEmail` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `footerShowLocation` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `footerShowPhone` BOOLEAN NOT NULL DEFAULT true;
