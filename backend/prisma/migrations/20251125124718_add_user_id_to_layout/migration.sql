-- AlterTable
ALTER TABLE `Layout` ADD COLUMN `userId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Layout_userId_idx` ON `Layout`(`userId`);

-- CreateIndex
CREATE INDEX `Layout_isActive_idx` ON `Layout`(`isActive`);

-- AddForeignKey
ALTER TABLE `Layout` ADD CONSTRAINT `Layout_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
