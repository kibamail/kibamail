/*
  Warnings:

  - You are about to drop the column `fieldNum15` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum16` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum17` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum18` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum19` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum20` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum21` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum22` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum23` on the `form_submissions` table. All the data in the column will be lost.
  - You are about to drop the column `fieldNum24` on the `form_submissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `form_submissions` DROP COLUMN `fieldNum15`,
    DROP COLUMN `fieldNum16`,
    DROP COLUMN `fieldNum17`,
    DROP COLUMN `fieldNum18`,
    DROP COLUMN `fieldNum19`,
    DROP COLUMN `fieldNum20`,
    DROP COLUMN `fieldNum21`,
    DROP COLUMN `fieldNum22`,
    DROP COLUMN `fieldNum23`,
    DROP COLUMN `fieldNum24`,
    ADD COLUMN `fieldString30` VARCHAR(255) NULL,
    ADD COLUMN `fieldString31` VARCHAR(255) NULL,
    ADD COLUMN `fieldString32` VARCHAR(255) NULL,
    ADD COLUMN `fieldString33` VARCHAR(255) NULL,
    ADD COLUMN `fieldString34` VARCHAR(255) NULL,
    ADD COLUMN `fieldString35` VARCHAR(255) NULL,
    ADD COLUMN `fieldString36` VARCHAR(255) NULL,
    ADD COLUMN `fieldString37` VARCHAR(255) NULL,
    ADD COLUMN `fieldString38` VARCHAR(255) NULL,
    ADD COLUMN `fieldString39` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `forms` ADD COLUMN `fieldMapping` JSON NULL;
