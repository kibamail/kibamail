/**
 * Private Storage Client
 *
 * Handles file operations for the PRIVATE S3 bucket.
 * Used for: contact imports, exports, and other sensitive files.
 *
 * This bucket should NOT have public access. Files are accessed via signed URLs
 * with configurable expiration times.
 *
 * @see https://developers.cloudflare.com/r2/
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env/schema";

/**
 * S3 client configured for the private bucket
 */
const privateS3Client = new S3Client({
  endpoint: env.S3_PRIVATE_ENDPOINT,
  region: env.S3_PRIVATE_REGION,
  credentials: {
    accessKeyId: env.S3_PRIVATE_ACCESS_KEY_ID,
    secretAccessKey: env.S3_PRIVATE_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/**
 * Default expiration time for signed URLs (5 minutes)
 */
const DEFAULT_SIGNED_URL_EXPIRY = 5 * 60; // 5 minutes in seconds

/**
 * Upload a file to the private bucket
 *
 * @param key - The object key (path) in the bucket
 * @param body - The file content (Buffer, Readable, or string)
 * @param contentType - The MIME type of the file
 * @returns The uploaded object's info including the key for later retrieval
 *
 * @example
 * ```ts
 * const result = await uploadPrivateFile(
 *   "contact-imports/workspace-123/contacts.csv",
 *   csvBuffer,
 *   "text/csv"
 * );
 * console.log("Uploaded key:", result.key);
 * ```
 */
export async function uploadPrivateFile(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string,
) {
  const command = new PutObjectCommand({
    Bucket: env.S3_PRIVATE_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  const response = await privateS3Client.send(command);

  return {
    etag: response.ETag,
    versionId: response.VersionId,
    key,
  };
}

/**
 * Get a signed URL for downloading a private file
 *
 * @param key - The object key (path) in the bucket
 * @param expiresIn - URL expiration time in seconds (default: 5 minutes)
 * @returns A signed URL that provides temporary access to the file
 *
 * @example
 * ```ts
 * // Get a URL that expires in 5 minutes (default)
 * const url = await getPrivateFileSignedUrl("contact-imports/workspace-123/contacts.csv");
 *
 * // Get a URL that expires in 1 hour
 * const url = await getPrivateFileSignedUrl("exports/report.csv", 3600);
 * ```
 */
async function _getPrivateFileSignedUrl(
  key: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.S3_PRIVATE_BUCKET,
    Key: key,
  });

  return await getSignedUrl(privateS3Client, command, { expiresIn });
}

/**
 * Get a signed URL for uploading a private file
 *
 * @param key - The object key (path) in the bucket
 * @param contentType - The expected MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 5 minutes)
 * @returns A signed URL that allows uploading a file
 *
 * @example
 * ```ts
 * const uploadUrl = await getPrivateUploadSignedUrl(
 *   "contact-imports/workspace-123/contacts.csv",
 *   "text/csv",
 *   300
 * );
 * // Client can PUT directly to this URL
 * ```
 */
async function _getPrivateUploadSignedUrl(
  key: string,
  contentType?: string,
  expiresIn: number = DEFAULT_SIGNED_URL_EXPIRY,
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.S3_PRIVATE_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(privateS3Client, command, { expiresIn });
}

/**
 * Download a file from the private bucket
 *
 * @param key - The object key (path) in the bucket
 * @returns The file content as a stream and metadata
 *
 * @example
 * ```ts
 * const file = await downloadPrivateFile("contact-imports/workspace-123/contacts.csv");
 * const content = await file.body?.transformToString();
 * ```
 */
export async function downloadPrivateFile(key: string) {
  const command = new GetObjectCommand({
    Bucket: env.S3_PRIVATE_BUCKET,
    Key: key,
  });

  const response = await privateS3Client.send(command);

  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
  };
}

/**
 * Delete a file from the private bucket
 *
 * @param key - The object key (path) in the bucket
 * @returns Deletion confirmation
 */
async function _deletePrivateFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_PRIVATE_BUCKET,
    Key: key,
  });

  const response = await privateS3Client.send(command);

  return {
    deleted: true,
    versionId: response.VersionId,
    deleteMarker: response.DeleteMarker,
  };
}

/**
 * Check if a file exists in the private bucket
 *
 * @param key - The object key (path) in the bucket
 * @returns True if file exists, false otherwise
 */
async function _privateFileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: env.S3_PRIVATE_BUCKET,
      Key: key,
    });

    await privateS3Client.send(command);
    return true;
  } catch (error) {
    const s3Error = error as {
      name?: string;
      $metadata?: { httpStatusCode?: number };
    };
    if (
      s3Error.name === "NotFound" ||
      s3Error.$metadata?.httpStatusCode === 404
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * List files in the private bucket with optional prefix filtering
 *
 * @param prefix - Filter objects by prefix (folder path)
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns List of objects with metadata
 */
async function _listPrivateFiles(prefix?: string, maxKeys: number = 1000) {
  const command = new ListObjectsV2Command({
    Bucket: env.S3_PRIVATE_BUCKET,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await privateS3Client.send(command);

  return {
    contents: response.Contents || [],
    keyCount: response.KeyCount || 0,
    isTruncated: response.IsTruncated || false,
    continuationToken: response.NextContinuationToken,
  };
}

/**
 * Get file metadata from the private bucket without downloading
 *
 * @param key - The object key (path) in the bucket
 * @returns File metadata
 */
async function _getPrivateFileMetadata(key: string) {
  const command = new HeadObjectCommand({
    Bucket: env.S3_PRIVATE_BUCKET,
    Key: key,
  });

  const response = await privateS3Client.send(command);

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
    metadata: response.Metadata,
  };
}
