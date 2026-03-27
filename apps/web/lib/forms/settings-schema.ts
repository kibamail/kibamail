import { z } from "zod/v4";

/**
 * Behavioral settings for forms.
 *
 * Controls what happens after submission (redirect or message),
 * double opt-in, and duplicate prevention.
 */
export const formSettingsSchema = z.object({
  successAction: z
    .discriminatedUnion("type", [
      z.object({
        type: z.literal("message"),
        message: z.string().optional(),
      }),
      z.object({
        type: z.literal("redirect"),
        url: z.string().url(),
        openInNewTab: z.boolean().optional().default(false),
      }),
    ])
    .optional(),
  doubleOptIn: z
    .object({
      enabled: z.boolean(),
    })
    .optional(),
  preventDuplicateSubmissions: z.boolean().optional().default(false),
});

export type FormSettings = z.infer<typeof formSettingsSchema>;
