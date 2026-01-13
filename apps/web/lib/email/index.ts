/**
 * Email Utilities
 *
 * Centralized exports for email preparation and tracking utilities.
 */

export {
  convertToMtaMessages,
  convertEmailOnlyToMtaMessages,
  type EmailBroadcast,
  type EmailContact,
  type EmailOnlyContact,
  type PreparedEmail,
  type PreparedEmailOnly,
  prepareEmailBatch,
  prepareEmailOnlyBatch,
} from "./prepare";
