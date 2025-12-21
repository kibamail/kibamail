-- AlterTable
ALTER TABLE `Broadcast` ADD COLUMN `replyToIdentityId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `Broadcast` ADD CONSTRAINT `Broadcast_replyToIdentityId_fkey` FOREIGN KEY (`replyToIdentityId`) REFERENCES `SenderIdentity`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
