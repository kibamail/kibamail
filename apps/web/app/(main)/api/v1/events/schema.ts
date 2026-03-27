import { z } from "zod";

export const createEventSchema = z.object({
  eventName: z
    .string()
    .min(1, "eventName is required")
    .max(100, "eventName must be 100 characters or less")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "eventName must contain only alphanumeric characters, underscores, hyphens, and dots",
    ),
  contactId: z.string().min(1, "contactId is required"),
  properties: z.record(z.string(), z.unknown()).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
