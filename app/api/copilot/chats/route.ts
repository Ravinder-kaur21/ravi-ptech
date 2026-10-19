import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import { db } from "@/lib/db"
import { copilotChat, copilotMessage } from "@/lib/schema"
import { eq, and, desc } from "drizzle-orm"
import { randomUUID } from "crypto"
import { ensureCopilotTables } from "@/lib/copilot/db-init"

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
            eq(copilotChat.userId, session.user.id)
          )
        )
        .limit(1)

      if (found) {
        return NextResponse.json({ chat: found, messages: found.messages || [] })
      }
    }

    // Otherwise, load latest active chat
    const [latestChat] = await db
      .select()
      .from(copilotChat)
      .where(
        and(
          eq(copilotChat.tenantId, tenantId),
          eq(copilotChat.userId, session.user.id),
          eq(copilotChat.archived, false)
        )
      )
      .orderBy(desc(copilotChat.updatedAt))
      .limit(1)

    if (latestChat) {
      return NextResponse.json({
        chat: latestChat,
        messages: latestChat.messages || [],
      })
    }

    // No existing chat found: create initial fresh conversation
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
    return NextResponse.json(
      { error: error?.message || "Failed to load copilot chat" },
      { status: 500 }
    )
  }
}

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

    await ensureCopilotTables()

    const body = await req.json().catch(() => ({}))
    const { chatId, messages, title } = body

    if (!chatId) {
      return NextResponse.json({ error: "chatId is required" }, { status: 400 })
    }

    const [existing] = await db
      .select()
      .from(copilotChat)
      .where(
        and(
          eq(copilotChat.id, chatId),
          eq(copilotChat.tenantId, tenantId),
          eq(copilotChat.userId, session.user.id)
        )
      )
      .limit(1)

    const updatePayload: Record<string, any> = {
      messages: messages || [],
      updatedAt: new Date(),
    }
    if (title) updatePayload.title = title

    if (existing) {
      const [updated] = await db
        .update(copilotChat)
        .set(updatePayload)
        .where(eq(copilotChat.id, chatId))
        .returning()

      return NextResponse.json({ success: true, chat: updated })
    } else {
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

      return NextResponse.json({ success: true, chat: created })
    }
  } catch (error: any) {
    console.error("[COPILOT-CHATS-POST] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to save copilot chat" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 })
    }

    await ensureCopilotTables()

    const url = new URL(req.url)
    const chatId = url.searchParams.get("id")

    if (chatId) {
      await db
        .delete(copilotChat)
        .where(
          and(
            eq(copilotChat.id, chatId),
            eq(copilotChat.tenantId, tenantId),
            eq(copilotChat.userId, session.user.id)
          )
        )
    } else {
      // Archive or clear all chats
      await db
        .update(copilotChat)
        .set({ archived: true, updatedAt: new Date() })
        .where(
          and(
            eq(copilotChat.tenantId, tenantId),
            eq(copilotChat.userId, session.user.id)
          )
        )
    }

    // Create fresh empty chat
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
    return NextResponse.json(
      { error: error?.message || "Failed to reset copilot chat" },
      { status: 500 }
    )
  }
}
