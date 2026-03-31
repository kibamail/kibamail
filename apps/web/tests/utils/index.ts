/**
 * Test Utilities
 *
 * Centralized exports for all test utilities.
 * Import everything you need from this single file.
 */

/**
 * Compliance footer containing all required compliance variables.
 * Append this to any test HTML that needs to pass compliance validation.
 */
export const COMPLIANCE_FOOTER =
  '{{business_address}}<br><a href="{{unsubscribe_url}}">Unsubscribe</a> | <a href="{{terms_url}}">Terms</a> | <a href="{{privacy_url}}">Privacy</a>';

/**
 * Minimal compliant HTML email for tests that need to pass compliance validation.
 * Contains all 4 required variables: business_address, unsubscribe_url, terms_url, privacy_url.
 */
export const COMPLIANT_HTML =
  `<html><body><p>Content</p><footer>${COMPLIANCE_FOOTER}</footer></body></html>`;

// API Client utilities
export { apiRequest, del, get, post, put } from "./api-client";

// API Key utilities
export {
  type CreateApiKeyOptions,
  type CreatedApiKey,
  createFullAccessApiKey,
  createReadOnlyApiKey,
  createApiKeyWithoutSmtpSend,
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

// Webhook testing utilities
export {
  createWebhookMocks,
  expectWebhookDispatched,
  expectWebhookNotDispatched,
  getWebhookCalls,
  type MockDispatchWebhook,
  type MockDispatchWebhookBulk,
} from "./webhooks";
