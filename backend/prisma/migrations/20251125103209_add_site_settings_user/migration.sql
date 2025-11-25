/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `Profile` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[userId]` on the table `SiteSettings` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Profile` table without a default value. This is not possible if the table is not empty.
  - Added the required column `email` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `Profile` ADD COLUMN `userId` INTEGER NOT NULL,
    MODIFY `name` VARCHAR(191) NOT NULL DEFAULT 'Name',
    MODIFY `email` VARCHAR(191) NOT NULL DEFAULT 'Email',
    MODIFY `phone` VARCHAR(191) NOT NULL DEFAULT 'เบอร์โทรศัพท์',
    MODIFY `location` VARCHAR(191) NOT NULL DEFAULT 'ที่อยู่';

-- AlterTable
ALTER TABLE `SiteSettings` ADD COLUMN `userId` INTEGER NULL,
    MODIFY `footerEmail` VARCHAR(191) NOT NULL DEFAULT 'email',
    MODIFY `footerLocation` VARCHAR(191) NOT NULL DEFAULT 'location',
    MODIFY `footerLogoText` VARCHAR(191) NOT NULL DEFAULT 'logo',
    MODIFY `headerLogoText` VARCHAR(191) NOT NULL DEFAULT 'logo';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `email` VARCHAR(191) NOT NULL,
    ADD COLUMN `name` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Profile_userId_key` ON `Profile`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `SiteSettings_userId_key` ON `SiteSettings`(`userId`);

-- CreateIndex
CREATE UNIQUE INDEX `User_email_key` ON `User`(`email`);

-- AddForeignKey
ALTER TABLE `Profile` ADD CONSTRAINT `Profile_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Skill` ADD CONSTRAINT `Skill_pageContentId_fkey` FOREIGN KEY (`pageContentId`) REFERENCES `PageContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Education` ADD CONSTRAINT `Education_pageContentId_fkey` FOREIGN KEY (`pageContentId`) REFERENCES `PageContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Experience` ADD CONSTRAINT `Experience_pageContentId_fkey` FOREIGN KEY (`pageContentId`) REFERENCES `PageContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Portfolio` ADD CONSTRAINT `Portfolio_pageContentId_fkey` FOREIGN KEY (`pageContentId`) REFERENCES `PageContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SiteSettings` ADD CONSTRAINT `SiteSettings_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
