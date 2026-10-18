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
    const { messages, model, provider } = body

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 })
    }

    const perms = await getEffectivePermissions(session.user.id, tenantId)

    const targetProvider = provider || (process.env.OPENROUTER_API_KEY ? "openrouter" : "nim")
    const targetModel =
      model || (targetProvider === "openrouter" ? "openai/gpt-4o-mini" : "meta/llama-3.3-70b-instruct")

    const resolvedModel = getModel(targetProvider, targetModel)

    // Official AI SDK v5: Convert UIMessage[] (from useChat) to ModelMessage[] (for streamText)
    const modelMessages = await convertToModelMessages(messages)

    const systemPrompt = `You are Muvx Copilot, the autonomous transportation intelligence agent integrated into Muvx TMS.
User: ${session.user.name || session.user.email} (${session.user.role || "Member"})
Workspace: ${tenantId}
User Permissions:
- Can create/edit loads: ${perms.has("loads.create")}
- Can dispatch trips: ${perms.has("trips.create")}
- Can manage fleet & drivers: ${perms.has("fleet.trucks.create")}
- Can manage invoices & billing: ${perms.has("invoices.view_all")}
- Can approve AP expenses: ${perms.has("expenses.view_all")}
- Can view compliance: ${perms.has("safety.module")}

FULL OPERATIONAL AGENCY (ALL USER ACTIONS):
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
4. Customers & Shippers:
   - Search customers, credit terms, and contact info ('queryCustomers')
   - Add new shipper/broker customers with Net 30/15 terms ('createCustomer')
5. Partner Carriers:
   - Search partner carrier directory with MC# and insurance ('queryCarriers')
   - Onboard new motor carriers ('createCarrier')
6. Invoicing & Accounting:
   - Search customer AR invoices and overdue aging balances ('queryInvoices')
   - Generate official customer invoice from delivered loads ('createInvoice')
   - Email customer invoice with Resend payment link ('sendInvoiceEmail')
   - Record customer payment for invoices ('markInvoicePaid')
   - Query delivered loads missing signed PODs for factoring ('getMissingPods')
7. Expenses & Settlements:
   - Review pending AP trip expenses ('reviewPendingExpenses')
   - Approve driver expense reimbursement ('approveExpense')
   - Log new trip expense: fuel, toll, lumper, maintenance ('logTripExpense')
8. Team & Workspace Administration:
   - List team members and pending invites ('listWorkspaceMembers')
   - Invite new team members with assigned role ('inviteWorkspaceMember')
   - Resend invitation email ('resendInvitation')
   - Cancel pending invitation ('cancelInvitation')
   - Promote or update member role ('updateMemberRole')
   - Remove member with cascade cleanup ('removeMember')
9. Audit & Security Trail:
   - Search recent activity, load, dispatch, and security logs ('queryAuditLogs')
10. Integrations & Telematics:
    - Inspect real-time status of Samsara, Motive, Geotab, DAT One, QuickBooks ('checkIntegrations')
11. Multi-Step Execution & Sub-Agents:
    - Formulate multi-step plans ('createExecutionPlan')
    - Delegate subtasks to specialized bot personas ('delegateSubtask')
    - Consult human dispatcher when decisions are required ('askDispatcher')

POLICY & APPROVALS PROTOCOL:
Any action that writes or modifies operational or financial data (booking loads, dispatching trips, updating terms, creating assets, emailing invoices, marking payments, approving expenses) automatically triggers the official AI SDK Human-in-the-Loop confirmation card. Always be concise, freight-fluent, and accurate.`

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
          return t.execute(params, toolCtx)
        },
      })

      if (t.requiresApproval) {
        toolApprovalRecord[t.name] = {
          type: "user-approval",
          reason: t.approvalReason || `Authorizing ${t.name} will execute an official operational transaction.`,
        }
      }
    }

    const result = streamText({
      model: resolvedModel,
      system: systemPrompt,
      messages: modelMessages,
      stopWhen: ({ steps }) => steps.length >= 8,
      toolApproval: toolApprovalRecord,
      tools: toolsRecord,
    })

    return result.toUIMessageStreamResponse()
  } catch (error: any) {
    console.error("Chat API error:", error)
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    )
  }
}
