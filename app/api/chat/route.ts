import { NextRequest, NextResponse } from "next/server"
import {
  streamText,
  convertToModelMessages,
  tool,
  createUIMessageStream,
  createUIMessageStreamResponse,
  toUIMessageStream,
  isStepCount,
  hasToolCall,
  pruneMessages,
  isToolUIPart,
  type UIMessage,
  type UIMessageStreamWriter,
} from "ai"
import { getModel } from "@/lib/ai-providers"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { ALL_TMS_TOOLS, type ToolContext } from "@/lib/copilot/tools"
import { TurnLogger } from "@/lib/copilot/logging"

// Long-running freight workflows (FMCSA audits, 50+ load matching, invoice
// runs) can exceed a minute. Self-hosted on AWS/ECS, so this is a real ceiling
// rather than a serverless platform cap — keep it aligned with the ALB / ECS
// task timeout so the process isn't killed mid-tool.
export const maxDuration = 300

/** Payload emitted as a `data-cot-step` data part for the client's CoT UI. */
type CotStepData = {
  id: string
  toolName: string
  icon: string
  label: string
  description: string
  status: "active" | "complete" | "pending"
  summary: string[]
}

/** Minimal shape of streamText's `onStepEnd` payload that we consume. */
type StepEndEvent = {
  stepNumber?: number
  toolCalls?: { toolCallId: string; toolName: string }[]
  toolResults?: { toolCallId: string; output?: unknown }[]
  usage?: unknown
}

export async function POST(req: NextRequest) {
  // Hoisted outside the try so the catch block can report failures that happen
  // before the logger is constructed (auth, settings load, model resolution).
  let logger: TurnLogger | null = null
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

    // One correlation id per turn; every log line below carries it.
    const turnId = crypto.randomUUID()

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

    // Structured turn logger — one line per lifecycle event, correlated by
    // turnId. See lib/copilot/logging.ts.
    // Assigning into `logger` keeps it reachable from the catch block; `trace`
    // is the narrowed const that the closures below capture, so TypeScript
    // does not widen it back to `TurnLogger | null` inside callbacks.
    const trace = (logger = new TurnLogger(turnId, {
      tenantId,
      userId: session.user.id,
      chatId: chatId ?? null,
      provider: targetProvider,
      model: targetModel,
      messageCount: messages.length,
      allowAll: isAllowAll,
    }))

    // ── Approval-state sanitiser ──────────────────────────────────────
    // Why this exists: a manual tool-approval turn leaves tool parts in
    // states that carry a tool-call but NO tool-result:
    //
    //   approval-requested — model asked, operator has not answered yet
    //   approval-responded — operator answered; the SDK executes it itself
    //                       on the next generation and emits the result there
    //
    // `convertToModelMessages` validates that every assistant tool-call has a
    // matching tool-result and throws `AI_MissingToolResultsError` otherwise.
    // `ignoreIncompleteToolCalls` does NOT save us: its filter explicitly
    // KEEPS `approval-responded` parts. So when two approvals render at once
    // and the operator answers one, the still-pending sibling leaves a
    // dangling call and the request dies with a 200 and an empty body.
    //
    // Both states are therefore stripped before conversion. The SDK re-asks
    // for anything still unanswered, so nothing is lost.
    const sanitizedMessages = (messages as UIMessage[]).map((m) => ({
      ...m,
      parts: m.parts.filter((p) => {
        if (!isToolUIPart(p)) return true;
        return p.state !== "approval-requested" && p.state !== "approval-responded";
      }),
    }))

    const droppedParts = (messages as UIMessage[]).reduce(
      (n, m) =>
        n +
        m.parts.filter(
          (p) =>
            isToolUIPart(p) &&
            (p.state === "approval-requested" || p.state === "approval-responded"),
        ).length,
      0,
    );

    trace.chunk({
      phase: "sanitize",
      incomingMessages: messages.length,
      droppedApprovalParts: droppedParts,
    });

    const modelMessages = await convertToModelMessages(sanitizedMessages, {
      ignoreIncompleteToolCalls: true,
    })

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
Be concise, freight-fluent, proactive, and accurate. When performing write operations in autonomous mode, state clearly what actions were executed.

APPROVAL HANDLING:
When a tool execution is denied or rejected by the operator, do not retry it and do not attempt an equivalent action through another tool. Acknowledge the decision in one sentence and continue with whatever remains permitted.

DENIED TOOL REASONING:
Never speculate about results of a tool that was denied. Report only what actually executed.`

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
          // Deep trace: input shape + timing go to the structured log even when
          // the durable audit write below is async (and may itself fail).
          trace.toolStart({
            tool: t.name,
            requiresApproval: Boolean(t.requiresApproval),
            requiredPermissions: t.requiredPermissions ?? [],
            input: params,
          })
          try {
            const out = await t.execute(params, toolCtx)
            const durationMs = `${Date.now() - start}ms`
            trace.toolEnd({
              tool: t.name,
              durationMs: Date.now() - start,
              ok: true,
              output: out,
            })
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
            trace.toolEnd({
              tool: t.name,
              durationMs: Date.now() - start,
              ok: false,
              error: err,
            })
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
        const reason =
          t.approvalReason ||
          `Authorizing ${t.name} will execute an official operational transaction.`
        toolApprovalRecord[t.name] = { type: "user-approval", reason }
        // Surface the gate at WARN so "why did the agent stop?" is answerable
        // from logs alone instead of guessing from the UI.
        trace.approval({
          tool: t.name,
          reason,
          action: "gated",
        })
      }
    }

    trace.step({
      toolsRegistered: Object.keys(toolsRecord).length,
      approvalGated: Object.keys(toolApprovalRecord),
    })

    const maxSteps = Math.max(
      1,
      Math.min(32, parseInt(String(settings.maxSteps || "12"), 10) || 12),
    )

    // Rough token estimate. Char/4 is close enough to decide when to compact;
    // the provider reports the real number afterwards.
    const estimateTokens = (msgs: unknown) =>
      Math.ceil(JSON.stringify(msgs).length / 4)
    const COMPACTION_THRESHOLD = 120_000

    const streamConfig: any = {
      model: resolvedModel,
      system: systemPrompt,
      messages: modelMessages,
      // Official built-ins instead of a hand-rolled predicate.
      // `hasToolCall('askDispatcher')` hands control back to the human the
      // moment the agent needs a decision — that is the point of the tool.
      stopWhen: [isStepCount(maxSteps), hasToolCall("askDispatcher")],
      tools: toolsRecord,

      // ── Ordering ────────────────────────────────────────────────────
      // TMS writes are dependent: bookLoad creates the load that
      // updateLoad then mutates, dispatchTrip reads the load the previous
      // step created. The SDK runs tool calls in a step concurrently by
      // default, which is a race. Serialise them.
      toolCallConcurrency: 1,

      // ── Context management for long runs ────────────────────────────
      // A 30-step freight audit can pull hundreds of KB of tool results into
      // the prompt. Compact once the estimate crosses the threshold instead of
      // letting the provider reject the request or silently truncate.
      prepareStep: async ({ messages }: { messages: unknown[] }) => {
        if (estimateTokens(messages) <= COMPACTION_THRESHOLD) return {}

        return {
          messages: pruneMessages({
            messages: messages as never,
            // Reasoning is never worth re-reading; drop it entirely.
            reasoning: "all",
            // Keep the last few tool exchanges — the agent usually refers
            // back to the most recent results when writing its summary.
            toolCalls: "before-last-3-messages",
            // Empty assistant turns carry no signal.
            emptyMessages: "remove",
          }),
        }
      },
    }

    if (!isAllowAll && Object.keys(toolApprovalRecord).length > 0) {
      streamConfig.toolApproval = toolApprovalRecord
    }

// Tool → presentation metadata for Chain-of-Thought steps.
    const toolMeta: Record<
      string,
      { icon: string; label: string; description: string }
    > = Object.fromEntries(
      ALL_TMS_TOOLS.map((t) => [
        t.name,
          {
            icon: inferToolIcon(t.name),
            label: humanizeToolName(t.name),
            // Tool descriptions are written for the model, not for humans —
            // they read like API docs. Showing them verbatim in the UI is
            // noise, so the label alone carries the meaning.
            description: "",
          },
      ])
    )

    // Writer is captured so the streamText `onStepEnd` callback — which fires
    // WHILE the model is still generating — can push `data-cot-step` parts into
    // the same response. This keeps the trace live instead of buffered.
    let writerRef: UIMessageStreamWriter | null = null

    const emitCotStep = (stepId: string, data: CotStepData) => {
      try {
        writerRef?.write({
          type: "data-cot-step",
          id: stepId,
          data,
        })
      } catch {
        // Client disconnected mid-stream; ignore.
      }
    }

    const result = streamText({
      ...streamConfig,
      // Official per-step hook. Fires after every LLM step (tool round-trip
      // included) while the response is still streaming. Emits one typed cot
      // step per tool call so the client renders a live reasoning trace.
      onStepEnd: ({ toolCalls, toolResults, usage, stepNumber }: StepEndEvent) => {
        trace.step({
          stepNumber: stepNumber ?? null,
          toolCalls: (toolCalls ?? []).map((c) => c.toolName),
          toolResultCount: (toolResults ?? []).length,
          usage: usage ?? null,
        })
        for (const call of toolCalls ?? []) {
          const meta =
            toolMeta[call.toolName] ?? {
              icon: "wrench",
              label: humanizeToolName(call.toolName),
              description: "",
            }
          const res = (toolResults ?? []).find(
            (r) => r.toolCallId === call.toolCallId
          )
          emitCotStep(`cot-${call.toolCallId}`, {
            id: `cot-${call.toolCallId}`,
            toolName: call.toolName,
            icon: meta.icon,
            label: meta.label,
            description: meta.description,
            status: res ? "complete" : "active",
            summary: res ? summarizeToolOutput(res.output) : [],
          })
        }
      },
    } as Parameters<typeof streamText>[0])

    const stream = createUIMessageStream({
      // Runs once the whole generation is done. The placeholder "thinking"
      // step is written with status `active` at the top of this stream, so
      // without this finalisation it would stay `active` forever and the
      // client's shimmer would keep looping long after the answer arrived.
      onFinish: () => {
        emitCotStep("cot-thinking", {
          id: "cot-thinking",
          toolName: "__thinking__",
          icon: "think",
          label: "",
          status: "complete",
        })
        trace.finish({ reason: "stream-complete" })
      },
      execute: async ({ writer }) => {
        writerRef = writer

        // 1. Emit a placeholder step FIRST so the UI has instant feedback the
        //    moment the user hits enter. The label stays neutral — the client
        //    renders the shimmer and swaps in the real step labels that
        //    onStepEnd emits as tools actually run.
        writer.write({
          type: "data-cot-step",
          id: "cot-thinking",
          data: {
            id: "cot-thinking",
            toolName: "__thinking__",
            icon: "think",
            label: "",
            status: "active",
          },
        })

        // 2. Bridge the real UI stream immediately so text/reasoning/tool
        //    chunks reach the client token-by-token. This MUST happen before any
        //    awaiting, otherwise the entire run is buffered server-side and the
        //    UI only updates once generation has finished.
        writer.merge(
          toUIMessageStream({
            stream: result.stream,
            sendReasoning: true,
            // Surface real failures to the operator instead of the SDK's
            // default "An error occurred." — a silent black box makes a TMS
            // that mutates freight data genuinely dangerous to debug.
            onError: (error) => {
              if (error == null) return "Unknown error";
              if (typeof error === "string") return error;
              if (error instanceof Error) return error.message;
              return JSON.stringify(error);
            },
            // Official hook for token usage. The client's <Context> component
            // reads this off message.metadata to render the context-window
            // meter and cost estimate.
            messageMetadata: ({ part }) => {
              if (part.type === "finish") {
                // Final accounting for this turn: what the operator actually
                // paid for, in one line.
                trace.finish({
                  usage: part.totalUsage,
                  finishReason: "complete",
                })
                return { totalUsage: part.totalUsage }
              }
            },
          })
        )
      },
    })

    return createUIMessageStreamResponse({ stream })
  } catch (error: any) {
    // Structured failure, correlated by turnId where we got far enough to
    // create the logger.
    if (logger) logger.fail(error)
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * Map a tool name to a string icon key the client can resolve to a Lucide icon.
 * Keeps the server payload tiny and the rendering concern on the client.
 */
function inferToolIcon(toolName: string): string {
  const n = toolName.toLowerCase()
  if (n.includes("load") && (n.includes("book") || n.includes("create"))) return "package-plus"
  if (n.includes("load") || n.includes("freight")) return "package"
  if (n.includes("dispatch") || n.includes("trip")) return "truck"
  if (n.includes("driver") || n.includes("fleet") || n.includes("truck") || n.includes("trailer")) return "truck"
  if (n.includes("customer") || n.includes("shipper")) return "building-2"
  if (n.includes("carrier")) return "truck"
  if (n.includes("invoice") || n.includes("billing") || n.includes("payment")) return "receipt"
  if (n.includes("expense") || n.includes("settle")) return "banknote"
  if (n.includes("member") || n.includes("invite") || n.includes("workspace")) return "user-plus"
  if (n.includes("audit") || n.includes("security")) return "shield"
  if (n.includes("plan") || n.includes("delegate") || n.includes("subtask")) return "list-checks"
  if (n.includes("dispatcher") || n.includes("ask")) return "help-circle"
  if (n.includes("memory") || n.includes("recall") || n.includes("save")) return "brain"
  if (n.includes("search") || n.includes("query")) return "search"
  if (n.includes("email") || n.includes("send")) return "mail"
  if (n.includes("schedule") || n.includes("task")) return "calendar"
  if (n.includes("pod") || n.includes("doc") || n.includes("file")) return "file-text"
  return "wrench"
}

/**
 * Tool name → present-continuous status label, matching how VS Code Copilot
 * phrases its own progress ("Planning refactor strategy"). `queryLoads`
 * becomes "Searching loads", not the unusable "query Loads".
 */
function humanizeToolName(toolName: string): string {
  const verb = VERB_BY_TOOL[toolName];
  if (verb) return verb;

  // Unknown tool: fall back to a clean capitalised phrase rather than raw
  // camelCase soup.
  const words = toolName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return `Running ${words}`;
}

/** Explicit verb phrases so every TMS tool reads like a real progress step. */
const VERB_BY_TOOL: Record<string, string> = {
  // Loads
  bookLoad: "Booking load",
  queryLoads: "Searching loads",
  updateLoad: "Updating load",
  updateLoadDocs: "Updating load documents",
  // Trips & dispatch
  dispatchTrip: "Dispatching trip",
  updateTripStatus: "Updating trip status",
  // Fleet
  getFleetStatus: "Checking fleet status",
  createDriver: "Adding driver",
  updateDriver: "Updating driver",
  createTruck: "Adding tractor",
  updateTruck: "Updating tractor",
  createTrailer: "Adding trailer",
  // Customers & carriers
  queryCustomers: "Searching customers",
  createCustomer: "Adding customer",
  queryCarriers: "Searching carriers",
  createCarrier: "Adding carrier",
  // Invoicing
  queryInvoices: "Searching invoices",
  createInvoice: "Generating invoice",
  sendInvoiceEmail: "Sending invoice email",
  markInvoicePaid: "Recording payment",
  getMissingPods: "Checking missing PODs",
  // Expenses
  reviewPendingExpenses: "Reviewing pending expenses",
  approveExpense: "Approving expense",
  logTripExpense: "Logging trip expense",
  // Members
  listWorkspaceMembers: "Listing workspace members",
  inviteWorkspaceMember: "Inviting member",
  resendInvitation: "Resending invitation",
  cancelInvitation: "Cancelling invitation",
  updateMemberRole: "Updating member role",
  removeMember: "Removing member",
  // System & subagents
  queryAuditLogs: "Reviewing audit log",
  checkIntegrations: "Checking integrations",
  searchFreightKnowledge: "Searching freight knowledge",
  createExecutionPlan: "Building execution plan",
  delegateSubtask: "Delegating subtask",
  askDispatcher: "Asking dispatcher",
  // Coworker
  assignDriverTask: "Assigning driver task",
  askDriverQuestion: "Asking driver",
  scheduleCoworkerTask: "Scheduling checkup",
  listScheduledTasks: "Listing scheduled tasks",
  saveCopilotMemory: "Saving memory",
  recallCopilotMemory: "Recalling memory",
}

/**
 * Reduce a tool's output to a few short labels suitable for
 * ChainOfThoughtSearchResult badges.
 */
function summarizeToolOutput(output: unknown): string[] {
  if (!output || typeof output !== "object") return []
  const o = output as Record<string, unknown>
  const out: string[] = []
  if (Array.isArray(o.results)) {
    out.push(`${o.results.length} result${o.results.length === 1 ? "" : "s"}`)
  }
  if (typeof o.count === "number") {
    out.push(`${o.count} item${o.count === 1 ? "" : "s"}`)
  }
  if (typeof o.success === "boolean") {
    out.push(o.success ? "ok" : "failed")
  }
  if (o.id != null) out.push(`#${String(o.id).slice(0, 8)}`)
  if (typeof o.message === "string") out.push(o.message.slice(0, 60))
  return out.slice(0, 4)
}
