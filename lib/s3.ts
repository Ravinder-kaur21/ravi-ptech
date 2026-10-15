import "server-only"

import { S3Client } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"

/**
 * MUVX S3 storage layer — single source of truth for all file operations.
 *
 * Design: all file uploads go through presigned POST URLs generated here on
 * the server. This keeps AWS credentials 100 % server-side — the browser
 * uploads directly to S3 without the server ever touching the file bytes.
 *
 * Bucket + region are read from environment variables:
 *   MUVX_AWS_BUCKET     — S3 bucket name (e.g. "muvx-prod-storage")
 *   MUVX_AWS_REGION     — AWS region       (e.g. "us-east-1")
 *   MUVX_AWS_ACCESS_KEY_ID / MUVX_AWS_SECRET_ACCESS_KEY  — optional, falls
 *   back to the AWS SDK's default credential chain (EC2/ECS/SSO).
 *
 * Key layout inside the bucket:
 *   logos/{workspaceId}/{filename}      — workspace logos
 *   docs/{workspaceId}/{category}/{filename} — operational documents
 *   uploads/{workspaceId}/{filename}    — ad-hoc uploads
 */

const bucket = process.env.MUVX_AWS_BUCKET
const region = process.env.MUVX_AWS_REGION ?? "us-east-1"

/**
 * Whether S3 storage is configured. Returns false in local dev when
 * MUVX_AWS_BUCKET is not set — the upload endpoint returns a clear 503
 * instead of crashing the server at import time.
 */
export const s3Configured = !!bucket

/**
 * S3 client — lazily created so it doesn't crash during SSR when env vars
 * aren't set (e.g. local dev without S3). The functions below check `bucket`
 * at call time and throw a clear error.
 */
let _s3: S3Client | null = null
function getS3(): S3Client {
  if (!bucket) {
    throw new Error(
      "S3 storage is not configured — set MUVX_AWS_BUCKET in your environment",
    )
  }
  if (!_s3) {
    _s3 = new S3Client({
      region,
      credentials:
        process.env.MUVX_AWS_ACCESS_KEY_ID && process.env.MUVX_AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.MUVX_AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.MUVX_AWS_SECRET_ACCESS_KEY,
            }
          : undefined, // fall back to default credential chain (SSO/EC2/ECS)
    })
  }
  return _s3
}

// ─── Key path helpers ─────────────────────────────────────────────

export function logoKey(workspaceId: string, filename: string): string {
  // Sanitize filename: keep extension, replace everything else with a hash
  const ext = filename.split(".").pop()
  const safe = `${workspaceId}-${Date.now()}.${ext}`
  return `logos/${safe}`
}

/**
 * Generate a presigned POST URL for direct-to-S3 upload from the browser.
 *
 * The key is chosen by the server (workspace-scoped), so the caller can't
 * write to arbitrary paths. The browser gets a time-limited URL and uploads
 * the file bytes directly to S3 — our server never handles them.
 */
export async function createPresignedPut(
  key: string,
  contentType: string,
  contentLength: number,
  expiresInSec = 300, // 5 minutes
): Promise<{ url: string }> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
    // ACL removed — bucket has BlockPublicAcls=true; use presigned GET URLs for public access
  })
  const url = await getSignedUrl(getS3(), command, {
    expiresIn: expiresInSec,
  })
  // Return the key too so the client can save it via the workspace API
  return { url }
}

/** Full public URL for a key stored in the bucket. 
 * Note: Objects are private by default (bucket blocks public ACLs).
 * For public access, use presigned GET URLs with appropriate expiry.
 */
export function publicUrl(key: string): string {
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`
}

/** Generate a presigned GET URL for public sharing (e.g., invoice logos). */
export async function createPresignedGet(
  key: string,
  expiresInSec = 3600, // 1 hour default
): Promise<{ url: string }> {
  const { GetObjectCommand } = await import("@aws-sdk/client-s3")
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const url = await getSignedUrl(getS3(), command, { expiresIn: expiresInSec })
  return { url }
}

/** Delete an object by key. */
export async function deleteObject(key: string): Promise<void> {
  await getS3().send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key }),
  )
}

/** Check whether a bucket exists (used by the setup script). */
export async function bucketExists(): Promise<boolean> {
  try {
    const { HeadBucketCommand } = await import("@aws-sdk/client-s3")
    await getS3().send(
      new HeadBucketCommand({ Bucket: bucket }),
    )
    return true
  } catch {
    return false
  }
}

const self = { createPresignedPut, publicUrl, deleteObject, bucketExists, logoKey }
export default self
