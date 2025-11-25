-- Add recipientId column to scope messages per owner
ALTER TABLE `ContactMessage`
ADD COLUMN `recipientId` INT NULL,
ADD INDEX `ContactMessage_recipientId_idx` (`recipientId`);

ALTER TABLE `ContactMessage`
ADD CONSTRAINT `ContactMessage_recipientId_fkey`
FOREIGN KEY (`recipientId`) REFERENCES `User`(`id`)
ON DELETE SET NULL
ON UPDATE CASCADE;

