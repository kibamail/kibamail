/**
 * Email Utilities
 *
 * Centralized exports for email preparation and tracking utilities.
 */

export {
  signData,
  encodeTrackingPayload,
  decodeTrackingPayload,
  rewriteLinks,
  injectTrackingPixel,
  applyTracking,
} from "./tracking";

export { generateEmailSendId, generateMessageIdForDomain } from "./message-id";

export {
  prepareEmail,
  prepareEmailBatch,
  convertToNatsMessages,
  type EmailContact,
  type EmailBroadcast,
  type PreparedEmail,
} from "./prepare";
