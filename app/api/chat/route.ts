import { NextRequest, NextResponse } from "next/server"
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
  type UIMessage,
} from "ai"
import { getModel } from "@/lib/ai-providers"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { ALL_TMS_TOOLS, type ToolContext } from "@/lib/copilot/tools"
import { persistCopilotMessages } from "@/lib/copilot/message-store"

/**
 * Long-running agent: Pro/Enterprise on Bun supports up to 1800s per function call.
 * Anything longer must move to Vercel Workflows / `WorkflowAgent` (see `lib/copilot/scheduled-runner.ts`).
 */
export const maxDuration = 1800
export const dynamic = "force-dynamic"

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
    - Consult human dispatcher when decisions are required ('askDispatcher')
11. Downloadable Documents (think before calling — these create S3 artefacts):
    - Generate a PDF / CSV / Markdown / HTML / text from inline content ('generateDocument')
    - Export load rows in a date range as CSV ('exportLoadsCsv')
    - Each tool returns a 'publicUrl' AND a short-lived 'downloadUrl' (5 minutes) the user can click to download. Use the Queue AI Element to surface queued document generation jobs and render the 'downloadUrl' as a link in the assistant response.${memorySnippet}${customInstructionsSnippet}

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

    const maxStepsRaw = parseInt(settings.maxSteps || "12", 10)
    const maxSteps = Number.isFinite(maxStepsRaw) && maxStepsRaw > 0 ? maxStepsRaw : 12

    const streamConfig: any = {
      model: resolvedModel,
      system: systemPrompt,
      messages: modelMessages,
      // v5+/v7 official replacement for the deprecated `maxSteps` option.
      stopWhen: stepCountIs(maxSteps),
      tools: toolsRecord,
      onError: ({ error }: { error: unknown }) => {
        console.error("[COPILOT-CHAT] streamText error:", error)
        logCopilotEvent({
          tenantId,
          userId: session.user.id,
          chatId: chatId || null,
          level: "error",
          action: "streamText error",
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        }).catch(() => {})
      },
      onFinish: async ({ usage, finishReason, response }: any) => {
        const messages = response?.messages ?? []
        if (chatId && Array.isArray(messages) && messages.length > 0) {
          await persistCopilotMessages({
            tenantId,
            userId: session.user.id,
            chatId,
            newMessages: messages,
          }).catch((err) => {
            console.error("[COPILOT-CHAT] persist failed:", err)
          })
        }
        if (usage) {
          await logCopilotEvent({
            tenantId,
            userId: session.user.id,
            chatId: chatId || null,
            level: "info",
            action: "streamText finished",
            status: "completed",
            durationMs: usage.totalDurationMs ?? null,
            output: usage as any,
          }).catch(() => {})
        }
      },
      // Pull reasoning/sources out of the wire to feed <Reasoning> and <Sources>
      // AI Elements and the AI SDK docs make these opt-in flags on the stream helper.
      experimental_providerOptions: {
        anthropic: { thinking: { type: "enabled", budgetTokens: 8000 } },
        openai: { reasoningEffort: "medium" },
      },
    }

    if (!isAllowAll && Object.keys(toolApprovalRecord).length > 0) {
      streamConfig.toolApproval = toolApprovalRecord
    }

    const result = streamText(streamConfig)

    // sendReasoning + sendSources are required for the Reasoning and Sources AI Elements
    // to receive their corresponding UI stream parts. See elements.ai-sdk.dev.
    return result.toUIMessageStreamResponse({
      sendReasoning: true,
      sendSources: true,
      onError: (error) => {
        console.error("[COPILOT-CHAT] UI stream error:", error)
        return "The agent encountered an error while generating a response."
      },
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
