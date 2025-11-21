-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `subscribedAt` DATETIME(3) NULL,
    ADD COLUMN `unsubscribedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `contacts_subscribedAt_idx` ON `contacts`(`subscribedAt`);
