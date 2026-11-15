-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL,
    `image` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` VARCHAR(191) NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Session_token_key`(`token`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` VARCHAR(191) NULL,
    `password` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Account_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Verification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Verification_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Renter` (
    `renterID` VARCHAR(191) NOT NULL,
    `userID` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `verificationStatus` ENUM('Unverified', 'Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Unverified',

    UNIQUE INDEX `Renter_userID_key`(`userID`),
    INDEX `Renter_userID_idx`(`userID`),
    PRIMARY KEY (`renterID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Rentee` (
    `renteeID` VARCHAR(191) NOT NULL,
    `userID` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `phone` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NOT NULL,
    `verificationStatus` ENUM('Unverified', 'Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Unverified',
    `lastKnownLat` DECIMAL(9, 6) NULL,
    `lastKnownLng` DECIMAL(9, 6) NULL,
    `lastSeenAt` DATETIME(3) NULL,

    UNIQUE INDEX `Rentee_userID_key`(`userID`),
    INDEX `Rentee_userID_idx`(`userID`),
    PRIMARY KEY (`renteeID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `adminID` VARCHAR(191) NOT NULL,
    `userID` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `permission` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Admin_userID_key`(`userID`),
    INDEX `Admin_userID_idx`(`userID`),
    PRIMARY KEY (`adminID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Vehicle` (
    `VIN` VARCHAR(17) NOT NULL,
    `renterID` VARCHAR(191) NOT NULL,
    `listingCode` VARCHAR(191) NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `plateNumber` VARCHAR(191) NOT NULL,
    `type` ENUM('Sedan', 'SUV', 'MPV', 'Hatchback', 'Pickup', 'Motorcycle') NOT NULL,
    `city` VARCHAR(191) NOT NULL,
    `pricePerDay` DECIMAL(12, 2) NOT NULL,
    `status` ENUM('Draft', 'Pending', 'Approved', 'Rejected') NOT NULL DEFAULT 'Draft',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Vehicle_listingCode_key`(`listingCode`),
    UNIQUE INDEX `Vehicle_plateNumber_key`(`plateNumber`),
    INDEX `Vehicle_renterID_idx`(`renterID`),
    PRIMARY KEY (`VIN`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Document` (
    `documentID` VARCHAR(191) NOT NULL,
    `vehicleVIN` VARCHAR(191) NULL,
    `renterID` VARCHAR(191) NULL,
    `renteeID` VARCHAR(191) NULL,
    `verifiedByAdminID` VARCHAR(191) NULL,
    `type` ENUM('STNK', 'Insurance', 'KTP', 'SIM') NOT NULL,
    `verificationStatus` ENUM('Unverified', 'Pending', 'Verified', 'Rejected') NOT NULL DEFAULT 'Unverified',
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `fileData` LONGBLOB NOT NULL,
    `iv` VARCHAR(32) NOT NULL,
    `authTag` VARCHAR(32) NOT NULL,

    INDEX `Document_vehicleVIN_idx`(`vehicleVIN`),
    INDEX `Document_renterID_idx`(`renterID`),
    INDEX `Document_renteeID_idx`(`renteeID`),
    INDEX `Document_verifiedByAdminID_idx`(`verifiedByAdminID`),
    PRIMARY KEY (`documentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `bookingID` VARCHAR(191) NOT NULL,
    `vehicleVIN` VARCHAR(191) NOT NULL,
    `renteeID` VARCHAR(191) NOT NULL,
    `approvedByAdminID` VARCHAR(191) NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `status` ENUM('Pending', 'Confirmed', 'Declined', 'Cancelled', 'Active', 'Completed', 'Failed') NOT NULL DEFAULT 'Pending',
    `totalPrice` DECIMAL(12, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Booking_vehicleVIN_idx`(`vehicleVIN`),
    INDEX `Booking_renteeID_idx`(`renteeID`),
    INDEX `Booking_approvedByAdminID_idx`(`approvedByAdminID`),
    PRIMARY KEY (`bookingID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `paymentID` VARCHAR(191) NOT NULL,
    `bookingID` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `method` VARCHAR(191) NOT NULL,
    `status` ENUM('Pending', 'Held', 'Released', 'Failed') NOT NULL DEFAULT 'Pending',
    `paidAt` DATETIME(3) NULL,
    `escrowReleaseDate` DATETIME(3) NULL,

    INDEX `Payment_bookingID_idx`(`bookingID`),
    PRIMARY KEY (`paymentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationLog` (
    `logID` VARCHAR(191) NOT NULL,
    `bookingID` VARCHAR(191) NOT NULL,
    `renteeID` VARCHAR(191) NOT NULL,
    `latitude` DECIMAL(9, 6) NOT NULL,
    `longitude` DECIMAL(9, 6) NOT NULL,
    `accuracy` DECIMAL(8, 2) NULL,
    `recordedAt` DATETIME(3) NOT NULL,
    `speedKph` DECIMAL(8, 2) NULL,

    INDEX `LocationLog_bookingID_idx`(`bookingID`),
    INDEX `LocationLog_renteeID_idx`(`renteeID`),
    PRIMARY KEY (`logID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Dispute` (
    `disputeID` VARCHAR(191) NOT NULL,
    `bookingID` VARCHAR(191) NOT NULL,
    `resolvedByAdminID` VARCHAR(191) NULL,
    `raisedBy` ENUM('Renter', 'Rentee') NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('Open', 'UnderReview', 'Resolved', 'Rejected') NOT NULL DEFAULT 'Open',
    `resolvedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `Dispute_bookingID_idx`(`bookingID`),
    INDEX `Dispute_resolvedByAdminID_idx`(`resolvedByAdminID`),
    PRIMARY KEY (`disputeID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Renter` ADD CONSTRAINT `Renter_userID_fkey` FOREIGN KEY (`userID`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Rentee` ADD CONSTRAINT `Rentee_userID_fkey` FOREIGN KEY (`userID`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Admin` ADD CONSTRAINT `Admin_userID_fkey` FOREIGN KEY (`userID`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Vehicle` ADD CONSTRAINT `Vehicle_renterID_fkey` FOREIGN KEY (`renterID`) REFERENCES `Renter`(`renterID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_vehicleVIN_fkey` FOREIGN KEY (`vehicleVIN`) REFERENCES `Vehicle`(`VIN`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_renterID_fkey` FOREIGN KEY (`renterID`) REFERENCES `Renter`(`renterID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_renteeID_fkey` FOREIGN KEY (`renteeID`) REFERENCES `Rentee`(`renteeID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Document` ADD CONSTRAINT `Document_verifiedByAdminID_fkey` FOREIGN KEY (`verifiedByAdminID`) REFERENCES `Admin`(`adminID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_vehicleVIN_fkey` FOREIGN KEY (`vehicleVIN`) REFERENCES `Vehicle`(`VIN`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_renteeID_fkey` FOREIGN KEY (`renteeID`) REFERENCES `Rentee`(`renteeID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_approvedByAdminID_fkey` FOREIGN KEY (`approvedByAdminID`) REFERENCES `Admin`(`adminID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_bookingID_fkey` FOREIGN KEY (`bookingID`) REFERENCES `Booking`(`bookingID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationLog` ADD CONSTRAINT `LocationLog_bookingID_fkey` FOREIGN KEY (`bookingID`) REFERENCES `Booking`(`bookingID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationLog` ADD CONSTRAINT `LocationLog_renteeID_fkey` FOREIGN KEY (`renteeID`) REFERENCES `Rentee`(`renteeID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_bookingID_fkey` FOREIGN KEY (`bookingID`) REFERENCES `Booking`(`bookingID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Dispute` ADD CONSTRAINT `Dispute_resolvedByAdminID_fkey` FOREIGN KEY (`resolvedByAdminID`) REFERENCES `Admin`(`adminID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- HAND-EDITED: spec constraint — booking end date must be after start date
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_endDate_after_startDate` CHECK (`endDate` > `startDate`);
