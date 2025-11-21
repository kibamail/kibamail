/**
 * Garage S3 Client
 *
 * A wrapper around the AWS SDK S3 client configured for Garage object storage.
 * Provides common operations for uploading, downloading, and deleting files.
 *
 * @see https://garagehq.deuxfleurs.fr/documentation/reference-manual/s3-compatibility/
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  type PutObjectCommandInput,
  type GetObjectCommandInput,
  type DeleteObjectCommandInput,
  type ListObjectsV2CommandInput,
} from "@aws-sdk/client-s3";
import { env } from "@/env/schema";

/**
 * Initialize the S3 client configured for Garage
 */
const s3Client = new S3Client({
  endpoint: env.GARAGE_S3_ENDPOINT,
  region: env.GARAGE_S3_REGION,
  credentials: {
    accessKeyId: env.GARAGE_S3_ACCESS_KEY_ID,
    secretAccessKey: env.GARAGE_S3_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true, // Required for Garage S3 compatibility
});

/**
 * Upload a file to Garage S3
 *
 * @param key - The object key (path) in the bucket
 * @param body - The file content (Buffer, Readable, or string)
 * @param contentType - The MIME type of the file
 * @param bucket - The bucket name (defaults to env.GARAGE_S3_BUCKET)
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
  bucket: string = env.GARAGE_S3_BUCKET,
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
    location: `${env.GARAGE_S3_ENDPOINT}/${bucket}/${key}`,
  };
}

/**
 * Download a file from Garage S3
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to env.GARAGE_S3_BUCKET)
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
  bucket: string = env.GARAGE_S3_BUCKET,
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
 * Delete a file from Garage S3
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to env.GARAGE_S3_BUCKET)
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
  bucket: string = env.GARAGE_S3_BUCKET,
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
 * @param bucket - The bucket name (defaults to env.GARAGE_S3_BUCKET)
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
  bucket: string = env.GARAGE_S3_BUCKET,
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
 * Check if a file exists in Garage S3
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to env.GARAGE_S3_BUCKET)
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
  bucket: string = env.GARAGE_S3_BUCKET,
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
 * @param bucket - The bucket name (defaults to env.GARAGE_S3_BUCKET)
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
  bucket: string = env.GARAGE_S3_BUCKET,
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
 * Get the public URL for a file in a bucket with website hosting enabled
 *
 * Garage uses subdomain-based bucket access for web hosting:
 * - Format: http://{bucket}.web.garage.localhost:3902/{key}
 * - In production: http://{bucket}.s3.yourdomain.com/{key}
 *
 * @param key - The object key (path) in the bucket
 * @param bucket - The bucket name (defaults to "public-files")
 * @returns The public HTTP URL to access the file
 *
 * @example
 * ```ts
 * const url = getPublicFileUrl("images/avatar.jpg");
 * // Returns: http://public-files.web.garage.localhost:3902/images/avatar.jpg
 *
 * // Use in JSX
 * <img src={getPublicFileUrl("images/logo.png")} alt="Logo" />
 * ```
 *
 * @note The bucket must have website hosting enabled:
 * docker exec starterkit-garage /garage bucket website --allow <bucket-name>
 */
export function getPublicFileUrl(
  key: string,
  bucket: string = "public-files",
): string {
  // Garage web hosting uses subdomain-based bucket access
  // Development: http://{bucket}.web.garage.localhost:3902/{key}
  // Production: http://{bucket}.s3.yourdomain.com/{key}

  const isDevelopment =
    env.GARAGE_S3_ENDPOINT.includes("localhost") ||
    env.GARAGE_S3_ENDPOINT.includes("127.0.0.1");

  if (isDevelopment) {
    // Local development with subdomain
    return `http://${bucket}.web.garage.localhost:3902/${key}`;
  }

  // Production - assumes you have configured DNS and reverse proxy
  // You should set GARAGE_S3_ENDPOINT to your public domain
  const domain = new URL(env.GARAGE_S3_ENDPOINT).hostname;
  return `https://${bucket}.${domain}/${key}`;
}

/**
 * Upload a file to the public bucket with website hosting
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
 * // http://localhost:3902/public-files/images/banner.jpg
 * ```
 */
export async function uploadPublicFile(
  key: string,
  body: PutObjectCommandInput["Body"],
  contentType?: string,
) {
  const bucket = "public-files";

  const result = await uploadFile(key, body, contentType, bucket);

  return {
    ...result,
    publicUrl: getPublicFileUrl(key, bucket),
    bucket,
  };
}

/**
 * Export the raw S3 client for advanced operations
 */
export { s3Client };
