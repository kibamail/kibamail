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
