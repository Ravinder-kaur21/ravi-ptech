"use client";

/**
 * ToolPart — Copilot-style row that describes what the agent did.
 *
 * Features:
 *   - per-tool icon (read_file = FileText, search = Search, etc.)
 *   - present-tense label while running, past-tense once complete
 *   - small target pill (path / repo / query / command) inline
 *   - collapsible Input / Output / Error drawers with JSON viewer,
 *     chart detection, and download buttons for file outputs
 *   - VS Code-style active pulse + relative rail in ToolPartList
 */

import { useState } from "react";
import {
  AlertCircle,
  ChevronRight,
  Circle,
  FileText,
  Search,
  Globe,
  Mail,
  Package,
  Truck,
  Banknote,
  Receipt,
  Users,
  ShieldCheck,
  Cable,
  Building2,
  HelpCircle,
  BookOpen,
  Calendar,
  Cpu,
  Workflow,
  Mic,
  Image as ImageIcon,
  PencilLine,
  Terminal,
  FolderOpen,
  Sparkles,
  Wrench,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { JsonViewer } from "./json-viewer";
import type { ToolCallEvent, ToolCallState } from "../types";

// ---------------------------------------------------------------------------
// Per-tool icon map (Copilot-style: file = FileText, search = Search, etc.)
// ---------------------------------------------------------------------------
const TOOL_ICONS: Record<string, typeof FileText> = {
  // reads / writes / searches
  read_file: FileText,
  workspace_file_read: FileText,
  list_dir: FolderOpen,
  workspace_list: FolderOpen,
  search: Search,
  grep_search: Search,
  workspace_grep: Search,
  apply_patch: PencilLine,
  write_file: PencilLine,
  workspace_file_write: PencilLine,
  create_file: FileText,

  // exec
  exec: Terminal,
  run_command: Terminal,

  // web
  web_search: Globe,
  web_request: Globe,
  web_fetch: Globe,
  tavily_search: Globe,

  // memory
  memory_search: Sparkles,
  memory_remember: Sparkles,
  memory_forget: Sparkles,

  // subagents
  spawn_subagent: Workflow,
  discover_skills: Workflow,

  // generated media
  generate_image: ImageIcon,
  generate_video: ImageIcon,
  text_to_speech: Mic,

  // ── TMS tools (Muvx) ─────────────────────────────────────────────
  bookLoad: Truck,
  draftLoad: Truck,
  queryLoads: Truck,
  updateLoad: PencilLine,
  updateLoadDocs: PencilLine,
  dispatchTrip: Truck,
  updateTripStatus: PencilLine,

  getFleetStatus: Users,
  createDriver: Users,
  updateDriver: PencilLine,
  createTruck: Truck,
  updateTruck: PencilLine,
  createTrailer: Truck,

  queryCustomers: Building2,
  createCustomer: Building2,
  queryCarriers: Truck,
  createCarrier: Truck,

  queryInvoices: Receipt,
  createInvoice: Receipt,
  sendInvoiceEmail: Mail,
  markInvoicePaid: Banknote,
  getMissingPods: FileText,

  reviewPendingExpenses: Banknote,
  approveExpense: Banknote,
  logTripExpense: Banknote,

  listWorkspaceMembers: Users,
  inviteWorkspaceMember: Users,
  resendInvitation: Mail,
  cancelInvitation: Wrench,
  updateMemberRole: PencilLine,
  removeMember: Users,

  queryAuditLogs: ShieldCheck,
  checkIntegrations: Cable,
  searchFreightKnowledge: BookOpen,

  createExecutionPlan: Workflow,
  delegateSubtask: Workflow,
  askDispatcher: HelpCircle,

  assignDriverTask: Cpu,
  askDriverQuestion: Mail,
  scheduleCoworkerTask: Calendar,
  listScheduledTasks: Calendar,

  saveCopilotMemory: Sparkles,
  recallCopilotMemory: Search,
};

const ACTIVE_TOOL_STATES = [
  "calling",
  "input-streaming",
  "input-available",
  "executing",
] as const;

function isActiveToolState(state: ToolCallState | string) {
  return ACTIVE_TOOL_STATES.includes(state as (typeof ACTIVE_TOOL_STATES)[number])
}

function ActivePulseDot() {
  return (
    <span className="relative flex size-3 items-center justify-center">
      <span className="absolute size-2 rounded-full bg-brand-accent/25 animate-ping" />
      <Circle className="relative size-2 fill-brand-accent text-brand-accent animate-pulse" />
    </span>
  );
}

// ---------------------------------------------------------------------------
// Per-tool invocation formatter.
// ---------------------------------------------------------------------------
function basename(p: string): string {
  const i = Math.max(p.lastIndexOf("/"), p.lastIndexOf("\\"))
  return i >= 0 ? p.slice(i + 1) : p
}
function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined
}
function asNumber(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined
}
function quote(s: string, max = 56): string {
  const t = s.length > max ? `${s.slice(0, max)}…` : s
  return `"${t}"`
}

export function describeTool(
  toolName: string,
  args?: Record<string, unknown>,
): string {
  const a = args ?? {}
  const path = asString(a.path) ?? asString(a.filePath) ?? asString(a.filename)
  const query = asString(a.query) ?? asString(a.search) ?? asString(a.q)
  const cmd = asString(a.command) ?? asString(a.cmd)

  // Generic file-style
  if (path && /read|file/i.test(toolName)) {
    return `Reading ${basename(path)}`
  }
  if (path && /write|create_file|apply_patch|update|edit/i.test(toolName)) {
    return `Editing ${basename(path)}`
  }

  switch (toolName) {
    case "search":
    case "grep_search":
    case "workspace_grep":
      return query ? `Searching for ${quote(query)}` : "Searching files"

    case "exec":
    case "run_command":
      return cmd ? `Running ${quote(cmd, 64)}` : "Running command"

    case "web_search":
    case "tavily_search":
      return query ? `Searching the web for ${quote(query)}` : "Searching the web"
    case "web_fetch":
    case "web_request":
      return asString(a.url) ? `Fetching ${asString(a.url)}` : "Making web request"

    case "spawn_subagent":
      return `Delegating to ${asString(a.agent) ?? "sub-agent"}`

    case "generate_image":
      return "Generating image"
    case "generate_video":
      return "Generating video"
    case "text_to_speech":
      return "Generating audio"

    // TMS-specific labels
    case "bookLoad":
      return "Booking load"
    case "draftLoad":
      return "Drafting load"
    case "queryLoads":
      return "Searching loads"
    case "updateLoad":
      return "Updating load"
    case "updateLoadDocs":
      return "Updating load documents"
    case "dispatchTrip":
      return "Dispatching trip"
    case "updateTripStatus":
      return "Updating trip status"

    case "getFleetStatus":
      return "Checking fleet status"
    case "createDriver":
      return "Adding driver"
    case "updateDriver":
      return "Updating driver"
    case "createTruck":
      return "Adding tractor"
    case "updateTruck":
      return "Updating tractor"
    case "createTrailer":
      return "Adding trailer"

    case "queryCustomers":
      return "Searching customers"
    case "createCustomer":
      return "Adding customer"
    case "queryCarriers":
      return "Searching carriers"
    case "createCarrier":
      return "Adding carrier"

    case "queryInvoices":
      return "Searching invoices"
    case "createInvoice":
      return "Generating invoice"
    case "sendInvoiceEmail":
      return "Sending invoice email"
    case "markInvoicePaid":
      return "Recording payment"
    case "getMissingPods":
      return "Checking missing PODs"

    case "reviewPendingExpenses":
      return "Reviewing pending expenses"
    case "approveExpense":
      return "Approving expense"
    case "logTripExpense":
      return "Logging trip expense"

    case "listWorkspaceMembers":
      return "Listing workspace members"
    case "inviteWorkspaceMember":
      return "Inviting member"
    case "resendInvitation":
      return "Resending invitation"
    case "cancelInvitation":
      return "Cancelling invitation"
    case "updateMemberRole":
      return "Updating member role"
    case "removeMember":
      return "Removing member"

    case "queryAuditLogs":
      return "Reviewing audit log"
    case "checkIntegrations":
      return "Checking integrations"
    case "searchFreightKnowledge":
      return "Searching freight knowledge"

    case "createExecutionPlan":
      return "Building execution plan"
    case "delegateSubtask":
      return "Delegating subtask"
    case "askDispatcher":
      return "Asking dispatcher"

    case "assignDriverTask":
      return "Assigning driver task"
    case "askDriverQuestion":
      return "Asking driver"
    case "scheduleCoworkerTask":
      return "Scheduling checkup"
    case "listScheduledTasks":
      return "Listing scheduled tasks"

    case "saveCopilotMemory":
      return "Saving memory"
    case "recallCopilotMemory":
      return "Recalling memory"

    default:
      if (path) return `${toolName} ${basename(path)}`
      if (query) return `${toolName} ${quote(query)}`
      return toolName
  }
}

function ToolIcon({
  toolName,
  state,
  className,
}: {
  toolName: string
  state: ToolCallState
  className?: string
}) {
  const error = state === "output-error"

  // VS Code pattern: no spinner for active tools — the label shimmers
  // via CSS animation handled by the parent. Static icon so the row's
  // left position never shifts on state transitions.
  if (error) {
    return <AlertCircle className={cn("size-3.5 text-rose-600", className)} />
  }
  const Icon = TOOL_ICONS[toolName] ?? Wrench
  return <Icon className={cn("size-3.5 text-brand-muted-soft", className)} />
}

function formatJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

export function ToolPart({ tool }: { tool: ToolCallEvent }) {
  const [open, setOpen] = useState(false)
  const error = tool.state === "output-error"
  const isPending = isActiveToolState(tool.state)

  const label = describeTool(tool.toolName, tool.args)

  // Pull a short mono "target" out of args.
  const a = tool.args ?? {}
  const target =
    asString(a.path) ??
    asString(a.filePath) ??
    asString(a.filename) ??
    asString(a.url) ??
    asString(a.domain) ??
    asString(a.query) ??
    asString(a.search) ??
    asString(a.q) ??
    asString(a.command) ??
    asString(a.cmd) ??
    [asString(a.originCity), asString(a.destCity)].filter(Boolean).join(" → ")
  const targetShort = target
    ? target.length > 64
      ? `…${target.slice(-61)}`
      : target
    : undefined

  const hasDetails =
    (tool.args && Object.keys(tool.args).length > 0) || tool.result != null

  return (
    <div className="group/tool relative">
      <button
        type="button"
        onClick={() => hasDetails && setOpen((v) => !v)}
        disabled={!hasDetails}
        className={cn(
          "flex w-full max-w-full items-start gap-2.5 py-1 text-left text-[13px] text-brand-muted transition-colors",
          hasDetails && "hover:text-brand-ink",
          "disabled:cursor-default",
        )}
      >
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          <ToolIcon toolName={tool.toolName} state={tool.state} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                "truncate",
                error && "text-rose-600",
                isPending && !error && "animate-pulse text-brand-ink/85",
              )}
            >
              {label}
            </span>
            {targetShort && (
              <span className="min-w-0 truncate font-mono text-[11px] text-brand-muted-soft/60">
                {targetShort}
              </span>
            )}
            {hasDetails && (
              <ChevronRight
                className={cn(
                  "ml-auto size-3 shrink-0 text-brand-muted-soft/55 transition-transform",
                  open && "rotate-90",
                )}
              />
            )}
          </div>
        </div>
      </button>

      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          open && hasDetails
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div className="ml-6 mt-1 mb-1 space-y-2 border-l border-brand-rule/60 pl-3">
            {tool.args && Object.keys(tool.args).length > 0 && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-brand-muted-soft/65">
                  Input
                </div>
                <pre className="mt-1 max-h-56 overflow-auto rounded-md border border-brand-rule/50 bg-brand-cream-soft px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-brand-muted">
                  {formatJson(tool.args)}
                </pre>
              </div>
            )}
            {tool.result != null && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-brand-muted-soft/65">
                  Output
                </div>
                {/* Download button for create_file tool */}
                {typeof tool.result === "object" &&
                  tool.result !== null &&
                  "download_url" in (tool.result as Record<string, unknown>) && (
                    <a
                      href={String(
                        (tool.result as Record<string, unknown>).download_url,
                      )}
                      download={
                        ((tool.result as Record<string, unknown>)
                          .filename as string) ?? "download"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 mb-2 inline-flex items-center gap-2 rounded-lg border border-brand-accent/30 bg-brand-accent/5 px-3 py-2 text-sm font-medium text-brand-accent transition-colors hover:bg-brand-accent/10 hover:border-brand-accent/50"
                    >
                      <Download className="size-4" />
                      Download{" "}
                      {((tool.result as Record<string, unknown>)
                        .filename as string) ?? "file"}
                    </a>
                  )}
                {typeof tool.result === "string" ? (
                  <pre className="mt-1 max-h-72 overflow-auto rounded-md border border-brand-rule/50 bg-brand-cream-soft px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-brand-muted">
                    {tool.result}
                  </pre>
                ) : (
                  <JsonViewer
                    data={tool.result}
                    className="mt-1 max-h-72 overflow-auto"
                  />
                )}
              </div>
            )}
            {error && tool.errorText && (
              <div>
                <div className="text-[10px] font-medium uppercase tracking-wide text-rose-600/80">
                  Error
                </div>
                <pre className="mt-1 overflow-x-auto rounded-md border border-rose-300/40 bg-rose-50/50 px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-rose-700">
                  {tool.errorText}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export function ToolPartList({ tools }: { tools: ToolCallEvent[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!tools.length) return null

  const collapsible = tools.length > 4
  const visible = collapsible && !expanded ? tools.slice(-3) : tools
  const hidden = tools.length - visible.length

  return (
    <div className="relative ml-0.5 pl-3">
      {collapsible && !expanded && hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mb-0.5 flex items-center gap-1 text-[11.5px] text-brand-muted-soft/75 transition-colors hover:text-brand-ink"
        >
          <ChevronRight className="size-3" />
          <span>
            Show {hidden} earlier {hidden === 1 ? "step" : "steps"}
          </span>
        </button>
      )}

      {visible.map((tool, index) => {
        const active = isActiveToolState(tool.state)
        const error = tool.state === "output-error"
        const only = visible.length === 1
        const first = index === 0
        const last = index === visible.length - 1
        return (
          <div key={`${tool.toolCallId}-${index}`} className="relative">
            <span
              aria-hidden
              className={cn(
                "absolute -left-3 top-0 bottom-0 w-px bg-brand-muted-soft/55",
                only && !active && "hidden",
                only &&
                  active &&
                  "[mask-image:linear-gradient(to_bottom,#000_0_5px,transparent_5px_20px,#000_20px_100%)]",
                !only &&
                  first &&
                  "[mask-image:linear-gradient(to_bottom,transparent_0_20px,#000_20px_100%)]",
                !only &&
                  last &&
                  "[mask-image:linear-gradient(to_bottom,#000_0_5px,transparent_5px_100%)]",
                !only &&
                  !first &&
                  !last &&
                  "[mask-image:linear-gradient(to_bottom,#000_0_5px,transparent_5px_20px,#000_20px_100%)]",
              )}
            />
            <span className="absolute -left-4 top-3 flex size-2 items-center justify-center bg-brand-cream">
              {active && !error ? (
                <ActivePulseDot />
              ) : (
                <Circle
                  className={cn(
                    "size-1.5",
                    error
                      ? "fill-rose-600 text-rose-600"
                      : "fill-brand-cream text-brand-muted-soft",
                  )}
                />
              )}
            </span>
            <ToolPart tool={tool} />
          </div>
        )
      })}
    </div>
  )
}
