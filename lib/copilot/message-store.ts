/**
 * Persistent message store for the Muvx Copilot.
 *
 * Replaces the legacy "rewrite entire messages[] JSONB every 1.2s" pattern with
 * proper per-message rows in `copilot_message`, one row per assistant/user turn.
 * Used by:
 *   - /api/copilot/chats GET   → load full thread
 *   - /api/copilot/chats DELETE → nuke messages on archive/reset
 *   - /api/chat onFinish       → persist assistant response after each turn
 *   - /api/cron/copilot-tasks  → append scheduled-task outputs to the originating chat
 */
import "server-only"

import { db } from "@/lib/db"
import { copilotChat, copilotMessage } from "@/lib/schema"
import { eq, and, asc, inArray } from "drizzle-orm"
import { randomUUID } from "crypto"

/** Append the last assistant (or tool-bearing) messages to a thread. */
export async function persistCopilotMessages(params: {
  tenantId: string
  userId: string
  chatId: string
  newMessages: Array<{ id?: string; role: "user" | "assistant" | "system"; parts?: unknown; content?: unknown }>
}) {
  const { tenantId, userId, chatId, newMessages } = params
  if (newMessages.length === 0) return

  const rows = newMessages.map((m) => ({
    id: m.id || `msg_${randomUUID()}`,
    chatId,
    tenantId,
    userId,
    role: m.role,
    parts: (Array.isArray(m.parts) ? m.parts : []) as any,
  }))

  await db.insert(copilotMessage).values(rows as any).onConflictDoNothing()

  // Bump updatedAt on the chat row so the sidebar order works.
  await db
    .update(copilotChat)
    .set({ updatedAt: new Date() })
    .where(and(eq(copilotChat.id, chatId), eq(copilotChat.tenantId, tenantId)))
}

/** Load the full message thread for a chat. */
export async function loadChatMessages(chatId: string, tenantId: string) {
  return db
    .select()
    .from(copilotMessage)
    .where(and(eq(copilotMessage.chatId, chatId), eq(copilotMessage.tenantId, tenantId)))
    .orderBy(asc(copilotMessage.createdAt))
}

/** Wipe all messages for a chat (used by the "Reset conversation" path). */
export async function purgeChatMessages(chatId: string, tenantId: string) {
  await db
    .delete(copilotMessage)
    .where(and(eq(copilotMessage.chatId, chatId), eq(copilotMessage.tenantId, tenantId)))
}

/** Bulk delete for archive/reset paths. */
export async function purgeMessagesForChats(chatIds: string[], tenantId: string) {
  if (chatIds.length === 0) return
  await db
    .delete(copilotMessage)
    .where(
      and(
        eq(copilotMessage.tenantId, tenantId),
        inArray(copilotMessage.chatId, chatIds),
      ),
    )
}
