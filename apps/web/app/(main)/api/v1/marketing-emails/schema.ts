/**
 * Marketing Email Validation Schemas (External API)
 */

import { z } from "zod";

export const createMarketingEmailSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  subject: z.string().max(998).optional(),
  previewText: z.string().max(255).optional(),
  html: z.string().optional(),
  senderIdentityId: z.string().optional(),
  replyToIdentityId: z.string().optional(),
  trackClicks: z.boolean().optional().default(true),
  trackOpens: z.boolean().optional().default(true),
  type: z
    .enum(["AUTOMATION", "NOTIFICATION"])
    .optional()
    .default("AUTOMATION"),
});

export const updateMarketingEmailSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().max(998).optional().nullable(),
  previewText: z.string().max(255).optional().nullable(),
  html: z.string().optional().nullable(),
  senderIdentityId: z.string().optional().nullable(),
  replyToIdentityId: z.string().optional().nullable(),
  trackClicks: z.boolean().optional(),
  trackOpens: z.boolean().optional(),
  type: z.enum(["AUTOMATION", "NOTIFICATION"]).optional(),
});
