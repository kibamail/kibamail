-- AlterTable
ALTER TABLE "email_templates" ADD COLUMN "uniqueSlug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "unique_template_slug_per_workspace" ON "email_templates"("workspaceId", "uniqueSlug");
