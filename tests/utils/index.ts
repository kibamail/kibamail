/**
 * Test Utilities
 *
 * Centralized exports for all test utilities.
 * Import everything you need from this single file.
 */

// API Client utilities
export {
  TestApiRequest,
  apiRequest,
  get,
  post,
  put,
  del,
} from "./api-client";

// API Key utilities
export {
  createTestApiKey,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  cleanupApiKeys,
  deleteApiKey,
  type CreateApiKeyOptions,
  type CreatedApiKey,
} from "./api-keys";

// Data factories
export {
  fakeContact,
  fakeMinimalContact,
  fakeTag,
  fakeTopic,
  fakeSegment,
  fakeApiKey,
  fakeWorkspaceId,
  fakeContacts,
  CONTACT_STATUSES,
} from "./factories";

// Workspace utilities
export {
  createTestWorkspace,
  cleanupWorkspace,
  cleanupWorkspaces,
  createTestContacts,
  createTestTags,
  createTestTopics,
  type TestWorkspace,
} from "./workspace";
