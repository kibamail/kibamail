/**
 * Inbox API Validation Schemas
 *
 * Zod schemas for validating inbox API request bodies
 */

import { z } from "zod";

/**
 * Schema for updating a conversation
 */
export const updateConversationSchema = z.object({
  status: z.enum(["OPEN", "CLOSED", "ARCHIVED"]).optional(),
});

/**
 * Schema for sending a reply
 */
export const sendReplySchema = z.object({
  /** HTML content of the reply */
  content: z.string().min(1, "Reply content is required"),
  /** Optional subject override (defaults to Re: original subject) */
  subject: z.string().optional(),
});

/**
 * Schema for marking messages as read
 */
export const markMessagesReadSchema = z.object({
  /** Message IDs to mark as read. If not provided, all messages are marked. */
  messageIds: z.array(z.string()).optional(),
});
