/**
 * POST /api/uploads/logo
 *
 * Multipart upload for the workspace logo. Stores under the
 * S3 bucket `muvx-app-storage` in the `workspace-logos/<orgId>/`
 * prefix and returns a public URL.
 *
 * Owner or admin only.
 */
import { NextRequest, NextResponse } from "next/server"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { requireTenant, requirePermission, TenantError } from "@/lib/dal"
import { db } from "@/lib/db"
import { organization } from "@/lib/schema"
import { eq } from "drizzle-orm"
import { recordAuditEvent } from "@/lib/audit"
import { randomUUID } from "crypto"

export const instant = false
export const dynamic = "force-dynamic"

const BUCKET = process.env.S3_BUCKET ?? "muvx-app-storage"
const REGION = process.env.S3_REGION ?? "ap-southeast-2"
const PUBLIC_BASE =
  process.env.S3_PUBLIC_BASE ?? `https://${BUCKET}.s3.${REGION}.amazonaws.com`

const s3 = new S3Client({ region: REGION })

const ALLOWED = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml"])
const MAX_BYTES = 2 * 1024 * 1024

export async function POST(req: NextRequest) {
  try {
    const t = await requireTenant()
    await requirePermission({ resource: "workspace", action: "update" })

    const form = await req.formData()
    const file = form.get("file")
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file" }, { status: 400 })
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type}` },
        { status: 400 }
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large (max 2 MB)" },
        { status: 400 }
      )
    }

    const ext = file.type.split("/")[1] === "svg+xml" ? "svg" : file.type.split("/")[1]
    const key = `workspace-logos/${t.tenantId}/${randomUUID()}.${ext}`

    const bytes = Buffer.from(await file.arrayBuffer())
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: bytes,
        ContentType: file.type,
        CacheControl: "public, max-age=3600",
      })
    )

    const url = `${PUBLIC_BASE}/${key}`

    // Persist immediately on the organization row so the new logo
    // shows up in the sidebar without waiting for the save action.
    await db
      .update(organization)
      .set({ logo: url })
      .where(eq(organization.id, t.tenantId))

    return NextResponse.json({ url })
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json(
        { error: err.code },
        {
          status:
            err.code === "UNAUTHORIZED"
              ? 401
              : err.code === "FORBIDDEN"
                ? 403
                : 409,
        }
      )
    }
    console.error(`[API/UPLOADS-LOGO] error:`, err)
    return NextResponse.json(
      { error: (err as Error)?.message || "Upload failed" },
      { status: 500 }
    )
  }
}
