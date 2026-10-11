import { NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/lib/dal"
import { listAuditEvents, listAuditActionNames, listAuditActorEmails, verifyAuditChain } from "@/lib/audit"

const querySchema = z.object({
  actorEmail: z.string().optional(),
  action: z.string().optional(),
  targetId: z.string().optional(),
  targetType: z.string().optional(),
  since: z.string().datetime().optional(),
  until: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(500).optional(),
  offset: z.coerce.number().min(0).optional(),
  /** When set, returns the row set as CSV (or JSON if "json"). */
  format: z.enum(["csv", "json"]).optional(),
  /** When "1", also runs the hash-chain verifier and reports integrity. */
  verify: z.string().optional(),
})

/** GET /api/admin/audit — paginated audit log + filter facets. */
export async function GET(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }

  const url = new URL(req.url)
  const raw = Object.fromEntries(url.searchParams)
  const parsed = querySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid query", details: parsed.error.issues },
      { status: 400 }
    )
  }
  const q = parsed.data

  const { events, total } = await listAuditEvents({
    actorEmail: q.actorEmail,
    action: q.action,
    targetId: q.targetId,
    targetType: q.targetType,
    since: q.since ? new Date(q.since) : undefined,
    until: q.until ? new Date(q.until) : undefined,
    limit: q.limit ?? 100,
    offset: q.offset ?? 0,
  })

  if (q.format === "csv") {
    const lines: string[] = [
      "id,created_at,actor_email,action,target_type,target_id,target_label,ip_address,hash,prev_hash",
    ]
    for (const e of events) {
      const cells = [
        e.id,
        e.createdAt.toISOString(),
        e.actorEmail,
        e.action,
        e.targetType,
        e.targetId ?? "",
        (e.targetLabel ?? "").replace(/[",\n]/g, " "),
        e.ipAddress ?? "",
        e.hash ?? "",
        e.prevHash ?? "",
      ]
      lines.push(cells.map((c) => `"${c}"`).join(","))
    }
    return new Response(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="muvx-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  if (q.format === "json") {
    return new Response(JSON.stringify({ events, total }, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="muvx-audit-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  }

  const [actions, actors] = await Promise.all([
    listAuditActionNames(),
    listAuditActorEmails(),
  ])

  const verify = q.verify === "1" ? await verifyAuditChain() : undefined

  return NextResponse.json({ events, total, actions, actors, verify })
}
