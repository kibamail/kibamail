-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `sourceId` VARCHAR(191) NULL,
    ADD COLUMN `sourceType` ENUM('MANUAL', 'IMPORT', 'FORM', 'API') NOT NULL DEFAULT 'MANUAL';

-- AlterTable
ALTER TABLE `forms` ADD COLUMN `display` ENUM('POPUP', 'INLINE_EMBED') NOT NULL DEFAULT 'INLINE_EMBED',
    ADD COLUMN `type` ENUM('SIGN_UP', 'SURVEY') NOT NULL DEFAULT 'SIGN_UP';

-- CreateIndex
CREATE INDEX `contacts_sourceType_idx` ON `contacts`(`sourceType`);

-- CreateIndex
CREATE INDEX `contacts_sourceId_idx` ON `contacts`(`sourceId`);

-- CreateIndex
CREATE INDEX `forms_type_idx` ON `forms`(`type`);

-- CreateIndex
CREATE INDEX `forms_display_idx` ON `forms`(`display`);
