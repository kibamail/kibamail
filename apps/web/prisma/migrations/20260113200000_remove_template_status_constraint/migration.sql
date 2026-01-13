-- DropIndex
-- This constraint incorrectly groups all root templates (parentId=null) together,
-- preventing multiple independent templates from being published simultaneously.
-- Versioning logic (only one PUBLISHED per parent) is enforced in application code.
DROP INDEX "email_templates_workspaceId_parentId_status_key";
