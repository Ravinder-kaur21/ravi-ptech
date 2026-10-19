import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/dal"
import { presignUpload } from "@/lib/s3-client"

export const runtime = "nodejs"

/**
 * POST /api/copilot/attachments
 *
 * Body: { filename: string, contentType?: string }
 * Returns: { uploadUrl, publicUrl, key, expiresIn }
 *
 * The browser PUTs the file directly to S3 using the presigned URL, then
 * embeds `publicUrl` into a `FileUIPart` and sends it via `useChat.sendMessage`.
 * Per the AI SDK v5 docs, `useChat` will accept either a `FileList` (data-URL
 * inline) or a `FileUIPart[]` (server uploads this endpoint handles).
 */
const bodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(255).optional(),
  kind: z.enum(["attachments", "documents", "artifacts"]).optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 })
    }

    const json = await req.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const out = await presignUpload({
      tenantId,
      kind: parsed.data.kind ?? "attachments",
      filename: parsed.data.filename,
      contentType: parsed.data.contentType,
    })
    return NextResponse.json(out)
  } catch (error: any) {
    console.error("[COPILOT-ATTACHMENTS] error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to presign upload" },
      { status: 500 },
    )
  }
}
