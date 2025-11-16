-- CreateTable
CREATE TABLE `invitations` (
    `id` VARCHAR(191) NOT NULL,
    `logtoInvitationId` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `inviteeEmail` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED') NOT NULL DEFAULT 'PENDING',
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `invitations_logtoInvitationId_key`(`logtoInvitationId`),
    INDEX `invitations_inviteeEmail_idx`(`inviteeEmail`),
    INDEX `invitations_workspaceId_idx`(`workspaceId`),
    INDEX `invitations_expiresAt_idx`(`expiresAt`),
    INDEX `invitations_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `api_keys` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `keyHash` VARCHAR(191) NOT NULL,
    `keyPreview` VARCHAR(191) NOT NULL,
    `scopes` JSON NOT NULL,
    `lastUsedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `api_keys_keyHash_key`(`keyHash`),
    INDEX `api_keys_workspaceId_idx`(`workspaceId`),
    INDEX `api_keys_keyHash_idx`(`keyHash`),
    INDEX `api_keys_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `propertyFloat0` DOUBLE NULL,
    `propertyFloat1` DOUBLE NULL,
    `propertyFloat2` DOUBLE NULL,
    `propertyFloat3` DOUBLE NULL,
    `propertyFloat4` DOUBLE NULL,
    `propertyFloat5` DOUBLE NULL,
    `propertyFloat6` DOUBLE NULL,
    `propertyFloat7` DOUBLE NULL,
    `propertyFloat8` DOUBLE NULL,
    `propertyFloat9` DOUBLE NULL,
    `propertyFloat10` DOUBLE NULL,
    `propertyFloat11` DOUBLE NULL,
    `propertyFloat12` DOUBLE NULL,
    `propertyFloat13` DOUBLE NULL,
    `propertyFloat14` DOUBLE NULL,
    `propertyFloat15` DOUBLE NULL,
    `propertyFloat16` DOUBLE NULL,
    `propertyFloat17` DOUBLE NULL,
    `propertyFloat18` DOUBLE NULL,
    `propertyFloat19` DOUBLE NULL,
    `propertyFloat20` DOUBLE NULL,
    `propertyFloat21` DOUBLE NULL,
    `propertyFloat22` DOUBLE NULL,
    `propertyFloat23` DOUBLE NULL,
    `propertyFloat24` DOUBLE NULL,
    `propertyFloat25` DOUBLE NULL,
    `propertyFloat26` DOUBLE NULL,
    `propertyFloat27` DOUBLE NULL,
    `propertyFloat28` DOUBLE NULL,
    `propertyFloat29` DOUBLE NULL,
    `propertyFloat30` DOUBLE NULL,
    `propertyFloat31` DOUBLE NULL,
    `propertyFloat32` DOUBLE NULL,
    `propertyFloat33` DOUBLE NULL,
    `propertyFloat34` DOUBLE NULL,
    `propertyString0` VARCHAR(255) NULL,
    `propertyString1` VARCHAR(255) NULL,
    `propertyString2` VARCHAR(255) NULL,
    `propertyString3` VARCHAR(255) NULL,
    `propertyString4` VARCHAR(255) NULL,
    `propertyString5` VARCHAR(255) NULL,
    `propertyString6` VARCHAR(255) NULL,
    `propertyString7` VARCHAR(255) NULL,
    `propertyString8` VARCHAR(255) NULL,
    `propertyString9` VARCHAR(255) NULL,
    `propertyString10` VARCHAR(255) NULL,
    `propertyString11` VARCHAR(255) NULL,
    `propertyString12` VARCHAR(255) NULL,
    `propertyString13` VARCHAR(255) NULL,
    `propertyString14` VARCHAR(255) NULL,
    `propertyString15` VARCHAR(255) NULL,
    `propertyString16` VARCHAR(255) NULL,
    `propertyString17` VARCHAR(255) NULL,
    `propertyString18` VARCHAR(255) NULL,
    `propertyString19` VARCHAR(255) NULL,
    `propertyString20` VARCHAR(255) NULL,
    `propertyString21` VARCHAR(255) NULL,
    `propertyString22` VARCHAR(255) NULL,
    `propertyString23` VARCHAR(255) NULL,
    `propertyString24` VARCHAR(255) NULL,
    `propertyString25` VARCHAR(255) NULL,
    `propertyString26` VARCHAR(255) NULL,
    `propertyString27` VARCHAR(255) NULL,
    `propertyString28` VARCHAR(255) NULL,
    `propertyString29` VARCHAR(255) NULL,
    `propertyString30` VARCHAR(255) NULL,
    `propertyString31` VARCHAR(255) NULL,
    `propertyString32` VARCHAR(255) NULL,
    `propertyString33` VARCHAR(255) NULL,
    `propertyString34` VARCHAR(255) NULL,
    `propertyString35` VARCHAR(255) NULL,
    `propertyString36` VARCHAR(255) NULL,
    `propertyString37` VARCHAR(255) NULL,
    `propertyString38` VARCHAR(255) NULL,
    `propertyString39` VARCHAR(255) NULL,
    `propertyString40` VARCHAR(255) NULL,
    `propertyString41` VARCHAR(255) NULL,
    `propertyString42` VARCHAR(255) NULL,
    `propertyString43` VARCHAR(255) NULL,
    `propertyString44` VARCHAR(255) NULL,
    `propertyString45` VARCHAR(255) NULL,
    `propertyString46` VARCHAR(255) NULL,
    `propertyString47` VARCHAR(255) NULL,
    `propertyString48` VARCHAR(255) NULL,
    `propertyString49` VARCHAR(255) NULL,

    INDEX `contacts_workspaceId_idx`(`workspaceId`),
    INDEX `contacts_email_idx`(`email`),
    INDEX `contacts_status_idx`(`status`),
    INDEX `contacts_createdAt_idx`(`createdAt`),
    INDEX `contacts_workspaceId_propertyFloat0_idx`(`workspaceId`, `propertyFloat0`),
    INDEX `contacts_workspaceId_propertyFloat1_idx`(`workspaceId`, `propertyFloat1`),
    INDEX `contacts_workspaceId_propertyFloat2_idx`(`workspaceId`, `propertyFloat2`),
    INDEX `contacts_workspaceId_propertyFloat3_idx`(`workspaceId`, `propertyFloat3`),
    INDEX `contacts_workspaceId_propertyFloat4_idx`(`workspaceId`, `propertyFloat4`),
    INDEX `contacts_workspaceId_propertyFloat5_idx`(`workspaceId`, `propertyFloat5`),
    INDEX `contacts_workspaceId_propertyFloat6_idx`(`workspaceId`, `propertyFloat6`),
    INDEX `contacts_workspaceId_propertyFloat7_idx`(`workspaceId`, `propertyFloat7`),
    INDEX `contacts_workspaceId_propertyFloat8_idx`(`workspaceId`, `propertyFloat8`),
    INDEX `contacts_workspaceId_propertyFloat9_idx`(`workspaceId`, `propertyFloat9`),
    INDEX `contacts_workspaceId_propertyString0_idx`(`workspaceId`, `propertyString0`),
    INDEX `contacts_workspaceId_propertyString1_idx`(`workspaceId`, `propertyString1`),
    INDEX `contacts_workspaceId_propertyString2_idx`(`workspaceId`, `propertyString2`),
    INDEX `contacts_workspaceId_propertyString3_idx`(`workspaceId`, `propertyString3`),
    INDEX `contacts_workspaceId_propertyString4_idx`(`workspaceId`, `propertyString4`),
    INDEX `contacts_workspaceId_propertyString5_idx`(`workspaceId`, `propertyString5`),
    INDEX `contacts_workspaceId_propertyString6_idx`(`workspaceId`, `propertyString6`),
    INDEX `contacts_workspaceId_propertyString7_idx`(`workspaceId`, `propertyString7`),
    INDEX `contacts_workspaceId_propertyString8_idx`(`workspaceId`, `propertyString8`),
    INDEX `contacts_workspaceId_propertyString9_idx`(`workspaceId`, `propertyString9`),
    UNIQUE INDEX `contacts_workspaceId_email_key`(`workspaceId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contact_properties` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slot` VARCHAR(191) NOT NULL,
    `type` ENUM('DATE', 'NUMBER', 'STRING') NOT NULL,
    `defaultValue` VARCHAR(191) NULL,
    `deleted_at` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contact_properties_workspaceId_idx`(`workspaceId`),
    INDEX `contact_properties_workspaceId_deleted_at_idx`(`workspaceId`, `deleted_at`),
    INDEX `contact_properties_type_idx`(`type`),
    UNIQUE INDEX `contact_properties_workspaceId_name_key`(`workspaceId`, `name`),
    UNIQUE INDEX `contact_properties_workspaceId_slot_key`(`workspaceId`, `slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `topics` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `visibility` ENUM('PUBLIC', 'PRIVATE') NOT NULL DEFAULT 'PUBLIC',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `topics_workspaceId_idx`(`workspaceId`),
    INDEX `topics_workspaceId_deleted_at_idx`(`workspaceId`, `deleted_at`),
    INDEX `topics_visibility_idx`(`visibility`),
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
CREATE TABLE `segments` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('DYNAMIC', 'STATIC') NOT NULL DEFAULT 'DYNAMIC',
    `conditions` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `segments_workspaceId_idx`(`workspaceId`),
    INDEX `segments_workspaceId_deleted_at_idx`(`workspaceId`, `deleted_at`),
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
ALTER TABLE `contact_segments` ADD CONSTRAINT `contact_segments_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contact_segments` ADD CONSTRAINT `contact_segments_segmentId_fkey` FOREIGN KEY (`segmentId`) REFERENCES `segments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppression_list` ADD CONSTRAINT `suppression_list_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `suppression_list` ADD CONSTRAINT `suppression_list_topicId_fkey` FOREIGN KEY (`topicId`) REFERENCES `topics`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
