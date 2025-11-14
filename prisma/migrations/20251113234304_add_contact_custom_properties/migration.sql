-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `propertyDate0` BIGINT NULL,
    ADD COLUMN `propertyDate1` BIGINT NULL,
    ADD COLUMN `propertyDate10` BIGINT NULL,
    ADD COLUMN `propertyDate11` BIGINT NULL,
    ADD COLUMN `propertyDate12` BIGINT NULL,
    ADD COLUMN `propertyDate13` BIGINT NULL,
    ADD COLUMN `propertyDate14` BIGINT NULL,
    ADD COLUMN `propertyDate15` BIGINT NULL,
    ADD COLUMN `propertyDate16` BIGINT NULL,
    ADD COLUMN `propertyDate17` BIGINT NULL,
    ADD COLUMN `propertyDate18` BIGINT NULL,
    ADD COLUMN `propertyDate19` BIGINT NULL,
    ADD COLUMN `propertyDate2` BIGINT NULL,
    ADD COLUMN `propertyDate20` BIGINT NULL,
    ADD COLUMN `propertyDate21` BIGINT NULL,
    ADD COLUMN `propertyDate22` BIGINT NULL,
    ADD COLUMN `propertyDate23` BIGINT NULL,
    ADD COLUMN `propertyDate24` BIGINT NULL,
    ADD COLUMN `propertyDate3` BIGINT NULL,
    ADD COLUMN `propertyDate4` BIGINT NULL,
    ADD COLUMN `propertyDate5` BIGINT NULL,
    ADD COLUMN `propertyDate6` BIGINT NULL,
    ADD COLUMN `propertyDate7` BIGINT NULL,
    ADD COLUMN `propertyDate8` BIGINT NULL,
    ADD COLUMN `propertyDate9` BIGINT NULL,
    ADD COLUMN `propertyNum0` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum1` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum10` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum11` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum12` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum13` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum14` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum15` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum16` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum17` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum18` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum19` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum2` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum20` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum21` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum22` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum23` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum24` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum3` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum4` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum5` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum6` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum7` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum8` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyNum9` DECIMAL(20, 6) NULL,
    ADD COLUMN `propertyString0` VARCHAR(255) NULL,
    ADD COLUMN `propertyString1` VARCHAR(255) NULL,
    ADD COLUMN `propertyString10` VARCHAR(255) NULL,
    ADD COLUMN `propertyString11` VARCHAR(255) NULL,
    ADD COLUMN `propertyString12` VARCHAR(255) NULL,
    ADD COLUMN `propertyString13` VARCHAR(255) NULL,
    ADD COLUMN `propertyString14` VARCHAR(255) NULL,
    ADD COLUMN `propertyString15` VARCHAR(255) NULL,
    ADD COLUMN `propertyString16` VARCHAR(255) NULL,
    ADD COLUMN `propertyString17` VARCHAR(255) NULL,
    ADD COLUMN `propertyString18` VARCHAR(255) NULL,
    ADD COLUMN `propertyString19` VARCHAR(255) NULL,
    ADD COLUMN `propertyString2` VARCHAR(255) NULL,
    ADD COLUMN `propertyString20` VARCHAR(255) NULL,
    ADD COLUMN `propertyString21` VARCHAR(255) NULL,
    ADD COLUMN `propertyString22` VARCHAR(255) NULL,
    ADD COLUMN `propertyString23` VARCHAR(255) NULL,
    ADD COLUMN `propertyString24` VARCHAR(255) NULL,
    ADD COLUMN `propertyString3` VARCHAR(255) NULL,
    ADD COLUMN `propertyString4` VARCHAR(255) NULL,
    ADD COLUMN `propertyString5` VARCHAR(255) NULL,
    ADD COLUMN `propertyString6` VARCHAR(255) NULL,
    ADD COLUMN `propertyString7` VARCHAR(255) NULL,
    ADD COLUMN `propertyString8` VARCHAR(255) NULL,
    ADD COLUMN `propertyString9` VARCHAR(255) NULL;

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
    INDEX `contact_properties_workspaceId_name_idx`(`workspaceId`, `name`),
    INDEX `contact_properties_workspaceId_slot_idx`(`workspaceId`, `slot`),
    INDEX `contact_properties_type_idx`(`type`),
    UNIQUE INDEX `contact_properties_workspaceId_name_key`(`workspaceId`, `name`),
    UNIQUE INDEX `contact_properties_workspaceId_slot_key`(`workspaceId`, `slot`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum0_idx` ON `contacts`(`workspaceId`, `propertyNum0`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum1_idx` ON `contacts`(`workspaceId`, `propertyNum1`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum2_idx` ON `contacts`(`workspaceId`, `propertyNum2`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum3_idx` ON `contacts`(`workspaceId`, `propertyNum3`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum4_idx` ON `contacts`(`workspaceId`, `propertyNum4`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum5_idx` ON `contacts`(`workspaceId`, `propertyNum5`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum6_idx` ON `contacts`(`workspaceId`, `propertyNum6`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum7_idx` ON `contacts`(`workspaceId`, `propertyNum7`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum8_idx` ON `contacts`(`workspaceId`, `propertyNum8`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum9_idx` ON `contacts`(`workspaceId`, `propertyNum9`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum10_idx` ON `contacts`(`workspaceId`, `propertyNum10`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyNum11_idx` ON `contacts`(`workspaceId`, `propertyNum11`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate0_idx` ON `contacts`(`workspaceId`, `propertyDate0`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate1_idx` ON `contacts`(`workspaceId`, `propertyDate1`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate2_idx` ON `contacts`(`workspaceId`, `propertyDate2`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate3_idx` ON `contacts`(`workspaceId`, `propertyDate3`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate4_idx` ON `contacts`(`workspaceId`, `propertyDate4`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate5_idx` ON `contacts`(`workspaceId`, `propertyDate5`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate6_idx` ON `contacts`(`workspaceId`, `propertyDate6`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate7_idx` ON `contacts`(`workspaceId`, `propertyDate7`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate8_idx` ON `contacts`(`workspaceId`, `propertyDate8`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate9_idx` ON `contacts`(`workspaceId`, `propertyDate9`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate10_idx` ON `contacts`(`workspaceId`, `propertyDate10`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyDate11_idx` ON `contacts`(`workspaceId`, `propertyDate11`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString0_idx` ON `contacts`(`workspaceId`, `propertyString0`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString1_idx` ON `contacts`(`workspaceId`, `propertyString1`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString2_idx` ON `contacts`(`workspaceId`, `propertyString2`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString3_idx` ON `contacts`(`workspaceId`, `propertyString3`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString4_idx` ON `contacts`(`workspaceId`, `propertyString4`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString5_idx` ON `contacts`(`workspaceId`, `propertyString5`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString6_idx` ON `contacts`(`workspaceId`, `propertyString6`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString7_idx` ON `contacts`(`workspaceId`, `propertyString7`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString8_idx` ON `contacts`(`workspaceId`, `propertyString8`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString9_idx` ON `contacts`(`workspaceId`, `propertyString9`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString10_idx` ON `contacts`(`workspaceId`, `propertyString10`);

-- CreateIndex
CREATE INDEX `contacts_workspaceId_propertyString11_idx` ON `contacts`(`workspaceId`, `propertyString11`);
