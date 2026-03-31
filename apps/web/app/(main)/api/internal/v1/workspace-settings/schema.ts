import { z } from "zod";

export const updateWorkspaceSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  streetAddress: z.string().min(1, "Street address is required").max(500),
  city: z.string().min(1, "City is required").max(200),
  state: z.string().max(200).optional().nullable(),
  zipCode: z.string().max(20).optional().nullable(),
  country: z.string().min(1, "Country is required").max(200),
  termsUrl: z
    .string()
    .url("Must be a valid URL")
    .max(2000)
    .optional()
    .nullable(),
  privacyUrl: z
    .string()
    .url("Must be a valid URL")
    .max(2000)
    .optional()
    .nullable(),
});
