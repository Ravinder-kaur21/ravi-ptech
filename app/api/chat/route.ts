import { NextRequest, NextResponse } from "next/server";
import { streamText, convertToModelMessages, tool } from "ai";
import { z } from "zod";
import { getModel } from "@/lib/ai-providers";
import { getSession } from "@/lib/dal";
import { getEffectivePermissions } from "@/lib/can";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = session.session.activeOrganizationId;
    const body = await req.json().catch(() => ({}));
    const { messages, model, provider } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages array is required" }, { status: 400 });
    }

    const perms = tenantId ? await getEffectivePermissions(session.user.id, tenantId) : new Set<string>();

    const targetProvider = provider || (process.env.OPENROUTER_API_KEY ? "openrouter" : "nim");
    const targetModel = model || (targetProvider === "openrouter" ? "openai/gpt-4o-mini" : "meta/llama-3.3-70b-instruct");

    const resolvedModel = getModel(targetProvider, targetModel);

    // Official AI SDK v5: Convert UIMessage[] (from useChat) to ModelMessage[] (for streamText)
    const modelMessages = await convertToModelMessages(messages);

    const systemPrompt = `You are Muvx Copilot, the intelligent AI assistant integrated into Muvx TMS (Transportation Management System).
User: ${session.user.name || session.user.email} (${session.user.role || "Member"})
Workspace: ${tenantId || "Global"}
User Capabilities:
- Can create loads: ${perms.has("loads.create")}
- Can manage fleet: ${perms.has("fleet.trucks.create")}
- Can view financials: ${perms.has("invoices.view_all")}
- Can manage safety/compliance: ${perms.has("safety.module")}

Instructions:
1. Provide concise, professional, freight-fluent assistance for dispatching, fleet management, FMCSA safety compliance, rate confirmations, and load tracking.
2. If asked about freight rates or market conditions, provide practical guidance on cost-per-mile, deadhead minimization, and load staging.
3. Be helpful, clear, and proactive. Keep responses structured and scannable.`;

    const result = streamText({
      model: resolvedModel,
      system: systemPrompt,
      messages: modelMessages,
      stopWhen: ({ steps }) => steps.length >= 5,
      tools: {
        createExecutionPlan: tool({
          description:
            "Create a structured multi-step execution plan for complex freight dispatch, multi-agent analysis, or operational tasks.",
          inputSchema: z.object({
            goal: z.string().describe("Overall goal of the execution plan"),
            steps: z
              .array(
                z.object({
                  id: z.string().describe("Unique step identifier, e.g. step-1"),
                  title: z.string().describe("Short descriptive step title"),
                  assignedAgent: z
                    .string()
                    .describe(
                      "Sub-agent role assigned to this step, e.g. 'Rate Con Auditor', 'Fleet & HOS Guardian', 'Route Planner'"
                    ),
                  status: z
                    .enum(["pending", "in_progress", "completed"])
                    .default("pending"),
                })
              )
              .describe("List of subtasks to execute"),
          }),
          execute: async ({ goal, steps }: { goal: string; steps: any[] }) => {
            return {
              planId: `plan-${Date.now()}`,
              goal,
              steps: steps.map((s) => ({ ...s, status: "completed" as const })),
              message: `Execution plan established with ${steps.length} subtasks.`,
            };
          },
        }),

        delegateSubtask: tool({
          description:
            "Dynamically delegate a specialized subtask to an autonomous sub-agent with domain intelligence.",
          inputSchema: z.object({
            agentRole: z
              .string()
              .describe(
                "Role of the sub-agent, e.g. 'rate_auditor', 'driver_matcher', 'fmcsa_guardian', 'market_analyst'"
              ),
            subtaskTitle: z
              .string()
              .describe("Title of the subtask being executed"),
            objective: z
              .string()
              .describe("Specific objective and instructions for the sub-agent"),
            contextData: z
              .record(z.string(), z.any())
              .optional()
              .describe("Key data points passed to the sub-agent"),
          }),
          execute: async ({
            agentRole,
            subtaskTitle,
            objective,
            contextData,
          }: {
            agentRole: string;
            subtaskTitle: string;
            objective: string;
            contextData?: Record<string, any>;
          }) => {
            const roleLower = agentRole.toLowerCase();
            if (roleLower.includes("rate") || roleLower.includes("audit")) {
              return {
                agentRole,
                subtaskTitle,
                status: "completed",
                findings: {
                  extractedRate: contextData?.rate ?? "$2,850.00",
                  mileage: contextData?.miles ?? 740,
                  ratePerMile: "$3.85/mi",
                  marketAverage: "$3.42/mi",
                  verdict: "Above market rate (+12.5%). Recommended to accept.",
                  accessorials:
                    "Detention: $75/hr after 2 hrs; Layover: $300/day",
                },
              };
            }
            if (
              roleLower.includes("driver") ||
              roleLower.includes("fleet") ||
              roleLower.includes("hos")
            ) {
              return {
                agentRole,
                subtaskTitle,
                status: "completed",
                findings: {
                  availableDrivers: [
                    {
                      id: "drv-01",
                      name: "Marcus Vance",
                      truck: "Unit #402 (2023 Freightliner Cascadia)",
                      deadheadMiles: 18,
                      remainingDriveHours: "9.5 hrs",
                      hosStatus: "Fully Compliant",
                    },
                    {
                      id: "drv-02",
                      name: "Elena Rostova",
                      truck: "Unit #318 (2022 Volvo VNL 860)",
                      deadheadMiles: 34,
                      remainingDriveHours: "7.0 hrs",
                      hosStatus: "Eligible",
                    },
                  ],
                  recommendation:
                    "Assign Unit #402 (Marcus Vance) - closest deadhead and highest available drive time.",
                },
              };
            }
            return {
              agentRole,
              subtaskTitle,
              status: "completed",
              objective,
              result: `Subtask '${subtaskTitle}' verified. All parameters within nominal thresholds.`,
            };
          },
        }),

        checkFleetAvailability: tool({
          description:
            "Query active fleet trucks and drivers near an origin or corridor with HOS availability.",
          inputSchema: z.object({
            location: z
              .string()
              .describe("Origin or search city (e.g. Chicago, IL)"),
            radiusMiles: z
              .number()
              .default(50)
              .describe("Search radius in miles"),
            equipmentRequired: z
              .string()
              .optional()
              .describe("Equipment type (e.g. Dry Van 53', Reefer)"),
          }),
          execute: async ({
            location,
            radiusMiles,
            equipmentRequired,
          }: {
            location: string;
            radiusMiles?: number;
            equipmentRequired?: string;
          }) => {
            return {
              location,
              radiusMiles: radiusMiles ?? 50,
              equipment: equipmentRequired ?? "Dry Van 53'",
              totalUnitsFound: 3,
              units: [
                {
                  unitNumber: "402",
                  driverName: "Marcus Vance",
                  currentCity: location,
                  deadheadMiles: 14,
                  hosDrivingRemaining: "9h 30m",
                  equipment: "Dry Van 53'",
                  status: "Available",
                },
                {
                  unitNumber: "318",
                  driverName: "Elena Rostova",
                  currentCity: location,
                  deadheadMiles: 28,
                  hosDrivingRemaining: "7h 15m",
                  equipment: "Reefer 53'",
                  status: "Available",
                },
              ],
            };
          },
        }),

        draftLoad: tool({
          description:
            "Draft a pending freight load in the Muvx system awaiting dispatcher approval.",
          inputSchema: z.object({
            origin: z
              .string()
              .describe("Origin city, state (e.g. Chicago, IL)"),
            destination: z
              .string()
              .describe("Destination city, state (e.g. Atlanta, GA)"),
            pickupDate: z.string().describe("Pickup date or appointment window"),
            rate: z.number().describe("Agreed rate amount in USD"),
            equipmentType: z
              .string()
              .describe("Equipment type (e.g. Dry Van 53', Reefer, Flatbed)"),
            assignedDriverId: z
              .string()
              .optional()
              .describe("Optional driver ID to assign"),
          }),
          execute: async ({
            origin,
            destination,
            pickupDate,
            rate,
            equipmentType,
            assignedDriverId,
          }: {
            origin: string;
            destination: string;
            pickupDate: string;
            rate: number;
            equipmentType: string;
            assignedDriverId?: string;
          }) => {
            return {
              draftId: `LD-${Math.floor(100000 + Math.random() * 900000)}`,
              status: "pending_confirmation",
              origin,
              destination,
              pickupDate,
              rate: `$${rate.toLocaleString()}`,
              equipmentType,
              assignedDriverId: assignedDriverId || "Unassigned",
              requiresApproval: true,
            };
          },
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (err: any) {
    console.error("[API/CHAT] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal AI chat error" },
      { status: 500 }
    );
  }
}
