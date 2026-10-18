import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getSession } from "@/lib/dal"
import { getEffectivePermissions } from "@/lib/can"
import { ALL_TMS_TOOLS, type ToolContext } from "@/lib/copilot/tools"

/**
 * Model Context Protocol (MCP) Server for Muvx TMS.
 * Exposes all 33 enterprise TMS operational tools and data resources
 * to external MCP clients (Claude Desktop, Cursor, Antigravity, Windsurf, or custom services).
 */

function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, any> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape
    const properties: Record<string, any> = {}
    const required: string[] = []

    for (const [key, prop] of Object.entries(shape) as [string, any][]) {
      const isOptional =
        typeof prop.isOptional === "function" ? prop.isOptional() : false
      if (!isOptional && !(prop instanceof z.ZodDefault)) {
        required.push(key)
      }

      let typeName = "string"
      if (prop instanceof z.ZodNumber) typeName = "number"
      if (prop instanceof z.ZodBoolean) typeName = "boolean"
      if (prop instanceof z.ZodArray) typeName = "array"

      properties[key] = {
        type: typeName,
        description: prop.description || key,
      }

      if (prop instanceof z.ZodEnum) {
        properties[key].enum = (prop as any).options || (prop as any)._def?.values || []
      }
    }

    return {
      type: "object",
      properties,
      required: required.length > 0 ? required : undefined,
    }
  }

  return { type: "object", properties: {} }
}

/**
 * GET /api/mcp
 * Returns MCP Server metadata and tool discovery catalog.
 */
export async function GET() {
  const toolsCatalog = ALL_TMS_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    requiresApproval: !!t.requiresApproval,
    approvalReason: t.approvalReason,
    inputSchema: zodToJsonSchema(t.inputSchema),
  }))

  return NextResponse.json({
    name: "muvx-tms-mcp-server",
    version: "1.0.0",
    protocolVersion: "2024-11-05",
    description: "Muvx TMS Model Context Protocol (MCP) Server for Autonomous Logistics Operations",
    capabilities: {
      tools: {
        listChanged: false,
      },
      resources: {
        subscribe: false,
        listChanged: false,
      },
    },
    toolsCount: toolsCatalog.length,
    tools: toolsCatalog,
    resources: [
      {
        uri: "muvx://loads/active",
        name: "Active Freight Loads",
        description: "Stream of currently active freight loads across all regional corridors.",
        mimeType: "application/json",
      },
      {
        uri: "muvx://fleet/status",
        name: "Fleet & Driver Availability",
        description: "Live driver duty status, tractor units, and CDL expiration telemetry.",
        mimeType: "application/json",
      },
      {
        uri: "muvx://invoices/ar",
        name: "Accounts Receivable Overview",
        description: "Pending, sent, and overdue freight invoices with aging balances.",
        mimeType: "application/json",
      },
      {
        uri: "muvx://integrations/health",
        name: "Telematics & Connectors Health",
        description: "Connection latency and webhook health for Samsara, Motive, and DAT One.",
        mimeType: "application/json",
      },
    ],
  })
}

/**
 * POST /api/mcp
 * Handles official JSON-RPC 2.0 requests from MCP clients:
 * - `initialize`
 * - `tools/list`
 * - `tools/call`
 * - `resources/list`
 * - `resources/read`
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Unauthorized: MCP client requires an authenticated workspace session.",
          },
          id: null,
        },
        { status: 401 }
      )
    }

    const tenantId = session.session.activeOrganizationId
    if (!tenantId) {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: {
            code: -32002,
            message: "No active workspace: An organization context must be selected.",
          },
          id: null,
        },
        { status: 400 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const { jsonrpc, id, method, params } = body

    if (jsonrpc !== "2.0") {
      return NextResponse.json(
        {
          jsonrpc: "2.0",
          error: { code: -32600, message: "Invalid Request: jsonrpc must be '2.0'." },
          id: id ?? null,
        },
        { status: 400 }
      )
    }

    const perms = await getEffectivePermissions(session.user.id, tenantId)
    const toolCtx: ToolContext = {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name,
      tenantId,
      perms,
    }

    // ─── 1. INITIALIZE ───
    if (method === "initialize") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: {
            tools: { listChanged: false },
            resources: { subscribe: false, listChanged: false },
          },
          serverInfo: {
            name: "muvx-tms-mcp-server",
            version: "1.0.0",
          },
        },
      })
    }

    // ─── 2. TOOLS/LIST ───
    if (method === "tools/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          tools: ALL_TMS_TOOLS.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: zodToJsonSchema(t.inputSchema),
          })),
        },
      })
    }

    // ─── 3. TOOLS/CALL ───
    if (method === "tools/call") {
      const toolName = params?.name
      const toolArgs = params?.arguments || {}

      const targetTool = ALL_TMS_TOOLS.find((t) => t.name === toolName)
      if (!targetTool) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: { code: -32601, message: `Tool '${toolName}' not found.` },
        })
      }

      // Validate inputSchema
      const parseResult = targetTool.inputSchema.safeParse(toolArgs)
      if (!parseResult.success) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32602,
            message: `Invalid params for '${toolName}': ${parseResult.error.message}`,
          },
        })
      }

      // Execute tool with full tenant context and audit logging
      try {
        const output = await targetTool.execute(parseResult.data, toolCtx)
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            content: [
              {
                type: "text",
                text: JSON.stringify(output, null, 2),
              },
            ],
          },
        })
      } catch (err: any) {
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          error: {
            code: -32000,
            message: `Execution failed: ${err?.message || "Internal error"}`,
          },
        })
      }
    }

    // ─── 4. RESOURCES/LIST ───
    if (method === "resources/list") {
      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        result: {
          resources: [
            {
              uri: "muvx://loads/active",
              name: "Active Freight Loads",
              mimeType: "application/json",
            },
            {
              uri: "muvx://fleet/status",
              name: "Fleet Status",
              mimeType: "application/json",
            },
            {
              uri: "muvx://invoices/ar",
              name: "Accounts Receivable",
              mimeType: "application/json",
            },
            {
              uri: "muvx://integrations/health",
              name: "Integrations Health",
              mimeType: "application/json",
            },
          ],
        },
      })
    }

    // ─── 5. RESOURCES/READ ───
    if (method === "resources/read") {
      const uri = params?.uri
      if (uri === "muvx://loads/active") {
        const loadsTool = ALL_TMS_TOOLS.find((t) => t.name === "queryLoads")
        const data = await loadsTool?.execute({ status: "available", limit: 20 }, toolCtx)
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          },
        })
      }

      if (uri === "muvx://fleet/status") {
        const fleetTool = ALL_TMS_TOOLS.find((t) => t.name === "getFleetStatus")
        const data = await fleetTool?.execute({ statusFilter: "all" }, toolCtx)
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          },
        })
      }

      if (uri === "muvx://invoices/ar") {
        const invTool = ALL_TMS_TOOLS.find((t) => t.name === "queryInvoices")
        const data = await invTool?.execute({ status: "all", limit: 20 }, toolCtx)
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          },
        })
      }

      if (uri === "muvx://integrations/health") {
        const intTool = ALL_TMS_TOOLS.find((t) => t.name === "checkIntegrations")
        const data = await intTool?.execute({}, toolCtx)
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: {
            contents: [
              {
                uri,
                mimeType: "application/json",
                text: JSON.stringify(data, null, 2),
              },
            ],
          },
        })
      }

      return NextResponse.json({
        jsonrpc: "2.0",
        id,
        error: { code: -32602, message: `Resource '${uri}' not recognized.` },
      })
    }

    return NextResponse.json({
      jsonrpc: "2.0",
      id,
      error: { code: -32601, message: `Method '${method}' not implemented.` },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message: `Internal server error: ${error?.message || "Unknown error"}` },
        id: null,
      },
      { status: 500 }
    )
  }
}
