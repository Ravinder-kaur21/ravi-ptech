import { NextRequest, NextResponse } from "next/server"
import { streamText, convertToModelMessages, tool } from "ai"
import { getModel } from "@/lib/ai-providers"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { ALL_TMS_TOOLS, type ToolContext } from "@/lib/copilot/tools"

export const maxDuration = 60

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
    const { messages, model, provider, chatId } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 })
    }

    const {
      getOrCreateCopilotSettings,
      getActiveCopilotMemories,
      logCopilotEvent,
    } = await import("@/lib/copilot/db-init")

    const settings = await getOrCreateCopilotSettings(tenantId, session.user.id)
    const isAllowAll = Boolean(body.allowAll ?? settings.allowAll)
    const activeMemories = await getActiveCopilotMemories(tenantId, session.user.id)

    const perms = await getEffectivePermissions(session.user.id, tenantId)

    const targetProvider = provider || (process.env.OPENROUTER_API_KEY ? "openrouter" : "nim")
    const targetModel =
      model || (targetProvider === "openrouter" ? "openai/gpt-4o-mini" : "meta/llama-3.3-70b-instruct")

    const resolvedModel = getModel(targetProvider, targetModel)

    // Official AI SDK v5: Convert UIMessage[] (from useChat) to ModelMessage[] (for streamText)
    const modelMessages = await convertToModelMessages(messages)

    const memorySnippet =
      activeMemories.length > 0
        ? `\nENTERPRISE MEMORY & SAVED CONTEXT:\n${activeMemories.map((m) => `- [${m.key}] (${m.category}): ${m.content}`).join("\n")}`
        : ""

    const customInstructionsSnippet = settings.customInstructions
      ? `\nUSER CUSTOM PREFERENCES:\n${settings.customInstructions}`
      : ""

    const systemPrompt = `You are Muvx Copilot, the autonomous enterprise transportation intelligence coworker integrated into Muvx TMS.
User: ${session.user.name || session.user.email} (${session.user.role || "Member"})
Workspace: ${tenantId}
Autonomous Mode (Allow All): ${isAllowAll ? "ENABLED (execute approved transactions without halting)" : "DISABLED (prompt user for write confirmation)"}
User Permissions:
- Can create/edit loads: ${perms.has("loads.create")}
- Can dispatch trips: ${perms.has("trips.create")}
- Can manage fleet & drivers: ${perms.has("fleet.trucks.create")}
- Can manage invoices & billing: ${perms.has("invoices.view_all")}
- Can approve AP expenses: ${perms.has("expenses.view_all")}
- Can view compliance: ${perms.has("safety.module")}

FULL OPERATIONAL & COWORKER AGENCY:
You have direct read, search, and transactional tools across EVERY TMS domain:
1. Loads:
   - Book new loads ('bookLoad')
   - Search freight loads ('queryLoads')
   - Update load status, rate, or lane dates ('updateLoad')
   - Mark signed PODs, BOL received, or star loads ('updateLoadDocs')
2. Trips & Dispatch:
   - Assign driver & tractor to dispatch ('dispatchTrip')
   - Update trip status in_transit/completed, log odometer miles ('updateTripStatus')
3. Fleet & Compliance:
   - Inspect driver duty, tractors, and CDL alerts ('getFleetStatus')
   - Onboard new commercial drivers ('createDriver')
   - Update driver CDL renewal, phone, or duty status ('updateDriver')
   - Register tractor units ('createTruck') and update maintenance/odometer ('updateTruck')
   - Register dry vans, reefers, and flatbed trailers ('createTrailer')
4. Coworker Communications & Scheduling:
   - Assign operational tasks to drivers with SMS/push notification ('assignDriverTask')
   - Ask drivers operational questions regarding location/ETA ('askDriverQuestion')
   - Schedule future automated coworker checkups ('scheduleCoworkerTask')
   - List scheduled tasks ('listScheduledTasks')
   - Persist enterprise facts and driver preferences ('saveCopilotMemory')
   - Recall memories ('recallCopilotMemory')
5. Customers & Shippers:
   - Search customers, credit terms, and contact info ('queryCustomers')
   - Add new shipper/broker customers with Net 30/15 terms ('createCustomer')
6. Partner Carriers:
   - Search partner carrier directory with MC# and insurance ('queryCarriers')
   - Onboard new motor carriers ('createCarrier')
7. Invoicing & Accounting:
   - Search customer AR invoices and overdue aging balances ('queryInvoices')
   - Generate official customer invoice from delivered loads ('createInvoice')
   - Email customer invoice with Resend payment link ('sendInvoiceEmail')
   - Record customer payment for invoices ('markInvoicePaid')
   - Query delivered loads missing signed PODs for factoring ('getMissingPods')
8. Expenses & Settlements:
   - Review pending AP trip expenses ('reviewPendingExpenses')
   - Approve driver expense reimbursement ('approveExpense')
   - Log new trip expense: fuel, toll, lumper, maintenance ('logTripExpense')
9. Team Administration:
   - List workspace members ('listWorkspaceMembers')
   - Invite, promote, or remove members ('inviteWorkspaceMember', 'updateMemberRole', 'removeMember')
10. Multi-Step Execution & Sub-Agents:
    - Formulate multi-step plans ('createExecutionPlan')
    - Delegate subtasks to specialized coworker personas ('delegateSubtask')
    - Consult human dispatcher when decisions are required ('askDispatcher')${memorySnippet}${customInstructionsSnippet}

PROTOCOL:
Be concise, freight-fluent, proactive, and accurate. When performing write operations in autonomous mode, state clearly what actions were executed.`

    const toolCtx: ToolContext = {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      tenantId,
      perms,
    }

    const toolsRecord: Record<string, any> = {}
    const toolApprovalRecord: Record<string, any> = {}

    for (const t of ALL_TMS_TOOLS) {
      toolsRecord[t.name] = tool({
        description: t.description,
        inputSchema: t.inputSchema,
        execute: async (params) => {
          const start = Date.now()
          try {
            const out = await t.execute(params, toolCtx)
            const durationMs = `${Date.now() - start}ms`
            logCopilotEvent({
              tenantId,
              userId: session.user.id,
              chatId: chatId || null,
              level: "info",
              action: `Executed ${t.name}`,
              toolName: t.name,
              status: "completed",
              durationMs,
              input: params as any,
              output: out as any,
            }).catch(() => {})
            return out
          } catch (err: any) {
            const durationMs = `${Date.now() - start}ms`
            logCopilotEvent({
              tenantId,
              userId: session.user.id,
              chatId: chatId || null,
              level: "error",
              action: `Failed ${t.name}`,
              toolName: t.name,
              status: "error",
              durationMs,
              input: params as any,
              error: err?.message || String(err),
            }).catch(() => {})
            throw err
          }
        },
      })

      // When allowAll is true, bypass human confirmation so the agent executes autonomously
      if (t.requiresApproval && !isAllowAll) {
        toolApprovalRecord[t.name] = {
          type: "user-approval",
          reason:
            t.approvalReason ||
            `Authorizing ${t.name} will execute an official operational transaction.`,
        }
      }
    }

    const streamConfig: any = {
      model: resolvedModel,
      system: systemPrompt,
      messages: modelMessages,
      stopWhen: ({ steps }: any) => steps.length >= parseInt(settings.maxSteps || "12", 10),
      tools: toolsRecord,
    }

    if (!isAllowAll && Object.keys(toolApprovalRecord).length > 0) {
      streamConfig.toolApproval = toolApprovalRecord
    }

    const result = streamText(streamConfig)

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
