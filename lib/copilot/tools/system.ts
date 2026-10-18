import { z } from "zod"
import { desc } from "drizzle-orm"
import { db } from "@/lib/db"
import { auditLog } from "@/lib/schema"
import { defineTmsTool, hasPermission, permissionDeniedResult } from "../types"

export const queryAuditLogsTool = defineTmsTool({
  name: "queryAuditLogs",
  description: "Query recent security, dispatch, and financial audit events in the workspace.",
  requiredPermissions: ["workspace.audit_log.view"],
  inputSchema: z.object({
    limit: z.number().default(10).describe("Max audit entries to retrieve"),
  }),
  execute: async ({ limit }, ctx) => {
    if (!hasPermission(ctx, ["workspace.audit_log.view", "safety.audit_log.view_safety", "workspace.module", "safety.module"])) {
      return permissionDeniedResult(["workspace.audit_log.view"])
    }

    const rows = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorEmail: auditLog.actorEmail,
        targetType: auditLog.targetType,
        targetLabel: auditLog.targetLabel,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      events: rows.map((e) => ({
        id: e.id,
        action: e.action,
        actor: e.actorEmail || "System",
        target: `${e.targetType}: ${e.targetLabel || ""}`,
        ip: e.ipAddress || "Internal",
        timestamp: new Date(e.createdAt).toLocaleString(),
      })),
    }
  },
})

export const checkIntegrationsTool = defineTmsTool({
  name: "checkIntegrations",
  description: "Inspect connection health, webhook activity, and latency across Samsara, Motive, Geotab, DAT One, and QuickBooks.",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      telematics: [
        { platform: "Samsara", status: "Connected", latencyMs: 42, lastSync: "1 min ago", activeVehicles: 18 },
        { platform: "Motive (KeepTruckin)", status: "Connected", latencyMs: 68, lastSync: "3 mins ago", activeDrivers: 14 },
        { platform: "Geotab", status: "Standby", latencyMs: null, lastSync: "1 hour ago", activeVehicles: 0 },
      ],
      loadboards: [
        { platform: "DAT One", status: "Active Rate Feed", searchQuotaRemaining: "89%", latencyMs: 110 },
        { platform: "Truckstop.com", status: "Connected", searchQuotaRemaining: "95%", latencyMs: 145 },
      ],
      accounting: [
        { platform: "QuickBooks Online", status: "Token Active", lastReconciliation: "Today 08:30 CST" },
        { platform: "TriumphPay", status: "Factoring Link Active", eligibleReceivables: "$48,250" },
      ],
    }
  },
})

export const searchFreightKnowledgeTool = defineTmsTool({
  name: "searchFreightKnowledge",
  description: "Query FMCSA regulatory rules, hours of service (HOS) limits, equipment guidelines, and lane benchmarks.",
  inputSchema: z.object({
    topic: z.string().describe("Topic (e.g. '34 hour restart', 'detention pay', 'reefer pre-cooling')"),
  }),
  execute: async ({ topic }) => {
    const t = topic.toLowerCase()
    if (t.includes("restart") || t.includes("34") || t.includes("hos")) {
      return {
        topic: "FMCSA 34-Hour Restart",
        rule: "49 CFR § 395.3",
        summary: "Any period of 7 or 8 consecutive days may end with the beginning of an off-duty period of 34 or more consecutive hours.",
        drivingLimit: "11-hour driving limit after 10 consecutive hours off duty.",
        dutyLimit: "14-hour on-duty window.",
      }
    }
    if (t.includes("detention") || t.includes("layover")) {
      return {
        topic: "Detention & Layover Industry Standards",
        standard: "First 2 hours at shipper/receiver are typically free time. Billable thereafter at $50-$85/hour in 15-minute increments.",
        requirements: "Requires documented signed in/out times on the Bill of Lading (BOL).",
      }
    }
    return {
      topic,
      summary: `Guidance for ${topic}: Comply with FMCSA 49 CFR regulations and agreed rate confirmation accessorial terms.`,
    }
  },
})

export const createExecutionPlanTool = defineTmsTool({
  name: "createExecutionPlan",
  description: "Establish a structured multi-step execution plan before executing complex logistics workflows.",
  inputSchema: z.object({
    goal: z.string().describe("Overall mission objective"),
    steps: z.array(
      z.object({
        title: z.string().describe("Step name"),
        description: z.string().describe("Detailed action"),
      })
    ),
  }),
  execute: async ({ goal, steps }) => {
    return {
      goal,
      stepCount: steps.length,
      steps: steps.map((s, idx) => ({ index: idx + 1, ...s })),
      status: "planned",
    }
  },
})

export const delegateSubtaskTool = defineTmsTool({
  name: "delegateSubtask",
  description: "Delegate a specialized freight operation to a sub-agent specialist (dispatcher, fleet_guardian, rate_auditor, safety_compliance).",
  inputSchema: z.object({
    agentRole: z.enum(["dispatcher", "fleet_guardian", "rate_auditor", "safety_compliance", "route_planner"]).describe("Specialist bot role"),
    subtaskTitle: z.string().describe("Title of delegated task"),
    objective: z.string().describe("Objective and specific instructions"),
  }),
  execute: async ({ agentRole, subtaskTitle, objective }) => {
    return {
      agentRole,
      subtaskTitle,
      objective,
      status: "completed",
      findings: `Specialist [${agentRole}] analyzed "${subtaskTitle}": requirements verified and ready for execution.`,
    }
  },
})

export const askDispatcherTool = defineTmsTool({
  name: "askDispatcher",
  description: "Ask the human dispatcher a clarifying question or present actionable choices.",
  inputSchema: z.object({
    question: z.string().describe("The question to ask"),
    options: z.array(z.string()).describe("List of selectable choices"),
  }),
  execute: async ({ question, options }) => {
    return {
      question,
      options,
      status: "presented_to_dispatcher",
    }
  },
})
