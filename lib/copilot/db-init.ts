import { db } from "@/lib/db"
import { sql, eq, and, desc } from "drizzle-orm"
import { randomUUID } from "crypto"
import {
  copilotSetting,
  copilotChat,
  copilotMessage,
  copilotMemory,
  copilotLog,
  copilotScheduledTask,
} from "@/lib/schema"

let initialized = false
let initPromise: Promise<void> | null = null

/**
 * Ensures Copilot persistent tables exist in PostgreSQL via idempotent DDL.
 */
export async function ensureCopilotTables(): Promise<void> {
  if (initialized) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "copilot_chat" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
          "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
          "title" text DEFAULT 'New Conversation' NOT NULL,
          "specialist" varchar(50) DEFAULT 'main' NOT NULL,
          "model" varchar(150),
          "provider" varchar(50),
          "pinned" boolean DEFAULT false NOT NULL,
          "archived" boolean DEFAULT false NOT NULL,
          "messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
          "metadata" jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE INDEX IF NOT EXISTS "copilot_chat_tenant_user_idx"
          ON "copilot_chat" ("tenant_id", "user_id", "updated_at");

        CREATE TABLE IF NOT EXISTS "copilot_message" (
          "id" text PRIMARY KEY NOT NULL,
          "chat_id" text NOT NULL REFERENCES "public"."copilot_chat"("id") ON DELETE cascade,
          "tenant_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
          "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
          "role" varchar(30) NOT NULL,
          "parts" jsonb DEFAULT '[]'::jsonb NOT NULL,
          "metadata" jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE INDEX IF NOT EXISTS "copilot_message_chat_idx"
          ON "copilot_message" ("chat_id", "created_at");

        CREATE TABLE IF NOT EXISTS "copilot_setting" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
          "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
          "coat" varchar(50) DEFAULT 'ink' NOT NULL,
          "custom_palette" jsonb,
          "auto_cycle_coat" boolean DEFAULT false NOT NULL,
          "default_specialist" varchar(50) DEFAULT 'main' NOT NULL,
          "allow_all" boolean DEFAULT false NOT NULL,
          "approval_threshold" varchar(50) DEFAULT '0',
          "memory_enabled" boolean DEFAULT true NOT NULL,
          "custom_instructions" text,
          "proactive_heartbeat" boolean DEFAULT true NOT NULL,
          "sound_enabled" boolean DEFAULT true NOT NULL,
          "show_chain_of_thought" boolean DEFAULT true NOT NULL,
          "max_steps" varchar(10) DEFAULT '12' NOT NULL,
          "default_model" varchar(150) DEFAULT 'gemini-2.5-flash',
          "default_provider" varchar(50) DEFAULT 'openrouter',
          "web_search_default" boolean DEFAULT false NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE INDEX IF NOT EXISTS "copilot_setting_tenant_user_idx"
          ON "copilot_setting" ("tenant_id", "user_id");

        CREATE TABLE IF NOT EXISTS "copilot_memory" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
          "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
          "key" varchar(255) NOT NULL,
          "content" text NOT NULL,
          "category" varchar(50) DEFAULT 'fact' NOT NULL,
          "source" varchar(50) DEFAULT 'user' NOT NULL,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE INDEX IF NOT EXISTS "copilot_memory_tenant_user_idx"
          ON "copilot_memory" ("tenant_id", "user_id");

        CREATE TABLE IF NOT EXISTS "copilot_log" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
          "user_id" text REFERENCES "public"."user"("id") ON DELETE set null,
          "chat_id" text,
          "level" varchar(30) DEFAULT 'info' NOT NULL,
          "action" varchar(150) NOT NULL,
          "tool_name" varchar(100),
          "specialist" varchar(50) DEFAULT 'main',
          "status" varchar(50) DEFAULT 'completed' NOT NULL,
          "duration_ms" varchar(30),
          "input" jsonb,
          "output" jsonb,
          "error" text,
          "created_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE INDEX IF NOT EXISTS "copilot_log_tenant_created_idx"
          ON "copilot_log" ("tenant_id", "created_at");

        CREATE INDEX IF NOT EXISTS "copilot_log_chat_idx"
          ON "copilot_log" ("chat_id");

        CREATE TABLE IF NOT EXISTS "copilot_scheduled_task" (
          "id" text PRIMARY KEY NOT NULL,
          "tenant_id" text NOT NULL REFERENCES "public"."organization"("id") ON DELETE cascade,
          "user_id" text NOT NULL REFERENCES "public"."user"("id") ON DELETE cascade,
          "chat_id" text,
          "title" varchar(255) NOT NULL,
          "description" text,
          "task_type" varchar(50) DEFAULT 'driver_task' NOT NULL,
          "specialist" varchar(50) DEFAULT 'dispatcher' NOT NULL,
          "target_driver_id" text,
          "target_driver_name" varchar(255),
          "target_driver_phone" varchar(50),
          "target_load_id" text,
          "target_load_number" varchar(100),
          "schedule_type" varchar(30) DEFAULT 'once' NOT NULL,
          "interval_minutes" varchar(20),
          "run_at" timestamp,
          "next_run_at" timestamp,
          "last_run_at" timestamp,
          "status" varchar(50) DEFAULT 'scheduled' NOT NULL,
          "priority" varchar(30) DEFAULT 'normal' NOT NULL,
          "driver_prompt" text,
          "driver_response" text,
          "conversation_log" jsonb DEFAULT '[]'::jsonb,
          "last_result" jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );

        CREATE INDEX IF NOT EXISTS "copilot_task_tenant_status_idx"
          ON "copilot_scheduled_task" ("tenant_id", "status", "next_run_at");
      `)
      initialized = true
    } catch (err) {
      console.error("[COPILOT-DB] Failed to ensure copilot tables:", err)
      initPromise = null
    }
  })()

  return initPromise
}

export async function getOrCreateCopilotSettings(tenantId: string, userId: string) {
  await ensureCopilotTables()

  const [existing] = await db
    .select()
    .from(copilotSetting)
    .where(and(eq(copilotSetting.tenantId, tenantId), eq(copilotSetting.userId, userId)))
    .limit(1)

  if (existing) return existing

  const id = randomUUID()
  const [created] = await db
    .insert(copilotSetting)
    .values({
      id,
      tenantId,
      userId,
      coat: "ink",
      autoCycleCoat: false,
      defaultSpecialist: "main",
      allowAll: false,
      approvalThreshold: "0",
      memoryEnabled: true,
      customInstructions:
        "Prioritize profitable lanes (> $2.40/mi), verify FMCSA HOS & CDL validity before dispatching, and flag missing PODs over 24 hours after delivery.",
      proactiveHeartbeat: true,
      soundEnabled: true,
      showChainOfThought: true,
      maxSteps: "12",
      defaultModel: "gemini-2.5-flash",
      defaultProvider: "openrouter",
      webSearchDefault: false,
    })
    .returning()

  return created
}

export async function updateCopilotSettings(
  tenantId: string,
  userId: string,
  updates: Partial<typeof copilotSetting.$inferInsert>
) {
  await ensureCopilotTables()
  await getOrCreateCopilotSettings(tenantId, userId)

  const [updated] = await db
    .update(copilotSetting)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(copilotSetting.tenantId, tenantId), eq(copilotSetting.userId, userId)))
    .returning()

  return updated
}

export async function logCopilotEvent(params: {
  tenantId: string
  userId?: string | null
  chatId?: string | null
  level?: "info" | "tool" | "approval" | "subagent" | "scheduler" | "error"
  action: string
  toolName?: string | null
  specialist?: string | null
  status?: "running" | "awaiting_approval" | "approved" | "rejected" | "completed" | "error"
  durationMs?: number | string | null
  input?: Record<string, unknown> | null
  output?: Record<string, unknown> | null
  error?: string | null
}) {
  try {
    await ensureCopilotTables()
    await db.insert(copilotLog).values({
      id: randomUUID(),
      tenantId: params.tenantId,
      userId: params.userId ?? null,
      chatId: params.chatId ?? null,
      level: params.level || "info",
      action: params.action,
      toolName: params.toolName ?? null,
      specialist: params.specialist || "main",
      status: params.status || "completed",
      durationMs:
        params.durationMs !== undefined && params.durationMs !== null
          ? String(params.durationMs)
          : null,
      input: params.input ?? null,
      output: params.output ?? null,
      error: params.error ?? null,
    })
  } catch (err) {
    console.error("[COPILOT-LOG] Failed to record log:", err)
  }
}

export async function getActiveCopilotMemories(tenantId: string, userId: string) {
  await ensureCopilotTables()
  return db
    .select()
    .from(copilotMemory)
    .where(and(eq(copilotMemory.tenantId, tenantId), eq(copilotMemory.userId, userId)))
    .orderBy(desc(copilotMemory.updatedAt))
    .limit(50)
}

export async function getRecentCopilotLogs(tenantId: string, limit = 50) {
  await ensureCopilotTables()
  return db
    .select()
    .from(copilotLog)
    .where(eq(copilotLog.tenantId, tenantId))
    .orderBy(desc(copilotLog.createdAt))
    .limit(limit)
}

export async function getScheduledCoworkerTasks(tenantId: string, status?: string) {
  await ensureCopilotTables()
  if (status && status !== "all") {
    return db
      .select()
      .from(copilotScheduledTask)
      .where(and(eq(copilotScheduledTask.tenantId, tenantId), eq(copilotScheduledTask.status, status)))
      .orderBy(desc(copilotScheduledTask.createdAt))
      .limit(50)
  }
  return db
    .select()
    .from(copilotScheduledTask)
    .where(eq(copilotScheduledTask.tenantId, tenantId))
    .orderBy(desc(copilotScheduledTask.createdAt))
    .limit(50)
}
