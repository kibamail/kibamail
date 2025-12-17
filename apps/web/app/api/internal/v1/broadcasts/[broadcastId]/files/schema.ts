/**
 * Broadcast Files Upload Schema
 *
 * Zod schemas for file upload request/response validation
 */

import { z } from "zod";

export const uploadedFileSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  size: z.number(),
  type: z.string(),
});

export const uploadBroadcastFilesResponseSchema = z.object({
  files: z.array(uploadedFileSchema),
});

export type UploadedFile = z.infer<typeof uploadedFileSchema>;
export type UploadBroadcastFilesResponse = z.infer<
  typeof uploadBroadcastFilesResponseSchema
>;
