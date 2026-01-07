/**
 * Test Utilities
 *
 * Centralized exports for all test utilities.
 * Import everything you need from this single file.
 */

// API Client utilities
export { apiRequest, del, get, post, put } from "./api-client";

// API Key utilities
export {
  type CreateApiKeyOptions,
  type CreatedApiKey,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createTestApiKey,
} from "./api-keys";

// Data factories
export {
  fakeContact,
  fakeContacts,
  fakeMinimalContact,
} from "./factories";

// Workspace utilities
export {
  cleanupWorkspace,
  createTestContacts,
  createTestTopics,
  createTestWorkspace,
  type TestWorkspace,
} from "./workspace";

// Mailpit utilities (for MTA integration tests)
export {
  createMailpitClient,
  emailAssertions,
  MailpitClient,
  skipIfMailpitUnavailable,
  type MailpitAddress,
  type MailpitAttachment,
  type MailpitClientOptions,
  type MailpitHeaders,
  type MailpitMessage,
  type MailpitMessagesResponse,
  type MailpitMessageSummary,
} from "./mailpit";
