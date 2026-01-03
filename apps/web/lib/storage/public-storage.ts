/**
 * Public Storage Client
 *
 * Handles file operations for the PUBLIC S3 bucket.
 * Used for: broadcast images, organization logos, and other publicly accessible files.
 *
 * This bucket should have public read access enabled via R2 custom domain
 * or R2.dev subdomain.
 *
 * @see https://developers.cloudflare.com/r2/
 */

import {
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type PutObjectCommandInput,
  S3Client,
} from "@aws-sdk/client-s3";
import { env } from "@/env/schema";

/**
 * S3 client configured for the public bucket
 */
const publicS3Client = new S3Client({
  endpoint: env.S3_PUBLIC_ENDPOINT,
  region: env.S3_PUBLIC_REGION,
  credentials: {
    accessKeyId: env.S3_PUBLIC_ACCESS_KEY_ID,
    secretAccessKey: env.S3_PUBLIC_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,
});

/**
 * Upload a file to the public bucket
 *
 * @param key - The object key (path) in the bucket
 * @param body - The file content (Buffer, Readable, or string)
 * @param contentType - The MIME type of the file
 * @returns The uploaded object's info including public URL
 *
 * @example
 * ```ts
 * const result = await uploadPublicFile(
 *   "broadcasts/123/image.jpg",
 *   imageBuffer,
 *   "image/jpeg"
 * );
 * console.log("Public URL:", result.publicUrl);
 * ```
 */
export async function uploadPublicFile(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string,
) {
  const command = new PutObjectCommand({
    Bucket: env.S3_PUBLIC_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  const response = await publicS3Client.send(command);

  return {
    etag: response.ETag,
    versionId: response.VersionId,
    key,
    publicUrl: getPublicFileUrl(key),
  };
}

/**
 * Get the public URL for a file in the public bucket
 *
 * @param key - The object key (path) in the bucket
 * @returns The public HTTP URL to access the file
 *
 * @example
 * ```ts
 * const url = getPublicFileUrl("broadcasts/123/image.jpg");
 * // Returns: https://assets.kibamail.com/broadcasts/123/image.jpg
 * ```
 */
function getPublicFileUrl(key: string): string {
  const baseUrl = env.S3_PUBLIC_URL.replace(/\/$/, "");
  return `${baseUrl}/${key}`;
}

/**
 * Delete a file from the public bucket
 *
 * @param key - The object key (path) in the bucket
 * @returns Deletion confirmation
 */
async function deletePublicFile(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: env.S3_PUBLIC_BUCKET,
    Key: key,
  });

  const response = await publicS3Client.send(command);

  return {
    deleted: true,
    versionId: response.VersionId,
    deleteMarker: response.DeleteMarker,
  };
}

/**
 * Check if a file exists in the public bucket
 *
 * @param key - The object key (path) in the bucket
 * @returns True if file exists, false otherwise
 */
async function publicFileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: env.S3_PUBLIC_BUCKET,
      Key: key,
    });

    await publicS3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * List files in the public bucket with optional prefix filtering
 *
 * @param prefix - Filter objects by prefix (folder path)
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns List of objects with metadata
 */
async function listPublicFiles(prefix?: string, maxKeys: number = 1000) {
  const command = new ListObjectsV2Command({
    Bucket: env.S3_PUBLIC_BUCKET,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await publicS3Client.send(command);

  return {
    contents: response.Contents || [],
    keyCount: response.KeyCount || 0,
    isTruncated: response.IsTruncated || false,
    continuationToken: response.NextContinuationToken,
  };
}

/**
 * Get file metadata from the public bucket without downloading
 *
 * @param key - The object key (path) in the bucket
 * @returns File metadata
 */
async function getPublicFileMetadata(key: string) {
  const command = new HeadObjectCommand({
    Bucket: env.S3_PUBLIC_BUCKET,
    Key: key,
  });

  const response = await publicS3Client.send(command);

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
    metadata: response.Metadata,
  };
}
