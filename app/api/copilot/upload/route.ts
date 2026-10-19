import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import {
  createPresignedPut,
  createPresignedGet,
  s3Configured,
} from "@/lib/s3"

export const maxDuration = 30

/** Hard ceiling on a single upload. Keeps request bodies and S3 PUTs sane. */
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

/** Media types the model providers accept as file content parts. */
const ALLOWED_MEDIA_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/jsonl",
  "application/octet-stream",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
])

export function isAllowedMediaType(mediaType: string): boolean {
  return ALLOWED_MEDIA_TYPES.has(mediaType)
}

export const maxUploadBytes = MAX_BYTES

/**
 * Issues a short-lived presigned PUT so the browser uploads bytes straight to
 * S3 — our server never touches the file body. Returns the key plus a
 * presigned GET so the caller (and the model) can read it back.
 */
export async function POST(req: NextRequest) {
  try {
    if (!s3Configured) {
      return NextResponse.json(
        { error: "File storage is not configured" },
        { status: 503 },
      )
    }

    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json(
        { error: "No active workspace" },
        { status: 400 },
      )
    }

    const body = await req.json().catch(() => null)
    const filename = typeof body?.filename === "string" ? body.filename : ""
    const mediaType =
      typeof body?.mediaType === "string" && body.mediaType
        ? body.mediaType
        : "application/octet-stream"
    const size = Number(body?.size ?? 0)

    if (!filename) {
      return NextResponse.json(
        { error: "filename is required" },
        { status: 400 },
      )
    }

    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json(
        { error: "size must be a positive number" },
        { status: 400 },
      )
    }

    if (size > MAX_BYTES) {
      return NextResponse.json(
        {
          error: `File is too large. Maximum size is ${Math.floor(
            MAX_BYTES / 1024 / 1024,
          )} MB.`,
        },
        { status: 413 },
      )
    }

    if (!isAllowedMediaType(mediaType)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${mediaType}` },
        { status: 415 },
      )
    }

    // Workspace-scoped key. The client never chooses the path.
    const ext = filename.includes(".")
      ? `.${filename.split(".").pop()!.toLowerCase().replace(/[^a-z0-9]/g, "")}`
      : ""
    const key = `copilot/${tenantId}/${Date.now()}-${crypto.randomUUID()}${ext}`

    const { url: putUrl } = await createPresignedPut(
      key,
      mediaType,
      size,
      300,
    )
    // Long-lived enough that the model can fetch it during the run. The media
    // type is pinned onto the response so the model never sees
    // application/octet-stream and rejects the file.
    const { url: getUrl } = await createPresignedGet(key, 3600, mediaType)

    return NextResponse.json({
      key,
      // Signed GET — this is what gets stored on the FileUIPart and what the
      // model downloads. Expires, so re-sign on read for persisted history.
      url: getUrl,
      uploadUrl: putUrl,
      filename,
      mediaType,
      size,
    })
  } catch (error) {
    console.error("[COPILOT-UPLOAD] Error:", error)
    return NextResponse.json(
      { error: "Failed to prepare upload" },
      { status: 500 },
    )
  }
}