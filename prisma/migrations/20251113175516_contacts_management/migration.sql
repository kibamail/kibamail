-- CreateTable
CREATE TABLE `contacts` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `firstName` VARCHAR(191) NULL,
    `lastName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `timezone` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `status` ENUM('SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'ARCHIVED') NOT NULL DEFAULT 'SUBSCRIBED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contacts_workspaceId_idx`(`workspaceId`),
    INDEX `contacts_email_idx`(`email`),
    INDEX `contacts_status_idx`(`status`),
    INDEX `contacts_createdAt_idx`(`createdAt`),
    UNIQUE INDEX `contacts_workspaceId_email_key`(`workspaceId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topics` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `slug` VARCHAR(191) NOT NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `isPrimary` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `topics_workspaceId_idx`(`workspaceId`),
    INDEX `topics_visibility_idx`(`visibility`),
    INDEX `topics_isPrimary_idx`(`isPrimary`),
    UNIQUE INDEX `topics_workspaceId_slug_key`(`workspaceId`, `slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_topics` (
    `id` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `topicId` VARCHAR(191) NOT NULL,
    `status` ENUM('SUBSCRIBED', 'UNSUBSCRIBED') NOT NULL DEFAULT 'SUBSCRIBED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contact_topics_contactId_idx`(`contactId`),
    INDEX `contact_topics_topicId_idx`(`topicId`),
    INDEX `contact_topics_status_idx`(`status`),
    UNIQUE INDEX `contact_topics_contactId_topicId_key`(`contactId`, `topicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tags` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#3B82F6',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `tags_workspaceId_idx`(`workspaceId`),
    UNIQUE INDEX `tags_workspaceId_name_key`(`workspaceId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_tags` (
    `id` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `tagId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contact_tags_contactId_idx`(`contactId`),
    INDEX `contact_tags_tagId_idx`(`tagId`),
    UNIQUE INDEX `contact_tags_contactId_tagId_key`(`contactId`, `tagId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `segments` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('DYNAMIC', 'STATIC') NOT NULL DEFAULT 'DYNAMIC',
    `conditions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `segments_workspaceId_idx`(`workspaceId`),
    INDEX `segments_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_segments` (
    `id` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `segmentId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `contact_segments_contactId_idx`(`contactId`),
    INDEX `contact_segments_segmentId_idx`(`segmentId`),
    UNIQUE INDEX `contact_segments_contactId_segmentId_key`(`contactId`, `segmentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppression_list` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `email` VARCHAR(191) NOT NULL,
    `scope` ENUM('GLOBAL', 'TOPIC') NOT NULL DEFAULT 'GLOBAL',
    `topicId` VARCHAR(191) NULL,
    `reason` ENUM('MANUAL', 'BOUNCED', 'COMPLAINED', 'UNSUBSCRIBED', 'LEGAL_REQUEST', 'INVALID_EMAIL') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `suppression_list_workspaceId_idx`(`workspaceId`),
    INDEX `suppression_list_contactId_idx`(`contactId`),
    INDEX `suppression_list_email_idx`(`email`),
    INDEX `suppression_list_scope_idx`(`scope`),
    INDEX `suppression_list_topicId_idx`(`topicId`),
    INDEX `suppression_list_reason_idx`(`reason`),
    UNIQUE INDEX `suppression_list_workspaceId_email_topicId_key`(`workspaceId`, `email`, `topicId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `contact_topics` ADD CONSTRAINT `contact_topics_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_topics` ADD CONSTRAINT `contact_topics_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_tags` ADD CONSTRAINT `contact_tags_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_tags` ADD CONSTRAINT `contact_tags_tagId_fkey` FOREIGN KEY (`tagId`) REFERENCES `tags`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_segments` ADD CONSTRAINT `contact_segments_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_segments` ADD CONSTRAINT `contact_segments_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `segments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppression_list` ADD CONSTRAINT `suppression_list_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppression_list` ADD CONSTRAINT `suppression_list_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
