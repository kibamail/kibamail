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
    `status` ENUM('UNCONFIRMED', 'SUBSCRIBED', 'UNSUBSCRIBED', 'BOUNCED', 'COMPLAINED', 'ARCHIVED') NOT NULL DEFAULT 'SUBSCRIBED',
    `sourceType` ENUM('MANUAL', 'IMPORT', 'FORM', 'API') NOT NULL DEFAULT 'MANUAL',
    `sourceId` VARCHAR(191) NULL,
    `subscribedAt` DATETIME(3) NULL,
    `unsubscribedAt` DATETIME(3) NULL,
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
    INDEX `contacts_subscribedAt_idx`(`subscribedAt`),
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
    INDEX `contacts_sourceType_idx`(`sourceType`),
    INDEX `contacts_sourceId_idx`(`sourceId`),
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
    `defaultOptIn` BOOLEAN NOT NULL DEFAULT false,
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

-- CreateTable
CREATE TABLE `contact_imports` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `fileKey` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `fileSize` INTEGER NOT NULL,
    `status` ENUM('PENDING', 'QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `columnMapping` JSON NOT NULL,
    `topicIds` JSON NOT NULL,
    `autoSubscribe` BOOLEAN NOT NULL DEFAULT false,
    `updateExisting` BOOLEAN NOT NULL DEFAULT false,
    `totalRows` INTEGER NOT NULL DEFAULT 0,
    `processedRows` INTEGER NOT NULL DEFAULT 0,
    `createdCount` INTEGER NOT NULL DEFAULT 0,
    `updatedCount` INTEGER NOT NULL DEFAULT 0,
    `skippedCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `errors` JSON NOT NULL,
    `errorMessage` TEXT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `contact_imports_workspaceId_idx`(`workspaceId`),
    INDEX `contact_imports_status_idx`(`status`),
    INDEX `contact_imports_createdAt_idx`(`createdAt`),
    INDEX `contact_imports_workspaceId_status_idx`(`workspaceId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `automations` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `parentId` VARCHAR(191) NULL,
    `triggerType` ENUM('CONTACT_SUBSCRIBED', 'PROPERTY_UPDATED', 'FORM_SUBMITTED', 'API', 'EVENT', 'SEGMENT_ENTRY', 'SEGMENT_EXIT', 'EMAIL_ENGAGEMENT') NOT NULL,
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

-- CreateTable
CREATE TABLE `forms` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `type` ENUM('SIGN_UP', 'SURVEY') NOT NULL DEFAULT 'SIGN_UP',
    `display` ENUM('POPUP', 'INLINE_EMBED') NOT NULL DEFAULT 'INLINE_EMBED',
    `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `version` INTEGER NOT NULL DEFAULT 1,
    `parentId` VARCHAR(191) NULL,
    `publishedVersionId` VARCHAR(191) NULL,
    `fields` JSON NOT NULL,
    `settings` JSON NULL,
    `fieldMapping` JSON NULL,
    `publishedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    INDEX `forms_workspace_parent_status_idx`(`workspaceId`, `parentId`, `status`),
    INDEX `forms_workspaceId_idx`(`workspaceId`),
    INDEX `forms_workspaceId_status_idx`(`workspaceId`, `status`),
    INDEX `forms_workspaceId_deleted_at_idx`(`workspaceId`, `deleted_at`),
    INDEX `forms_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_submissions` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'PROCESSED', 'SPAM', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `referrerUrl` TEXT NULL,
    `landingPageUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `fieldString0` VARCHAR(255) NULL,
    `fieldString1` VARCHAR(255) NULL,
    `fieldString2` VARCHAR(255) NULL,
    `fieldString3` VARCHAR(255) NULL,
    `fieldString4` VARCHAR(255) NULL,
    `fieldString5` VARCHAR(255) NULL,
    `fieldString6` VARCHAR(255) NULL,
    `fieldString7` VARCHAR(255) NULL,
    `fieldString8` VARCHAR(255) NULL,
    `fieldString9` VARCHAR(255) NULL,
    `fieldString10` VARCHAR(255) NULL,
    `fieldString11` VARCHAR(255) NULL,
    `fieldString12` VARCHAR(255) NULL,
    `fieldString13` VARCHAR(255) NULL,
    `fieldString14` VARCHAR(255) NULL,
    `fieldString15` VARCHAR(255) NULL,
    `fieldString16` VARCHAR(255) NULL,
    `fieldString17` VARCHAR(255) NULL,
    `fieldString18` VARCHAR(255) NULL,
    `fieldString19` VARCHAR(255) NULL,
    `fieldString20` VARCHAR(255) NULL,
    `fieldString21` VARCHAR(255) NULL,
    `fieldString22` VARCHAR(255) NULL,
    `fieldString23` VARCHAR(255) NULL,
    `fieldString24` VARCHAR(255) NULL,
    `fieldString25` VARCHAR(255) NULL,
    `fieldString26` VARCHAR(255) NULL,
    `fieldString27` VARCHAR(255) NULL,
    `fieldString28` VARCHAR(255) NULL,
    `fieldString29` VARCHAR(255) NULL,
    `fieldString30` VARCHAR(255) NULL,
    `fieldString31` VARCHAR(255) NULL,
    `fieldString32` VARCHAR(255) NULL,
    `fieldString33` VARCHAR(255) NULL,
    `fieldString34` VARCHAR(255) NULL,
    `fieldString35` VARCHAR(255) NULL,
    `fieldString36` VARCHAR(255) NULL,
    `fieldString37` VARCHAR(255) NULL,
    `fieldString38` VARCHAR(255) NULL,
    `fieldString39` VARCHAR(255) NULL,
    `fieldNum0` DOUBLE NULL,
    `fieldNum1` DOUBLE NULL,
    `fieldNum2` DOUBLE NULL,
    `fieldNum3` DOUBLE NULL,
    `fieldNum4` DOUBLE NULL,
    `fieldNum5` DOUBLE NULL,
    `fieldNum6` DOUBLE NULL,
    `fieldNum7` DOUBLE NULL,
    `fieldNum8` DOUBLE NULL,
    `fieldNum9` DOUBLE NULL,
    `fieldNum10` DOUBLE NULL,
    `fieldNum11` DOUBLE NULL,
    `fieldNum12` DOUBLE NULL,
    `fieldNum13` DOUBLE NULL,
    `fieldNum14` DOUBLE NULL,

    INDEX `form_submissions_workspaceId_idx`(`workspaceId`),
    INDEX `form_submissions_formId_idx`(`formId`),
    INDEX `form_submissions_contactId_idx`(`contactId`),
    INDEX `form_submissions_status_idx`(`status`),
    INDEX `form_submissions_createdAt_idx`(`createdAt`),
    INDEX `form_submissions_workspaceId_fieldString0_idx`(`workspaceId`, `fieldString0`),
    INDEX `form_submissions_workspaceId_fieldString1_idx`(`workspaceId`, `fieldString1`),
    INDEX `form_submissions_workspaceId_fieldString2_idx`(`workspaceId`, `fieldString2`),
    INDEX `form_submissions_workspaceId_fieldString3_idx`(`workspaceId`, `fieldString3`),
    INDEX `form_submissions_workspaceId_fieldString4_idx`(`workspaceId`, `fieldString4`),
    INDEX `form_submissions_workspaceId_fieldNum0_idx`(`workspaceId`, `fieldNum0`),
    INDEX `form_submissions_workspaceId_fieldNum1_idx`(`workspaceId`, `fieldNum1`),
    INDEX `form_submissions_workspaceId_fieldNum2_idx`(`workspaceId`, `fieldNum2`),
    INDEX `form_submissions_workspaceId_fieldNum3_idx`(`workspaceId`, `fieldNum3`),
    INDEX `form_submissions_workspaceId_fieldNum4_idx`(`workspaceId`, `fieldNum4`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `page_views` (
    `id` VARCHAR(191) NOT NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NULL,
    `pageType` ENUM('FORM', 'LANDING_PAGE') NOT NULL DEFAULT 'FORM',
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `device` VARCHAR(191) NULL,
    `os` VARCHAR(191) NULL,
    `browser` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `referrerUrl` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `page_views_workspaceId_idx`(`workspaceId`),
    INDEX `page_views_formId_idx`(`formId`),
    INDEX `page_views_createdAt_idx`(`createdAt`),
    INDEX `page_views_workspaceId_formId_idx`(`workspaceId`, `formId`),
    INDEX `page_views_workspaceId_createdAt_idx`(`workspaceId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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
    `dmarcReportingCode` VARCHAR(10) NOT NULL,
    `dmarcVerifiedAt` DATETIME(3) NULL,
    `trackingSslCertKey` TEXT NULL,
    `trackingSslCertSecret` TEXT NULL,
    `openTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `clickTrackingEnabled` BOOLEAN NOT NULL DEFAULT false,
    `maxSendPerDay` INTEGER NOT NULL DEFAULT 100,
    `maxSendPerHour` INTEGER NOT NULL DEFAULT 10,
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
    `styles` JSON NULL,
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
    `replyToIdentityId` VARCHAR(191) NULL,
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
CREATE TABLE `events` (
    `id` VARCHAR(191) NOT NULL,
    `sendingId` VARCHAR(191) NULL,
    `workspaceId` VARCHAR(191) NOT NULL,
    `type` ENUM('Queued', 'Delivery', 'Reception', 'Bounce', 'TransientFailure', 'Expiration', 'AdminBounce', 'OOB', 'Feedback', 'Rejection', 'AdminRebind', 'Any', 'Click', 'Open') NOT NULL DEFAULT 'Any',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
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
    `clickTrackingEnabled` BOOLEAN NULL,
    `openTrackingEnabled` BOOLEAN NULL,
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

    INDEX `events_sendingId_idx`(`sendingId`),
    INDEX `events_workspaceId_idx`(`workspaceId`),
    INDEX `events_broadcastId_idx`(`broadcastId`),
    INDEX `events_contactId_idx`(`contactId`),
    INDEX `events_type_idx`(`type`),
    INDEX `events_createdAt_idx`(`createdAt`),
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

-- AddForeignKey
ALTER TABLE `automations` ADD CONSTRAINT `automations_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `automations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_runs` ADD CONSTRAINT `automation_runs_automationId_fkey` FOREIGN KEY (`automationId`) REFERENCES `automations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `automation_runs` ADD CONSTRAINT `automation_runs_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_publishedVersionId_fkey` FOREIGN KEY (`publishedVersionId`) REFERENCES `forms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_submissions` ADD CONSTRAINT `form_submissions_contactId_fkey` FOREIGN KEY (`contactId`) REFERENCES `contacts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `page_views` ADD CONSTRAINT `page_views_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SenderIdentity` ADD CONSTRAINT `SenderIdentity_sendingDomainId_fkey` FOREIGN KEY (`sendingDomainId`) REFERENCES `SendingDomain`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_emailContentId_fkey` FOREIGN KEY (`emailContentId`) REFERENCES `EmailContent`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_senderIdentityId_fkey` FOREIGN KEY (`senderIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_replyToIdentityId_fkey` FOREIGN KEY (`replyToIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_sendingDomainId_fkey` FOREIGN KEY (`sendingDomainId`) REFERENCES `SendingDomain`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbTestVariant` ADD CONSTRAINT `AbTestVariant_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbTestVariant` ADD CONSTRAINT `AbTestVariant_emailContentId_fkey` FOREIGN KEY (`emailContentId`) REFERENCES `EmailContent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_sendingDomainId_fkey` FOREIGN KEY (`sendingDomainId`) REFERENCES `SendingDomain`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_senderIdentityId_fkey` FOREIGN KEY (`senderIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `events` ADD CONSTRAINT `events_broadcastId_fkey` FOREIGN KEY (`broadcastId`) REFERENCES `Broadcast`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
