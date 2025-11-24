-- CreateTable
CREATE TABLE `ThemePreference` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#3b82f6',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#8b5cf6',
    `accentColor` VARCHAR(191) NOT NULL DEFAULT '#10b981',
    `backgroundColor` VARCHAR(191) NOT NULL DEFAULT '#ffffff',
    `textColor` VARCHAR(191) NOT NULL DEFAULT '#1f2937',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ThemePreference_userId_key`(`userId`),
    INDEX `ThemePreference_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ThemePreference` ADD CONSTRAINT `ThemePreference_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

