import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/dal"
import {
  getOrCreateCopilotSettings,
  updateCopilotSettings,
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

    const settings = await getOrCreateCopilotSettings(tenantId, session.user.id)
    return NextResponse.json({ settings })
  } catch (error: any) {
    console.error("[COPILOT-SETTINGS-GET] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to load copilot settings" },
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

    const body = await req.json().catch(() => ({}))
    const updated = await updateCopilotSettings(tenantId, session.user.id, {
      coat: body.coat,
      customPalette: body.customPalette,
      autoCycleCoat: body.autoCycleCoat,
      defaultSpecialist: body.defaultSpecialist,
      allowAll: body.allowAll,
      approvalThreshold: body.approvalThreshold,
      memoryEnabled: body.memoryEnabled,
      customInstructions: body.customInstructions,
      proactiveHeartbeat: body.proactiveHeartbeat,
      soundEnabled: body.soundEnabled,
      showChainOfThought: body.showChainOfThought,
      maxSteps: body.maxSteps,
      defaultModel: body.defaultModel,
      defaultProvider: body.defaultProvider,
      webSearchDefault: body.webSearchDefault,
    })

    return NextResponse.json({ success: true, settings: updated })
  } catch (error: any) {
    console.error("[COPILOT-SETTINGS-POST] Error:", error)
    return NextResponse.json(
      { error: error?.message || "Failed to update copilot settings" },
      { status: 500 }
    )
  }
}
