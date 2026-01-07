/**
 * Email Utilities
 *
 * Centralized exports for email preparation and tracking utilities.
 */

export {
  convertToMtaMessages,
  type EmailBroadcast,
  type EmailContact,
  type PreparedEmail,
  prepareEmailBatch,
} from "./prepare";

// Alias for backward compatibility during NATS migration
export { convertToMtaMessages as convertToNatsMessages } from "./prepare";
