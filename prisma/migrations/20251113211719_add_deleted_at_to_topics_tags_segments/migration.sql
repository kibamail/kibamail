-- AlterTable
ALTER TABLE `segments` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `tags` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `topics` ADD COLUMN `deleted_at` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `segments_workspaceId_deleted_at_idx` ON `segments`(`workspaceId`, `deleted_at`);

-- CreateIndex
CREATE INDEX `tags_workspaceId_deleted_at_idx` ON `tags`(`workspaceId`, `deleted_at`);

-- CreateIndex
CREATE INDEX `topics_workspaceId_deleted_at_idx` ON `topics`(`workspaceId`, `deleted_at`);
