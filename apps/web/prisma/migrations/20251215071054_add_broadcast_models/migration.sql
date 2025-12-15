-- CreateTable
CREATE TABLE `SendingDomain` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `dkimSubDomain` VARCHAR(191) NOT NULL,
    `dkimPublicKey` TEXT NOT NULL,
    `dkimPrivateKey` TEXT NOT NULL,
    `dkimVerifiedAt` DATETIME(3) NULL,
    `returnPathSubDomain` VARCHAR(191) NOT NULL,
    `returnPathDomainCnameValue` VARCHAR(191) NOT NULL,
    `returnPathDomainVerifiedAt` DATETIME(3) NULL,
    `trackingSubDomain` VARCHAR(191) NOT NULL,
    `trackingDomainCnameValue` VARCHAR(191) NOT NULL,
    `trackingDomainVerifiedAt` DATETIME(3) NULL,
    `trackingDomainSslVerifiedAt` DATETIME(3) NULL,
    `trackingSslCertKey` TEXT NULL,
    `trackingSslCertSecret` TEXT NULL,
    `openTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `clickTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `recordsLastVerifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SendingDomain_workspaceId_idx`(`workspaceId`),
    UNIQUE INDEX `SendingDomain_workspaceId_name_key`(`workspaceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SenderIdentity` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `sendingDomainId` VARCHAR(191) NOT NULL,
    `emailVerificationCode` VARCHAR(191) NULL,
    `emailVerifiedAt` DATETIME(3) NULL,
    `emailVerificationCodeExpiresAt` DATETIME(3) NULL,
    `replyToEmail` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SenderIdentity_workspaceId_idx`(`workspaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailContent` (
    `id` VARCHAR(191) NOT NULL,
    `contentJson` JSON NULL,
    `contentText` TEXT NULL,
    `contentHtml` LONGTEXT NULL,
    `subject` VARCHAR(255) NULL,
    `previewText` VARCHAR(255) NULL,
    `updatedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Broadcast` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `segmentId` VARCHAR(191) NULL,
    `topicId` VARCHAR(191) NULL,
    `trackClicks` BOOLEAN NULL,
    `trackOpens` BOOLEAN NULL,
    `emailContentId` VARCHAR(191) NULL,
    `senderIdentityId` VARCHAR(191) NULL,
    `sendingDomainId` VARCHAR(191) NULL,
    `winningAbTestVariantId` VARCHAR(191) NULL,
    `waitingTimeToPickWinner` INTEGER NULL DEFAULT 4,
    `status` ENUM('DRAFT', 'QUEUED_FOR_SENDING', 'SENDING', 'SENT', 'SENDING_FAILED', 'DRAFT_ARCHIVED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `isAbTest` BOOLEAN NOT NULL DEFAULT false,
    `winningCriteria` ENUM('OPENS', 'CLICKS', 'CONVERSIONS') NULL,
    `winningWaitTime` INTEGER NULL,
    `sendAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Broadcast_workspaceId_idx`(`workspaceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbTestVariant` (
    `id` VARCHAR(191) NOT NULL,
    `broadcastId` VARCHAR(191) NOT NULL,
    `emailContentId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `weight` INTEGER NOT NULL DEFAULT 1,
    `sendAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `AbTestVariant_broadcastId_idx`(`broadcastId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailSend` (
    `id` VARCHAR(191) NOT NULL,
    `sendingId` VARCHAR(191) NULL,
    `sendingDomainId` VARCHAR(191) NULL,
    `broadcastId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `senderIdentityId` VARCHAR(191) NULL,
    `recipient` VARCHAR(255) NULL,
    `queue` VARCHAR(80) NULL,
    `siteName` VARCHAR(80) NULL,
    `size` INTEGER NULL,
    `totalAttempts` INTEGER NULL,
    `links` JSON NULL,
    `nodeId` VARCHAR(48) NULL,
    `egressPool` VARCHAR(80) NULL,
    `egressSource` VARCHAR(80) NULL,
    `deliveryProtocol` VARCHAR(12) NULL,
    `receptionProtocol` VARCHAR(12) NULL,
    `clickTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `openTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailSend_sendingId_key`(`sendingId`),
    INDEX `EmailSend_broadcastId_idx`(`broadcastId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailSendEvent` (
    `id` VARCHAR(191) NOT NULL,
    `emailSendId` VARCHAR(191) NOT NULL,
    `type` ENUM('Delivery', 'Reception', 'Bounce', 'TransientFailure', 'Expiration', 'AdminBounce', 'OOB', 'Feedback', 'Rejection', 'AdminRebind', 'Any', 'Click', 'Open') NOT NULL DEFAULT 'Any',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `contactId` VARCHAR(191) NULL,
    `broadcastId` VARCHAR(191) NULL,
    `responseCode` INTEGER NULL,
    `responseContent` TEXT NULL,
    `responseCommand` VARCHAR(255) NULL,
    `responseEnhancedCodeClass` INTEGER NULL,
    `responseEnhancedCodeSubject` INTEGER NULL,
    `responseEnhancedCodeDetail` INTEGER NULL,
    `peerAddressName` VARCHAR(255) NULL,
    `peerAddressAddr` VARCHAR(255) NULL,
    `bounceClassification` VARCHAR(120) NULL,
    `originCountry` VARCHAR(10) NULL,
    `originState` VARCHAR(56) NULL,
    `originCity` VARCHAR(56) NULL,
    `originDevice` VARCHAR(56) NULL,
    `originBrowser` VARCHAR(56) NULL,

    INDEX `EmailSendEvent_emailSendId_idx`(`emailSendId`),
    INDEX `EmailSendEvent_broadcastId_idx`(`broadcastId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SenderIdentity` ADD CONSTRAINT `SenderIdentity_sendingDomainId_fkey` FOREIGN KEY (`sendingDomainId`) REFERENCES `SendingDomain`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_emailContentId_fkey` FOREIGN KEY (`emailContentId`) REFERENCES `EmailContent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_senderIdentityId_fkey` FOREIGN KEY (`senderIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_sendingDomainId_fkey` FOREIGN KEY (`sendingDomainId`) REFERENCES `SendingDomain`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbTestVariant` ADD CONSTRAINT `AbTestVariant_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbTestVariant` ADD CONSTRAINT `AbTestVariant_emailContentId_fkey` FOREIGN KEY (`emailContentId`) REFERENCES `EmailContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailSend` ADD CONSTRAINT `EmailSend_sendingDomainId_fkey` FOREIGN KEY (`sendingDomainId`) REFERENCES `SendingDomain`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailSend` ADD CONSTRAINT `EmailSend_senderIdentityId_fkey` FOREIGN KEY (`senderIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailSend` ADD CONSTRAINT `EmailSend_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailSendEvent` ADD CONSTRAINT `EmailSendEvent_emailSendId_fkey` FOREIGN KEY (`emailSendId`) REFERENCES `EmailSend`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailSendEvent` ADD CONSTRAINT `EmailSendEvent_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
