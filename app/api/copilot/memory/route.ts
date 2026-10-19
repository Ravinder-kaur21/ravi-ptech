import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import { db } from "@/lib/db"
import { copilotMemory } from "@/lib/schema"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "crypto"
import {
  ensureCopilotTables,
  getActiveCopilotMemories,
} from "@/lib/copilot/db-init"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json({ error: "No active workspace" }, { status: 400 })
    }

    const memories = await getActiveCopilotMemories(tenantId, session.user.id)
    return NextResponse.json({ memories })
  } catch (error: any) {
    console.error("[COPILOT-MEMORY-GET] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to fetch copilot memory" },
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
    const { key, content, category } = body

    if (!key || !content) {
      return NextResponse.json(
        { error: "key and content are required" },
        { status: 400 }
      )
    }

    const [existing] = await db
      .select()
      .from(copilotMemory)
      .where(
        and(
          eq(copilotMemory.tenantId, tenantId),
          eq(copilotMemory.key, key)
        )
      )
      .limit(1)

    if (existing) {
      const [updated] = await db
        .update(copilotMemory)
        .set({
          content,
          category: category || existing.category,
          updatedAt: new Date(),
        })
        .where(eq(copilotMemory.id, existing.id))
        .returning()

      return NextResponse.json({ success: true, memory: updated })
    }

    const memoryId = `mem_${randomUUID()}`
    const [created] = await db
      .insert(copilotMemory)
      .values({
        id: memoryId,
        tenantId,
        userId: session.user.id,
        key,
        content,
        category: category || "fact",
        source: "user",
      })
      .returning()

    return NextResponse.json({ success: true, memory: created })
  } catch (error: any) {
    console.error("[COPILOT-MEMORY-POST] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to save memory item" },
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
    const id = url.searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    await db
      .delete(copilotMemory)
      .where(
        and(
          eq(copilotMemory.id, id),
          eq(copilotMemory.tenantId, tenantId)
        )
      )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[COPILOT-MEMORY-DELETE] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to delete memory item" },
      { status: 500 }
    )
  }
}
