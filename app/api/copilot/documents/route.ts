import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/dal"
import { presignDownload } from "@/lib/s3-client"

export const runtime = "nodejs"

/**
 * GET /api/copilot/documents?key=...
 *
 * Returns a short-lived presigned GET URL the browser opens to download a
 * generated document directly from S3. Required because generated docs live in
 * a private bucket.
 */
const querySchema = z.object({
  key: z.string().min(1).max(1024),
  download: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 })
    }

    const url = new URL(req.url)
    const parsed = querySchema.safeParse({
      key: url.searchParams.get("key") ?? "",
      download: url.searchParams.get("download") ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    // Tenant isolation: the key must start with the active org's prefix.
    const expectedPrefix = `${tenantId}/`
    if (!parsed.data.key.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const downloadUrl = await presignDownload({
      key: parsed.data.key,
      downloadFilename: parsed.data.download,
      expiresIn: 60 * 5,
    })

    return NextResponse.json({ downloadUrl, expiresIn: 300 })
  } catch (error: any) {
    console.error("[COPILOT-DOCUMENTS] error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to presign download" },
      { status: 500 },
    )
  }
}
