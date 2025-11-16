-- CreateTable
CREATE TABLE `automations` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `parentId` VARCHAR(191) NULL,
    `triggerType` ENUM('PROPERTY_UPDATED', 'CONTACT_SUBSCRIBED', 'FORM_SUBMITTED', 'API', 'EVENT', 'SEGMENT_ENTRY', 'SEGMENT_EXIT', 'EMAIL_ENGAGEMENT') NOT NULL,
    `triggerConfig` JSON NULL,
    `nodes` JSON NOT NULL,
    `edges` JSON NOT NULL,
    `settings` JSON NULL,
    `stats` JSON NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `automations_workspaceId_idx`(`workspaceId`),
    INDEX `automations_workspaceId_status_idx`(`workspaceId`, `status`),
    INDEX `automations_workspaceId_deleted_at_idx`(`workspaceId`, `deleted_at`),
    INDEX `automations_parentId_idx`(`parentId`),
    INDEX `automations_triggerType_idx`(`triggerType`),
    INDEX `automations_version_idx`(`version`),
    UNIQUE INDEX `automations_workspaceId_parentId_status_key`(`workspaceId`, `parentId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automation_runs` (
    `id` VARCHAR(191) NOT NULL,
    `automationId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED') NOT NULL DEFAULT 'ACTIVE',
    `currentNodeId` VARCHAR(191) NULL,
    `executionState` JSON NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completedAt` DATETIME(3) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `automation_runs_workspaceId_idx`(`workspaceId`),
    INDEX `automation_runs_automationId_idx`(`automationId`),
    INDEX `automation_runs_contactId_idx`(`contactId`),
    INDEX `automation_runs_status_idx`(`status`),
    INDEX `automation_runs_currentNodeId_idx`(`currentNodeId`),
    INDEX `automation_runs_startedAt_idx`(`startedAt`),
    INDEX `automation_runs_completedAt_idx`(`completedAt`),
    INDEX `automation_runs_scheduledAt_idx`(`scheduledAt`),
    UNIQUE INDEX `automation_runs_automationId_contactId_key`(`automationId`, `contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `automations` ADD CONSTRAINT `automations_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `automations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_runs` ADD CONSTRAINT `automation_runs_automationId_fkey` FOREIGN KEY (`automationId`) REFERENCES `automations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_runs` ADD CONSTRAINT `automation_runs_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
