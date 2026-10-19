import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import { createPresignedGet, s3Configured } from "@/lib/s3"

export const maxDuration = 30

/**
 * Re-signs a stored S3 key into a fresh presigned GET URL.
 *
 * Upload URLs expire. When a chat is loaded from the database (or a user
 * clicks download), we swap the stored key for a live URL so attachments keep
 * working across sessions.
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
    const key = typeof body?.key === "string" ? body.key : ""

    if (!key) {
      return NextResponse.json({ error: "key is required" }, { status: 400 })
    }

    // Never sign keys outside this workspace's namespace.
    if (!key.startsWith(`copilot/${tenantId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Same media-type override as the initial upload so a re-signed URL is
    // indistinguishable from a fresh one to the model.
    const mediaType =
      typeof body?.mediaType === "string" && body.mediaType
        ? body.mediaType
        : undefined

    const { url } = await createPresignedGet(key, 3600, mediaType)
    return NextResponse.json({ url })
  } catch (error) {
    console.error("[COPILOT-UPLOAD-SIGN] Error:", error)
    return NextResponse.json(
      { error: "Failed to sign url" },
      { status: 500 },
    )
  }
}