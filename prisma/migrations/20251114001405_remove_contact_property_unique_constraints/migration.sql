-- DropIndex
DROP INDEX `contact_properties_workspaceId_name_key` ON `contact_properties`;

-- DropIndex
DROP INDEX `contact_properties_workspaceId_slot_key` ON `contact_properties`;

-- CreateIndex
CREATE INDEX `contact_properties_workspaceId_name_idx` ON `contact_properties`(`workspaceId`, `name`);

-- CreateIndex
CREATE INDEX `contact_properties_workspaceId_slot_idx` ON `contact_properties`(`workspaceId`, `slot`);
