import "server-only"

import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const BUCKET = process.env.MUVX_AWS_BUCKET ?? "muvx-app-storage"
const REGION = process.env.MUVX_AWS_REGION ?? "ap-southeast-2"

/**
 * Shared S3 client for the entire app. Falls back to the default AWS credential
 * chain (SSO profile, EC2 instance role, etc.) when access keys are not set.
 */
export const s3 = new S3Client({
  region: REGION,
  ...(process.env.MUVX_AWS_ACCESS_KEY_ID && process.env.MUVX_AWS_SECRET_ACCESS_KEY
    ? {
        credentials: {
          accessKeyId: process.env.MUVX_AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.MUVX_AWS_SECRET_ACCESS_KEY,
        },
      }
    : {}),
})

export const S3_BUCKET = BUCKET
export const S3_REGION = REGION

export interface PresignedUpload {
  uploadUrl: string
  publicUrl: string
  key: string
  expiresIn: number
}

/**
 * Generate a presigned PUT URL for the browser to upload directly to S3.
 * No multipart, no server payload — keeps compute light and streams large files.
 *
 * Naming: `{tenantId}/{kind}/{id}/{filename}` so each tenant owns a prefix and
 * `kind` is `attachments`, `documents`, or `artifacts`.
 */
export async function presignUpload(opts: {
  tenantId: string
  kind: "attachments" | "documents" | "artifacts"
  filename: string
  contentType?: string
  expiresIn?: number
}): Promise<PresignedUpload> {
  const safeName = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_")
  const id = crypto.randomUUID()
  const key = `${opts.tenantId}/${opts.kind}/${id}/${safeName}`
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: opts.contentType,
  })
  const expiresIn = opts.expiresIn ?? 60 * 10
  const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn })
  return {
    uploadUrl,
    publicUrl: `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`,
    key,
    expiresIn,
  }
}

/** Generate a presigned GET URL for browser downloads / private reads. */
export async function presignDownload(opts: { key: string; expiresIn?: number; downloadFilename?: string }) {
  const cmd = new GetObjectCommand({
    Bucket: BUCKET,
    Key: opts.key,
    ResponseContentDisposition: opts.downloadFilename
      ? `attachment; filename="${opts.downloadFilename.replace(/[\\"\n]/g, "_")}"`
      : undefined,
  })
  const expiresIn = opts.expiresIn ?? 60 * 10
  return getSignedUrl(s3, cmd, { expiresIn })
}

/** Upload a server-side buffer (for documents the agent generates itself). */
export async function putObject(opts: {
  key: string
  body: Buffer | Uint8Array | string
  contentType?: string
}) {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: opts.key,
      Body: opts.body,
      ContentType: opts.contentType,
    }),
  )
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${opts.key}`
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}
