import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import { db } from "@/lib/db"
import { copilotChat } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"
import { randomUUID } from "crypto"
import { ensureCopilotTables } from "@/lib/copilot/db-init"
import { loadChatMessages, persistCopilotMessages, purgeChatMessages, purgeMessagesForChats } from "@/lib/copilot/message-store"

/**
 * Persistent chat thread management.
 *
 * Migrated from the legacy "rewrite entire messages[] JSONB blob every 1.2s"
 * pattern to proper per-message rows in `copilot_message`. Backwards-compatible:
 * `copilot_chat.messages` jsonb is still there for legacy clients but the
 * canonical source is now the per-row messages table.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 400 })

    await ensureCopilotTables()

    const url = new URL(req.url)
    const chatId = url.searchParams.get("id")

    if (chatId) {
      const [found] = await db
        .select()
        .from(copilotChat)
        .where(
          and(
            eq(copilotChat.id, chatId),
            eq(copilotChat.tenantId, tenantId),
            eq(copilotChat.userId, session.user.id),
          ),
        )
        .limit(1)

      if (found) {
        const rows = await loadChatMessages(chatId, tenantId)
        // Coerce to UIMessage[] by joining parts and metadata.
        const messages = rows.map((r) => ({
          id: r.id,
          role: r.role,
          parts: r.parts ?? [],
          metadata: r.metadata ?? undefined,
          createdAt: r.createdAt.toISOString(),
        }))
        return NextResponse.json({ chat: found, messages })
      }
    }

    // Otherwise load latest active chat.
    const [latestChat] = await db
      .select()
      .from(copilotChat)
      .where(
        and(
          eq(copilotChat.tenantId, tenantId),
          eq(copilotChat.userId, session.user.id),
          eq(copilotChat.archived, false),
        ),
      )
      .orderBy(desc(copilotChat.updatedAt))
      .limit(1)

    if (latestChat) {
      const rows = await loadChatMessages(latestChat.id, tenantId)
      const messages = rows.map((r) => ({
        id: r.id,
        role: r.role,
        parts: r.parts ?? [],
        metadata: r.metadata ?? undefined,
        createdAt: r.createdAt.toISOString(),
      }))
      return NextResponse.json({ chat: latestChat, messages })
    }

    const newChatId = `chat_${randomUUID()}`
    const [newChat] = await db
      .insert(copilotChat)
      .values({
        id: newChatId,
        tenantId,
        userId: session.user.id,
        title: "Freight Operations Session",
        specialist: "main",
        messages: [],
      })
      .returning()

    return NextResponse.json({ chat: newChat, messages: [] })
  } catch (error: any) {
    console.error("[COPILOT-CHATS-GET] Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to load chat" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 400 })

    await ensureCopilotTables()

    const body = await req.json().catch(() => ({}))
    const { chatId, messages, title } = body as {
      chatId?: string
      messages?: Array<{ id?: string; role: "user" | "assistant" | "system"; parts?: unknown; metadata?: unknown }>
      title?: string
    }

    if (!chatId) return NextResponse.json({ error: "chatId is required" }, { status: 400 })

    const [existing] = await db
      .select()
      .from(copilotChat)
      .where(
        and(
          eq(copilotChat.id, chatId),
          eq(copilotChat.tenantId, tenantId),
          eq(copilotChat.userId, session.user.id),
        ),
      )
      .limit(1)

    if (existing) {
      // Append-only write to copilot_message — append messages we have not seen.
      // The client sends the full array on every persist; we dedupe by `id` via `onConflictDoNothing`.
      if (Array.isArray(messages) && messages.length > 0) {
        await persistCopilotMessages({
          tenantId,
          userId: session.user.id,
          chatId,
          newMessages: messages,
        })
      }
      const updatePayload: Record<string, any> = {
        updatedAt: new Date(),
      }
      if (title) updatePayload.title = title
      // Backwards-compat mirror — keep the JSONB column for any legacy reader.
      if (Array.isArray(messages)) updatePayload.messages = messages
      const [updated] = await db
        .update(copilotChat)
        .set(updatePayload)
        .where(eq(copilotChat.id, chatId))
        .returning()
      return NextResponse.json({ success: true, chat: updated })
    }

    const [created] = await db
      .insert(copilotChat)
      .values({
        id: chatId,
        tenantId,
        userId: session.user.id,
        title: title || "Freight Operations Session",
        specialist: "main",
        messages: messages || [],
      })
      .returning()

    if (Array.isArray(messages) && messages.length > 0) {
      await persistCopilotMessages({
        tenantId,
        userId: session.user.id,
        chatId,
        newMessages: messages,
      })
    }

    return NextResponse.json({ success: true, chat: created })
  } catch (error: any) {
    console.error("[COPILOT-CHATS-POST] Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to save chat" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const tenantId = session.session.activeOrganizationId
    if (!tenantId) return NextResponse.json({ error: "No active workspace" }, { status: 400 })

    await ensureCopilotTables()

    const url = new URL(req.url)
    const chatId = url.searchParams.get("id")

    let archivedChatIds: string[] = []
    if (chatId) {
      // Single-thread wipe — also purge the per-message rows.
      await purgeChatMessages(chatId, tenantId)
      await db
        .delete(copilotChat)
        .where(
          and(
            eq(copilotChat.id, chatId),
            eq(copilotChat.tenantId, tenantId),
            eq(copilotChat.userId, session.user.id),
          ),
        )
    } else {
      // Archive-and-clean: archive all of this user's threads, then nuke the messages.
      const existing = await db
        .select({ id: copilotChat.id })
        .from(copilotChat)
        .where(
          and(
            eq(copilotChat.tenantId, tenantId),
            eq(copilotChat.userId, session.user.id),
          ),
        )
      archivedChatIds = existing.map((r) => r.id)
      if (archivedChatIds.length > 0) {
        await purgeMessagesForChats(archivedChatIds, tenantId)
        await db
          .update(copilotChat)
          .set({ archived: true, updatedAt: new Date() })
          .where(
            and(
              eq(copilotChat.tenantId, tenantId),
              eq(copilotChat.userId, session.user.id),
            ),
          )
      }
    }

    // Create fresh empty chat.
    const newChatId = `chat_${randomUUID()}`
    const [freshChat] = await db
      .insert(copilotChat)
      .values({
        id: newChatId,
        tenantId,
        userId: session.user.id,
        title: "Freight Operations Session",
        specialist: "main",
        messages: [],
      })
      .returning()

    return NextResponse.json({ success: true, newChat: freshChat })
  } catch (error: any) {
    console.error("[COPILOT-CHATS-DELETE] Error:", error)
    return NextResponse.json({ error: error?.message || "Failed to reset chat" }, { status: 500 })
  }
}
