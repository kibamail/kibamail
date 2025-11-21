-- AlterTable
ALTER TABLE `forms` ADD COLUMN `publishedVersionId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_publishedVersionId_fkey` FOREIGN KEY (`publishedVersionId`) REFERENCES `forms`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
