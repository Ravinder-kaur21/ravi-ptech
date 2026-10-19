/**
 * Tool Renderer Registry — drives the official `<Tool>` AI Element for every TMS
 * tool. Replaces the 1,000+ line bespoke `renderPart` switch in `chat-interface.tsx`
 * with a typed map.
 *
 * Per the AI SDK v7 + AI Elements docs, `<Tool>` is the canonical renderer for
 * tool invocations and exposes the state machine:
 *   `input-streaming → input-available → output-available → approval-requested | output-denied | output-error`.
 *
 * Pattern:
 *   - `resolveToolRenderer(toolName)` returns `{ icon, renderShell?, renderBody, renderConfirmation? }`.
 *   - The chat surface wraps in `<Tool>` + `<ToolHeader>` and uses
 *     `renderBody(input, output, state)` for the rich body.
 *   - Tools with HITL get a `<Confirmation>` block returned via `renderConfirmation(...)`.
 *
 * Generic fallback uses `<ToolInput>` + `<ToolOutput>` which are official AI
 * Elements and render JSON / strings cleanly. Bespoke per-tool renderers stay
 * only where the UX demands rich per-tool presentation.
 */
"use client"

import React from "react"
import {
  Truck,
  ArrowRight,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Clock,
  Search,
  Users,
  Route,
  HelpCircle,
  Receipt,
  Banknote,
  FileWarning,
  Mail,
  Bell,
  Brain,
  Sparkles,
  FileText,
  Inbox,
  Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
  type ToolPart,
} from "@/components/ai-elements/tool"
import {
  Confirmation,
  ConfirmationActions,
  ConfirmationAction,
  ConfirmationRequest,
  ConfirmationTitle,
  ConfirmationAccepted,
  ConfirmationRejected,
} from "@/components/ai-elements/confirmation"

export type ApprovalApi = (options: { id: string; approved: boolean; reason?: string }) => void

export interface ToolRenderInput {
  toolName: string
  state: ToolPart["state"]
  input: unknown
  output: unknown
  errorText?: string
  approvalId?: string
  approval?: { id: string; approved?: boolean; reason?: string }
  approvalAddReason?: boolean
}

export interface RenderedTool {
  icon: LucideIcon
  /** The body content (between `<ToolHeader>` and the end of `<ToolContent>`). */
  body: React.ReactNode
  /** Override the default `<ToolHeader title={toolName}>` line. */
  headerTitle?: React.ReactNode
  /** Confirmation block, if any. Rendered at the top of the body. */
  confirmation?: React.ReactNode
}

const ICONS: Record<string, LucideIcon> = {
  bookLoad: Truck,
  queryLoads: Search,
  updateLoad: Truck,
  updateLoadDocs: Truck,
  dispatchTrip: ArrowRight,
  updateTripStatus: ArrowRight,
  getFleetStatus: Users,
  createDriver: Users,
  updateDriver: Users,
  createTruck: Truck,
  updateTruck: Truck,
  createTrailer: Truck,
  queryCustomers: Search,
  createCustomer: Users,
  queryCarriers: Search,
  createCarrier: Users,
  queryInvoices: Receipt,
  createInvoice: Banknote,
  sendInvoiceEmail: Mail,
  markInvoicePaid: Banknote,
  getMissingPods: FileWarning,
  reviewPendingExpenses: Receipt,
  approveExpense: Banknote,
  logTripExpense: Banknote,
  listWorkspaceMembers: Users,
  inviteWorkspaceMember: Users,
  resendInvitation: Mail,
  cancelInvitation: Users,
  updateMemberRole: Users,
  removeMember: Users,
  queryAuditLogs: ShieldCheck,
  checkIntegrations: Cpu,
  searchFreightKnowledge: Brain,
  createExecutionPlan: Route,
  delegateSubtask: Sparkles,
  askDispatcher: HelpCircle,
  assignDriverTask: Bell,
  askDriverQuestion: HelpCircle,
  scheduleCoworkerTask: Clock,
  listScheduledTasks: Clock,
  saveCopilotMemory: Brain,
  recallCopilotMemory: Brain,
  generateDocument: FileText,
  exportLoadsCsv: FileText,
}

export function getToolIcon(toolName: string): LucideIcon {
  return ICONS[toolName] ?? Inbox
}

function isRunning(state: ToolPart["state"]) {
  return state === "input-streaming" || state === "input-available"
}

function ToolInputOutput({ input, output, errorText }: { input: unknown; output: unknown; errorText?: string }) {
  return (
    <>
      <ToolInput input={input as any} />
      <ToolOutput output={output as any} errorText={errorText} />
    </>
  )
}

function buildConfirmation(opts: {
  approval: ToolRenderInput["approval"]
  approvalId?: string
  addToolApprovalResponse?: ApprovalApi
  reason: string
}) {
  if (!opts.approval || !opts.approvalId) return null
  if (opts.approval.approved === true) {
    return (
      <Confirmation approval={opts.approval as any} state="output-available" className="my-2">
        <ConfirmationRequest>
          <ConfirmationTitle>{opts.reason}</ConfirmationTitle>
          <ConfirmationAccepted>Approved</ConfirmationAccepted>
          <ConfirmationActions>
            {opts.approval.reason && (
              <ConfirmationAction variant="outline" disabled>
                Note: {opts.approval.reason}
              </ConfirmationAction>
            )}
          </ConfirmationActions>
        </ConfirmationRequest>
      </Confirmation>
    )
  }
  if (opts.approval.approved === false) {
    return (
      <Confirmation approval={opts.approval as any} state="output-denied" className="my-2">
        <ConfirmationRequest>
          <ConfirmationTitle>{opts.reason}</ConfirmationTitle>
          <ConfirmationRejected>Rejected</ConfirmationRejected>
        </ConfirmationRequest>
      </Confirmation>
    )
  }
  // approval-pending
  return (
    <Confirmation approval={opts.approval as any} state="approval-requested" className="my-2">
      <ConfirmationRequest>
        <ConfirmationTitle>{opts.reason}</ConfirmationTitle>
        <ConfirmationActions>
          <ConfirmationAction
            variant="outline"
            onClick={() => opts.addToolApprovalResponse?.({ id: opts.approvalId!, approved: false })}
          >
            Reject
          </ConfirmationAction>
          <ConfirmationAction
            variant="default"
            onClick={() => opts.addToolApprovalResponse?.({ id: opts.approvalId!, approved: true })}
          >
            Approve
          </ConfirmationAction>
        </ConfirmationActions>
      </ConfirmationRequest>
    </Confirmation>
  )
}

/**
 * Resolve a tool invocation to a complete `<Tool>`-shaped render using the
 * official AI Element. Adds an optional `<Confirmation>` block for tools that
 * require approval.
 */
export function renderToolShell(
  key: string,
  input: ToolRenderInput,
  addToolApprovalResponse?: ApprovalApi,
  approvalReason?: string,
) {
  const icon = getToolIcon(input.toolName)
  const body = (input.state !== "input-streaming" && input.state !== "output-error") ? (
    <ToolInputOutput input={input.input} output={input.output} errorText={input.errorText} />
  ) : input.state === "output-error" ? (
    <ToolOutput output={input.output as any} errorText={input.errorText} />
  ) : (
    <ToolInput input={input.input as any} />
  )

  const confirmation = buildConfirmation({
    approval: input.approval,
    approvalId: input.approvalId,
    addToolApprovalResponse,
    reason: approvalReason || `Authorizing ${input.toolName}`,
  })

  return (
    <Tool key={key} defaultOpen={isRunning(input.state) || !!input.errorText}>
      <ToolHeader
        title={input.toolName}
        type={input.toolName as any}
        state={input.state}
      />
      <ToolContent>
        {confirmation}
        {body}
      </ToolContent>
    </Tool>
  )
}

export type ToolConfirmationProps = {
  approval: { id: string; approved?: boolean; reason?: string; requestReason?: string } | undefined
  approvalId: string | undefined
  toolName: string
  input: unknown
  reason: string
  addToolApprovalResponse?: ApprovalApi
}

/** Bare-bones `<Confirmation>` block per the official AI Element. */
export function renderConfirmation(props: ToolConfirmationProps) {
  return buildConfirmation({
    approval: props.approval,
    approvalId: props.approvalId,
    addToolApprovalResponse: props.addToolApprovalResponse,
    reason: props.reason,
  })
}
