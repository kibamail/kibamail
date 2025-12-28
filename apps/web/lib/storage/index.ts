/**
 * Storage Module
 *
 * Provides access to both public and private S3-compatible storage.
 *
 * PUBLIC STORAGE (public-storage.ts):
 * - Broadcast images
 * - Organization logos
 * - Other publicly accessible assets
 * - Files are accessed via direct public URLs
 *
 * PRIVATE STORAGE (private-storage.ts):
 * - Contact imports (CSV files)
 * - Exports and reports
 * - Sensitive documents
 * - Files are accessed via signed URLs with expiration
 *
 * @example
 * ```ts
 * import {
 *   uploadPublicFile,
 *   getPublicFileUrl,
 *   uploadPrivateFile,
 *   getPrivateFileSignedUrl,
 * } from "@/lib/storage";
 *
 * // Upload a public image
 * const publicResult = await uploadPublicFile("images/logo.png", buffer, "image/png");
 * console.log(publicResult.publicUrl); // https://assets.kibamail.com/images/logo.png
 *
 * // Upload a private CSV
 * const privateResult = await uploadPrivateFile("imports/contacts.csv", buffer, "text/csv");
 * const signedUrl = await getPrivateFileSignedUrl(privateResult.key, 300); // 5 min expiry
 * ```
 */

// Public storage exports
export {
  uploadPublicFile,
  getPublicFileUrl,
  deletePublicFile,
  publicFileExists,
  listPublicFiles,
  getPublicFileMetadata,
  publicS3Client,
} from "./public-storage";

// Private storage exports
export {
  uploadPrivateFile,
  getPrivateFileSignedUrl,
  getPrivateUploadSignedUrl,
  downloadPrivateFile,
  deletePrivateFile,
  privateFileExists,
  listPrivateFiles,
  getPrivateFileMetadata,
  privateS3Client,
} from "./private-storage";
