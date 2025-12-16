/**
 * S3 Client
 *
 * A wrapper around the AWS SDK S3 client configured for S3-compatible storage.
 * Supports Backblaze B2, AWS S3, MinIO, and other S3-compatible services.
 * Provides common operations for uploading, downloading, and deleting files.
 *
 * @see https://www.backblaze.com/docs/cloud-storage-s3-compatible-api
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { env } from "@/env/schema";

/**
 * Initialize the S3 client configured for S3-compatible storage
 */
const s3Client = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for most S3-compatible services
});

/**
 * Upload a file to S3
 *
 * @param key - The object key (path) in the bucket
 * @param body - The file content (Buffer, Readable, or string)
 * @param contentType - The MIME type of the file
 * @param bucket - The bucket name (defaults to env.S3_BUCKET)
 * @returns The uploaded object's ETag and location
 *
 * @example
 * ```ts
 * const result = await uploadFile('uploads/file.txt', 'Hello World', 'text/plain');
 * console.log('Uploaded to:', result.location);
 * ```
 */
export async function uploadFile(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string,
  bucket: string = env.S3_BUCKET,
) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  const response = await s3Client.send(command);

  return {
    etag: response.ETag,
    versionId: response.VersionId,
    location: `${env.S3_ENDPOINT}/${bucket}/${key}`,
  };
}

/**
 * Download a file from S3
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to env.S3_BUCKET)
 * @returns The file content as a stream and metadata
 *
 * @example
 * ```ts
 * const file = await downloadFile('uploads/file.txt');
 * const content = await file.body.transformToString();
 * console.log('Content:', content);
 * ```
 */
export async function downloadFile(
  key: string,
  bucket: string = env.S3_BUCKET,
) {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    body: response.Body,
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
  };
}

/**
 * Delete a file from S3
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to env.S3_BUCKET)
 * @returns Deletion confirmation
 *
 * @example
 * ```ts
 * await deleteFile('uploads/file.txt');
 * console.log('File deleted successfully');
 * ```
 */
export async function deleteFile(
  key: string,
  bucket: string = env.S3_BUCKET,
) {
  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    deleted: true,
    versionId: response.VersionId,
    deleteMarker: response.DeleteMarker,
  };
}

/**
 * List files in a bucket with optional prefix filtering
 *
 * @param prefix - Filter objects by prefix (folder path)
 * @param bucket - The bucket name (defaults to env.S3_BUCKET)
 * @param maxKeys - Maximum number of keys to return (default: 1000)
 * @returns List of objects with metadata
 *
 * @example
 * ```ts
 * const files = await listFiles('uploads/');
 * for (const file of files.contents) {
 *   console.log(file.Key, file.Size);
 * }
 * ```
 */
export async function listFiles(
  prefix?: string,
  bucket: string = env.S3_BUCKET,
  maxKeys: number = 1000,
) {
  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    MaxKeys: maxKeys,
  });

  const response = await s3Client.send(command);

  return {
    contents: response.Contents || [],
    keyCount: response.KeyCount || 0,
    isTruncated: response.IsTruncated || false,
    continuationToken: response.NextContinuationToken,
  };
}

/**
 * Check if a file exists in S3
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to env.S3_BUCKET)
 * @returns True if file exists, false otherwise
 *
 * @example
 * ```ts
 * const exists = await fileExists('uploads/file.txt');
 * if (exists) {
 *   console.log('File exists');
 * }
 * ```
 */
export async function fileExists(
  key: string,
  bucket: string = env.S3_BUCKET,
): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });

    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Get file metadata without downloading the file
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to env.S3_BUCKET)
 * @returns File metadata
 *
 * @example
 * ```ts
 * const metadata = await getFileMetadata('uploads/file.txt');
 * console.log('Size:', metadata.contentLength, 'bytes');
 * ```
 */
export async function getFileMetadata(
  key: string,
  bucket: string = env.S3_BUCKET,
) {
  const command = new HeadObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  const response = await s3Client.send(command);

  return {
    contentType: response.ContentType,
    contentLength: response.ContentLength,
    lastModified: response.LastModified,
    etag: response.ETag,
    metadata: response.Metadata,
  };
}

/**
 * Get the public URL for a file
 *
 * Uses the S3_PUBLIC_URL environment variable as the base URL.
 * This should be configured to point to your CDN or public bucket URL.
 *
 * @param key - The object key (path) in the bucket
 * @returns The public HTTP URL to access the file
 *
 * @example
 * ```ts
 * const url = getPublicFileUrl("images/avatar.jpg");
 * // Returns: https://cdn.yourdomain.com/images/avatar.jpg
 *
 * // Use in JSX
 * <img src={getPublicFileUrl("images/logo.png")} alt="Logo" />
 * ```
 */
export function getPublicFileUrl(key: string): string {
  // Remove trailing slash from public URL if present
  const baseUrl = env.S3_PUBLIC_URL.replace(/\/$/, "");
  return `${baseUrl}/${key}`;
}

/**
 * Upload a file and return its public URL
 *
 * @param key - The object key (path) in the bucket
 * @param body - The file content (Buffer, Readable, or string)
 * @param contentType - The MIME type of the file
 * @returns The uploaded object's info including public URL
 *
 * @example
 * ```ts
 * const result = await uploadPublicFile(
 *   "images/banner.jpg",
 *   imageBuffer,
 *   "image/jpeg"
 * );
 *
 * console.log("Public URL:", result.publicUrl);
 * // https://cdn.yourdomain.com/images/banner.jpg
 * ```
 */
export async function uploadPublicFile(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string,
) {
  const result = await uploadFile(key, body, contentType);

  return {
    ...result,
    publicUrl: getPublicFileUrl(key),
  };
}

/**
 * Export the raw S3 client for advanced operations
 */
export { s3Client };
