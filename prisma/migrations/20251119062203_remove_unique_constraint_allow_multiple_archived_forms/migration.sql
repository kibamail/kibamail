-- DropIndex
DROP INDEX `forms_workspaceId_parentId_status_key` ON `forms`;

-- CreateIndex
CREATE INDEX `forms_workspace_parent_status_idx` ON `forms`(`workspaceId`, `parentId`, `status`);
