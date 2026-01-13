-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN     "templateGroupId" TEXT;

-- CreateTable
CREATE TABLE "template_groups" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#6366F1',
    "icon" TEXT NOT NULL DEFAULT 'folder',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "template_groups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "template_groups_workspaceId_idx" ON "template_groups"("workspaceId");

-- CreateIndex
CREATE INDEX "template_groups_workspaceId_deleted_at_idx" ON "template_groups"("workspaceId", "deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "template_groups_workspaceId_name_key" ON "template_groups"("workspaceId", "name");

-- CreateIndex
CREATE INDEX "email_templates_templateGroupId_idx" ON "email_templates"("templateGroupId");

-- AddForeignKey
ALTER TABLE "email_templates" ADD CONSTRAINT "email_templates_templateGroupId_fkey" FOREIGN KEY ("templateGroupId") REFERENCES "template_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;
