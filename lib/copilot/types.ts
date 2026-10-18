import { z } from "zod"

export interface ToolContext {
  userId: string
  userEmail: string
  userName?: string | null
  tenantId: string
  perms: Set<string>
}

/**
 * Universal Tool Definition for Muvx Copilot and MCP Protocol.
 * Gated by session permissions and human-in-the-loop approvals.
 */
export interface TmsToolDef<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = any> {
  name: string
  description: string
  inputSchema: TInput
  requiresApproval?: boolean
  approvalReason?: string
  requiredPermissions?: string[]
  execute: (input: z.infer<TInput>, ctx: ToolContext) => Promise<TOutput>
}

export function defineTmsTool<TInput extends z.ZodTypeAny, TOutput = any>(
  def: TmsToolDef<TInput, TOutput>
): TmsToolDef<TInput, TOutput> {
  return def
}

/**
 * Validates if the authenticated user's session possesses the required permission(s).
 * Supports fallback to alias keys (e.g. accounting.invoices.create vs invoices.create).
 */
export function hasPermission(ctx: ToolContext, keys: string | string[]): boolean {
  const keyList = Array.isArray(keys) ? keys : [keys]
  return keyList.some((k) => ctx.perms.has(k))
}

export function permissionDeniedResult(keys: string | string[]) {
  const keyStr = Array.isArray(keys) ? keys.join(" or ") : keys
  return {
    success: false,
    error: `Permission Denied: Your current session lacks the required '${keyStr}' permission.`,
  }
}
