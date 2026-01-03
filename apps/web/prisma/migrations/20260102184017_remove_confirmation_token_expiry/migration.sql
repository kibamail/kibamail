/*
  Warnings:

  - You are about to drop the column `confirmationTokenExpiresAt` on the `contacts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "contacts" DROP COLUMN "confirmationTokenExpiresAt";
