-- Add recipientId column to scope messages per owner
ALTER TABLE `ContactMessage`
ADD COLUMN `recipientId` INT NULL;

-- Add index after column is created
ALTER TABLE `ContactMessage`
ADD INDEX `ContactMessage_recipientId_idx` (`recipientId`);

-- Add foreign key constraint
ALTER TABLE `ContactMessage`
ADD CONSTRAINT `ContactMessage_recipientId_fkey`
FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

