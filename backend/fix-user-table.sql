-- Fix User table: Add username column if it doesn't exist
-- First, check if username column exists, if not add it as nullable
SET @col_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'User' 
    AND COLUMN_NAME = 'username'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE `User` ADD COLUMN `username` VARCHAR(191) NULL AFTER `id`',
    'SELECT "Column username already exists"'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing rows with temporary usernames if username is NULL
UPDATE `User` SET `username` = CONCAT('User', `id`) WHERE `username` IS NULL;

-- Make username NOT NULL
ALTER TABLE `User` MODIFY COLUMN `username` VARCHAR(191) NOT NULL;

-- Add unique index for username (check if exists first)
SET @idx_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'User' 
    AND INDEX_NAME = 'User_username_key'
);

SET @sql_idx = IF(@idx_exists = 0,
    'ALTER TABLE `User` ADD UNIQUE INDEX `User_username_key`(`username`)',
    'SELECT "Index already exists"'
);
PREPARE stmt_idx FROM @sql_idx;
EXECUTE stmt_idx;
DEALLOCATE PREPARE stmt_idx;

-- Add regular index for username
SET @idx_exists2 = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'User' 
    AND INDEX_NAME = 'User_username_idx'
);

SET @sql_idx2 = IF(@idx_exists2 = 0,
    'ALTER TABLE `User` ADD INDEX `User_username_idx`(`username`)',
    'SELECT "Index already exists"'
);
PREPARE stmt_idx2 FROM @sql_idx2;
EXECUTE stmt_idx2;
DEALLOCATE PREPARE stmt_idx2;

-- Create PageContent table if it doesn't exist
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
    PRIMARY KEY (`id`),
    UNIQUE INDEX `PageContent_userId_key`(`userId`),
    INDEX `PageContent_userId_idx`(`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add foreign key for PageContent
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'PageContent' 
    AND CONSTRAINT_NAME = 'PageContent_userId_fkey'
);

SET @sql2 = IF(@fk_exists = 0,
    'ALTER TABLE `PageContent` ADD CONSTRAINT `PageContent_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE',
    'SELECT "Foreign key already exists"'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- Add pageContentId columns to existing tables if they don't exist
SET @col_skill = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Skill' 
    AND COLUMN_NAME = 'pageContentId'
);
SET @sql_skill = IF(@col_skill = 0,
    'ALTER TABLE `Skill` ADD COLUMN `pageContentId` INTEGER NULL',
    'SELECT "Column already exists"'
);
PREPARE stmt_skill FROM @sql_skill;
EXECUTE stmt_skill;
DEALLOCATE PREPARE stmt_skill;

SET @col_edu = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Education' 
    AND COLUMN_NAME = 'pageContentId'
);
SET @sql_edu = IF(@col_edu = 0,
    'ALTER TABLE `Education` ADD COLUMN `pageContentId` INTEGER NULL',
    'SELECT "Column already exists"'
);
PREPARE stmt_edu FROM @sql_edu;
EXECUTE stmt_edu;
DEALLOCATE PREPARE stmt_edu;

SET @col_exp = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Experience' 
    AND COLUMN_NAME = 'pageContentId'
);
SET @sql_exp = IF(@col_exp = 0,
    'ALTER TABLE `Experience` ADD COLUMN `pageContentId` INTEGER NULL',
    'SELECT "Column already exists"'
);
PREPARE stmt_exp FROM @sql_exp;
EXECUTE stmt_exp;
DEALLOCATE PREPARE stmt_exp;

SET @col_port = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Portfolio' 
    AND COLUMN_NAME = 'pageContentId'
);
SET @sql_port = IF(@col_port = 0,
    'ALTER TABLE `Portfolio` ADD COLUMN `pageContentId` INTEGER NULL',
    'SELECT "Column already exists"'
);
PREPARE stmt_port FROM @sql_port;
EXECUTE stmt_port;
DEALLOCATE PREPARE stmt_port;

-- Add indexes for pageContentId (check if exists first)
SET @idx_skill = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Skill' 
    AND INDEX_NAME = 'Skill_pageContentId_idx'
);
SET @sql_idx_skill = IF(@idx_skill = 0,
    'CREATE INDEX `Skill_pageContentId_idx` ON `Skill`(`pageContentId`)',
    'SELECT "Index already exists"'
);
PREPARE stmt_idx_skill FROM @sql_idx_skill;
EXECUTE stmt_idx_skill;
DEALLOCATE PREPARE stmt_idx_skill;

SET @idx_edu = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Education' 
    AND INDEX_NAME = 'Education_pageContentId_idx'
);
SET @sql_idx_edu = IF(@idx_edu = 0,
    'CREATE INDEX `Education_pageContentId_idx` ON `Education`(`pageContentId`)',
    'SELECT "Index already exists"'
);
PREPARE stmt_idx_edu FROM @sql_idx_edu;
EXECUTE stmt_idx_edu;
DEALLOCATE PREPARE stmt_idx_edu;

SET @idx_exp = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Experience' 
    AND INDEX_NAME = 'Experience_pageContentId_idx'
);
SET @sql_idx_exp = IF(@idx_exp = 0,
    'CREATE INDEX `Experience_pageContentId_idx` ON `Experience`(`pageContentId`)',
    'SELECT "Index already exists"'
);
PREPARE stmt_idx_exp FROM @sql_idx_exp;
EXECUTE stmt_idx_exp;
DEALLOCATE PREPARE stmt_idx_exp;

SET @idx_port = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'Portfolio' 
    AND INDEX_NAME = 'Portfolio_pageContentId_idx'
);
SET @sql_idx_port = IF(@idx_port = 0,
    'CREATE INDEX `Portfolio_pageContentId_idx` ON `Portfolio`(`pageContentId`)',
    'SELECT "Index already exists"'
);
PREPARE stmt_idx_port FROM @sql_idx_port;
EXECUTE stmt_idx_port;
DEALLOCATE PREPARE stmt_idx_port;

