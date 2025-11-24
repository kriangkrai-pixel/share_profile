-- AlterTable
-- Add userId column to EditHistory table (nullable first for existing records)
ALTER TABLE `EditHistory` ADD COLUMN `userId` INTEGER NULL;

-- Update existing records to assign them to the first user (if exists)
-- If no users exist, this will fail, but that's okay as the table should be empty
UPDATE `EditHistory` SET `userId` = (SELECT `id` FROM `User` LIMIT 1) WHERE `userId` IS NULL;

-- Now make userId NOT NULL (this will fail if there are still NULL values, but that means no users exist)
ALTER TABLE `EditHistory` MODIFY COLUMN `userId` INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX `EditHistory_userId_idx` ON `EditHistory`(`userId`);

-- AddForeignKey
ALTER TABLE `EditHistory` ADD CONSTRAINT `EditHistory_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

