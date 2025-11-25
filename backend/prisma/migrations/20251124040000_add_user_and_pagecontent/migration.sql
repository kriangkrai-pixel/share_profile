-- CreateTable
CREATE TABLE IF NOT EXISTS `User` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_username_key`(`username`),
    INDEX `User_username_idx`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE IF NOT EXISTS `PageContent` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT '',
    `email` VARCHAR(191) NOT NULL DEFAULT '',
    `phone` VARCHAR(191) NOT NULL DEFAULT '',
    `location` VARCHAR(191) NOT NULL DEFAULT '',
    `description` TEXT NOT NULL,
    `bio` TEXT NOT NULL,
    `achievement` TEXT NOT NULL,
    `heroImage` TEXT NULL,
    `contactImage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PageContent_userId_key`(`userId`),
    INDEX `PageContent_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add new columns to existing tables (make them nullable first)
ALTER TABLE `Skill` ADD COLUMN `pageContentId` INTEGER NULL;
ALTER TABLE `Education` ADD COLUMN `pageContentId` INTEGER NULL;
ALTER TABLE `Experience` ADD COLUMN `pageContentId` INTEGER NULL;
ALTER TABLE `Portfolio` ADD COLUMN `pageContentId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Skill_pageContentId_idx` ON `Skill`(`pageContentId`);
CREATE INDEX `Education_pageContentId_idx` ON `Education`(`pageContentId`);
CREATE INDEX `Experience_pageContentId_idx` ON `Experience`(`pageContentId`);
CREATE INDEX `Portfolio_pageContentId_idx` ON `Portfolio`(`pageContentId`);

-- AddForeignKey (only if the foreign key doesn't exist)
-- Note: MySQL doesn't support IF NOT EXISTS for foreign keys, so we'll need to handle errors
SET @foreign_key_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'PageContent' 
    AND CONSTRAINT_NAME = 'PageContent_userId_fkey'
);

SET @sql = IF(@foreign_key_exists = 0,
    'ALTER TABLE `PageContent` ADD CONSTRAINT `PageContent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign keys for Skill, Education, Experience, Portfolio
-- These will be added conditionally in the application layer if needed

