import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/dal"
import { db } from "@/lib/db"
import { copilotScheduledTask } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"
import { randomUUID } from "crypto"

/**
 * CRUD for the user's scheduled coworker tasks. UI surfaces this on
 * /settings/copilot → "Scheduled Tasks" tab and inside the agent's
 * <Queue> on the home dashboard.
 *
 * GET  /api/copilot/tasks           → list mine
 * POST /api/copilot/tasks           → create one
 * PATCH /api/copilot/tasks?id=…      → update status (cancel/resume)
 * DELETE /api/copilot/tasks?id=…    → delete
 */

const createSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  taskType: z.enum(["driver_task", "reminder", "heartbeat"]).default("driver_task"),
  specialist: z.string().default("dispatcher"),
  targetDriverId: z.string().optional(),
  targetDriverName: z.string().optional(),
  targetDriverPhone: z.string().optional(),
  targetLoadId: z.string().optional(),
  targetLoadNumber: z.string().optional(),
  scheduleType: z.enum(["once", "recurring"]).default("once"),
  intervalMinutes: z.number().int().min(1).max(43200).optional(),
  runAt: z.string().datetime().optional(),
  driverPrompt: z.string().max(4000).optional(),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
})

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 400 })

    const status = new URL(req.url).searchParams.get("status") ?? undefined
    const whereClause = status
      ? and(
          eq(copilotScheduledTask.tenantId, tenantId),
          eq(copilotScheduledTask.userId, session.user.id),
          eq(copilotScheduledTask.status, status),
        )
      : and(
          eq(copilotScheduledTask.tenantId, tenantId),
          eq(copilotScheduledTask.userId, session.user.id),
        )

    const tasks = await db
      .select()
      .from(copilotScheduledTask)
      .where(whereClause)
      .orderBy(desc(copilotScheduledTask.createdAt))
      .limit(200)

    return NextResponse.json({ tasks })
  } catch (error: any) {
    console.error("[COPILOT-TASKS-GET] error:", error)
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 400 })

    const json = await req.json().catch(() => ({}))
    const parsed = createSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const row = {
      id: `task_${randomUUID()}`,
      tenantId,
      userId: session.user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      taskType: parsed.data.taskType,
      specialist: parsed.data.specialist,
      targetDriverId: parsed.data.targetDriverId ?? null,
      targetDriverName: parsed.data.targetDriverName ?? null,
      targetDriverPhone: parsed.data.targetDriverPhone ?? null,
      targetLoadId: parsed.data.targetLoadId ?? null,
      targetLoadNumber: parsed.data.targetLoadNumber ?? null,
      scheduleType: parsed.data.scheduleType,
      intervalMinutes: parsed.data.intervalMinutes ? String(parsed.data.intervalMinutes) : null,
      runAt: parsed.data.runAt ? new Date(parsed.data.runAt) : null,
      nextRunAt: parsed.data.runAt ? new Date(parsed.data.runAt) : null,
      status: "scheduled",
      priority: parsed.data.priority,
      driverPrompt: parsed.data.driverPrompt ?? null,
    }
    const [created] = await db.insert(copilotScheduledTask).values(row).returning()
    return NextResponse.json({ success: true, task: created }, { status: 201 })
  } catch (error: any) {
    console.error("[COPILOT-TASKS-POST] error:", error)
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 })
  }
}

const patchSchema = z.object({
  status: z.enum(["scheduled", "cancelled", "completed", "in_progress", "failed"]).optional(),
  runAt: z.string().datetime().optional(),
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
})

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 400 })

    const id = new URL(req.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })
    const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 })
    }

    const [updated] = await db
      .update(copilotScheduledTask)
      .set({
        status: parsed.data.status,
        runAt: parsed.data.runAt ? new Date(parsed.data.runAt) : undefined,
        title: parsed.data.title,
        description: parsed.data.description,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(copilotScheduledTask.id, id),
          eq(copilotScheduledTask.tenantId, tenantId),
          eq(copilotScheduledTask.userId, session.user.id),
        ),
      )
      .returning()
    return NextResponse.json({ success: true, task: updated })
  } catch (error: any) {
    console.error("[COPILOT-TASKS-PATCH] error:", error)
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 400 })

    const id = new URL(req.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

    await db
      .delete(copilotScheduledTask)
      .where(
        and(
          eq(copilotScheduledTask.id, id),
          eq(copilotScheduledTask.tenantId, tenantId),
          eq(copilotScheduledTask.userId, session.user.id),
        ),
      )
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[COPILOT-TASKS-DELETE] error:", error)
    return NextResponse.json({ error: error?.message || "Failed" }, { status: 500 })
  }
}
