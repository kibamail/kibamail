/**
 * Manual Test Library
 *
 * Exports all utilities for creating manual tests.
 */

export { testConfig, type ManualTestConfig } from "./config";
export {
  createApiKey,
  createContacts,
  createVerifiedDomain,
  cleanupWorkspace,
  disconnect,
  generateWorkspaceId,
  type CreatedApiKey,
  type CreatedContact,
  type CreatedDomain,
} from "./database";
export { ManualTest, type TestContext } from "./base-test";
