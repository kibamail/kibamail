/**
 * Broadcast Files Upload Schema
 *
 * Zod schemas for file upload request/response validation
 */

import { z } from "zod";

const uploadedFileSchema = z.object({
  name: z.string(),
  url: z.string().url(),
  size: z.number(),
  type: z.string(),
});

const uploadBroadcastFilesResponseSchema = z.object({
  files: z.array(uploadedFileSchema),
});

export type UploadBroadcastFilesResponse = z.infer<
  typeof uploadBroadcastFilesResponseSchema
>;
