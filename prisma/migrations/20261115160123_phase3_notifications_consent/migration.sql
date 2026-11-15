-- AlterTable
ALTER TABLE `booking` ADD COLUMN `locationConsentAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `Notification` (
    `notificationID` VARCHAR(191) NOT NULL,
    `userID` VARCHAR(191) NOT NULL,
    `type` VARCHAR(40) NOT NULL,
    `title` VARCHAR(140) NOT NULL,
    `body` VARCHAR(500) NOT NULL,
    `href` VARCHAR(200) NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Notification_userID_createdAt_idx`(`userID`, `createdAt`),
    PRIMARY KEY (`notificationID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Notification` ADD CONSTRAINT `Notification_userID_fkey` FOREIGN KEY (`userID`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
