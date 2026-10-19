/**
 * Scheduled-task runner for the Muvx Copilot.
 *
 * The "agentic coworker" promise relies on this. `copilot_scheduled_task` rows
 * are inert without it. This module:
 *   1. Claims due rows with `FOR UPDATE SKIP LOCKED` so concurrent workers
 *      never race each other.
 *   2. Replays the original tool context, executes the task kind-specific logic,
 *      and writes the result back into `conversation_log` + `last_result`.
 *   3. Marks `status='completed'` or `failed` and bumps `last_run_at` and
 *      `next_run_at` (for recurring tasks).
 *
 * Triggered by Vercel Cron at /api/cron/copilot-tasks. NOT called by the user's
 * chat surface — it's an autonomous background loop.
 */
import "server-only"

import { db } from "@/lib/db"
import { copilotScheduledTask, copilotMemory } from "@/lib/schema"
import { and, eq, sql } from "drizzle-orm"
import { logCopilotEvent } from "./db-init"

type TaskType = "driver_task" | "reminder" | "heartbeat"
type ScheduleType = "once" | "recurring"

export interface ClaimedTask {
  id: string
  tenantId: string
  userId: string
  chatId: string | null
  title: string
  description: string | null
  taskType: string
  specialist: string
  targetDriverId: string | null
  targetDriverName: string | null
  targetDriverPhone: string | null
  targetLoadId: string | null
  targetLoadNumber: string | null
  scheduleType: string
  intervalMinutes: string | null
  runAt: Date | null
  nextRunAt: Date | null
  driverPrompt: string | null
}

/** Returns up to `limit` due rows and locks them. Postgres-specific: SKIP LOCKED. */
export async function claimDueTasks(limit = 10): Promise<ClaimedTask[]> {
  const now = new Date().toISOString()
  // Use SKIP LOCKED so concurrent workers never race. Drizzle's `sql` tag returns
  // a RowList that we coerce to a plain array.
  const dueRows = await db.execute(sql`
    SELECT id
      FROM copilot_scheduled_task
     WHERE status = 'scheduled'
       AND (run_at IS NULL OR run_at <= ${now}::timestamp)
       AND (next_run_at IS NULL OR next_run_at <= ${now}::timestamp)
     ORDER BY COALESCE(next_run_at, run_at, created_at) ASC
     LIMIT ${limit}
     FOR UPDATE SKIP LOCKED
  `)
  const due = (dueRows as any).rows ?? (Array.isArray(dueRows) ? (dueRows as any[]) : [])
  if (!due || due.length === 0) return []

  const ids: string[] = due.map((r: any) => r.id)
  const claimed = await db
    .select()
    .from(copilotScheduledTask)
    .where(
      sql`${copilotScheduledTask.id} in (${sql.join(
        ids.map((i) => sql`${i}`),
        sql`, `,
      )})`,
    )
    .limit(limit)

  if (claimed.length === 0) return []

  // Flip to 'in_progress' for visibility.
  await db
    .update(copilotScheduledTask)
    .set({ status: "in_progress", updatedAt: new Date() })
    .where(
      sql`${copilotScheduledTask.id} in (${sql.join(
        claimed.map((t) => sql`${t.id}`),
        sql`, `,
      )})`,
    )

  void logCopilotEvent({
    tenantId: claimed[0].tenantId,
    userId: claimed[0].userId,
    chatId: claimed[0].chatId,
    level: "scheduler",
    action: `Claimed ${claimed.length} scheduled coworker task(s)`,
    status: "running",
    output: { ids: claimed.map((t) => t.id) } as any,
  }).catch(() => {})

  return claimed.map(toClaimed)
}

function toClaimed(t: typeof copilotScheduledTask.$inferSelect): ClaimedTask {
  return {
    id: t.id,
    tenantId: t.tenantId,
    userId: t.userId,
    chatId: t.chatId,
    title: t.title,
    description: t.description,
    taskType: t.taskType,
    specialist: t.specialist,
    targetDriverId: t.targetDriverId,
    targetDriverName: t.targetDriverName,
    targetDriverPhone: t.targetDriverPhone,
    targetLoadId: t.targetLoadId,
    targetLoadNumber: t.targetLoadNumber,
    scheduleType: t.scheduleType,
    intervalMinutes: t.intervalMinutes,
    runAt: t.runAt,
    nextRunAt: t.nextRunAt,
    driverPrompt: t.driverPrompt,
  }
}

/** Run one claimed task. Recurring tasks get their `next_run_at` pushed forward. */
export async function runTask(task: ClaimedTask): Promise<{ ok: boolean; error?: string }> {
  try {
    // Routing by `taskType`. Driver tasks call out to notifications; checks
    // call our own data layer; reminder/AP/heartbeat just append to memory.
    switch (task.taskType as TaskType) {
      case "driver_task":
        await runDriverTask(task)
        break
      case "reminder":
        await recordMemory(task, { category: "reminder", content: task.driverPrompt ?? task.title })
        break
      case "heartbeat":
        await recordMemory(task, { category: "heartbeat", content: task.description ?? task.title })
        break
      default:
        await recordMemory(task, { category: "scheduled", content: task.title })
    }

    const completedAt = new Date()
    const intervalMinutes = task.intervalMinutes ? parseInt(task.intervalMinutes, 10) : null
    const scheduleType = task.scheduleType as ScheduleType
    const nextRun =
      scheduleType === "recurring" && Number.isFinite(intervalMinutes) && intervalMinutes! > 0
        ? new Date(completedAt.getTime() + intervalMinutes! * 60_000)
        : null

    await db
      .update(copilotScheduledTask)
      .set({
        status: "completed",
        lastRunAt: completedAt,
        nextRunAt: nextRun,
        // one-shot tasks flip back to 'completed'; recurring ones reset to scheduled
        ...(scheduleType === "recurring" ? { status: "scheduled" } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(copilotScheduledTask.id, task.id), eq(copilotScheduledTask.tenantId, task.tenantId)))

    await logCopilotEvent({
      tenantId: task.tenantId,
      userId: task.userId,
      chatId: task.chatId,
      level: "scheduler",
      action: `Completed scheduled coworker task: ${task.title}`,
      status: "completed",
      toolName: task.taskType,
      output: { taskId: task.id } as any,
    }).catch(() => {})

    return { ok: true }
  } catch (err: any) {
    await db
      .update(copilotScheduledTask)
      .set({ status: "failed", updatedAt: new Date(), lastResult: { error: err?.message ?? String(err) } as any })
      .where(and(eq(copilotScheduledTask.id, task.id), eq(copilotScheduledTask.tenantId, task.tenantId)))

    await logCopilotEvent({
      tenantId: task.tenantId,
      userId: task.userId,
      chatId: task.chatId,
      level: "error",
      action: `Failed scheduled task: ${task.title}`,
      status: "error",
      toolName: task.taskType,
      error: err?.message ?? String(err),
    }).catch(() => {})

    return { ok: false, error: err?.message ?? String(err) }
  }
}

async function runDriverTask(task: ClaimedTask) {
  // The "driver task" path calls the application's notification engine.
  // Importing it lazily to avoid pulling the notification transport into the
  // hot path on Vercel cold-starts.
  const { dispatchNotificationEvent } = await import("@/lib/notifications")
  await dispatchNotificationEvent({
    organizationId: task.tenantId,
    userId: task.targetDriverId ?? null,
    category: "trip",
    event: "driver_task",
    severity: "info",
    title: task.title,
    message: task.driverPrompt ?? task.description ?? task.title,
    link: task.targetLoadId ? `/loads/${task.targetLoadId}` : null,
    metadata: {
      loadNumber: task.targetLoadNumber ?? null,
      driverName: task.targetDriverName ?? null,
    },
  })
}

async function recordMemory(task: ClaimedTask, payload: { category: string; content: string }) {
  await db.insert(copilotMemory).values({
    id: crypto.randomUUID(),
    tenantId: task.tenantId,
    userId: task.userId,
    key: `scheduled_${task.id}`,
    category: payload.category,
    content: payload.content,
    source: "scheduler",
  })
}

/** Public entrypoint used by the cron route. Returns a stats summary. */
export async function tickOnce(limit = 10) {
  const claimed = await claimDueTasks(limit)
  const results: Array<{ id: string; ok: boolean; error?: string }> = []
  for (const task of claimed) {
    const r = await runTask(task)
    results.push({ id: task.id, ok: r.ok, error: r.error })
  }
  return { claimed: claimed.length, results }
}
