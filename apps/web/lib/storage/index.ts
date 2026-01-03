/**
 * Storage Module
 *
 * Provides access to both public and private S3-compatible storage.
 */

// Private storage exports
export { downloadPrivateFile, uploadPrivateFile } from "./private-storage";
// Public storage exports
export { uploadPublicFile } from "./public-storage";
