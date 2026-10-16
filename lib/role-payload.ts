/**
 * Role Permission Payload Builder
 *
 * Formats custom role metadata and grants into Better Auth's strict
 * z.record(z.string(), z.array(z.string())) schema, ensuring:
 * 1. Metadata keys (__label, __description, __clonedFrom, __grants, __revokes) are string[]
 * 2. Coarse Better Auth resource statements (load, trip, driver, truck, invoice, member, workspace)
 *    are automatically derived from the granular 130-key grants so native hasPermission passes.
 * 3. member: ["read"] is always included so reading workspace rosters and role templates never 403s.
 */

export function buildRolePermissionPayload(
  grants: string[],
  meta?: { label?: string; description?: string; clonedFrom?: string | null }
): Record<string, string[]> {
  const payload: Record<string, string[]> = {
    __grants: grants,
    __revokes: [],
    __label: [meta?.label ?? ""],
    __description: [meta?.description ?? ""],
    __clonedFrom: [meta?.clonedFrom ?? ""],
  }

  // Derive coarse Better Auth statements so BA's native hasPermission validator succeeds
  const loadsActions = new Set<string>()
  const tripActions = new Set<string>()
  const driverActions = new Set<string>()
  const truckActions = new Set<string>()
  const invoiceActions = new Set<string>()
  const memberActions = new Set<string>()
  const workspaceActions = new Set<string>()

  for (const k of grants) {
    if (k.startsWith("loads.view") || k === "loads.module") loadsActions.add("read")
    if (k === "loads.create") loadsActions.add("create")
    if (k === "loads.edit") loadsActions.add("update")
    if (k === "loads.delete" || k === "loads.cancel") loadsActions.add("delete")

    if (k.startsWith("drivers.view") || k === "drivers.module") driverActions.add("read")
    if (k === "drivers.create") driverActions.add("create")
    if (k.startsWith("drivers.edit")) driverActions.add("update")
    if (k === "drivers.delete") driverActions.add("delete")

    if (k.startsWith("fleet.view") || k === "fleet.module") truckActions.add("read")
    if (k === "fleet.create") truckActions.add("create")
    if (k.startsWith("fleet.edit")) truckActions.add("update")
    if (k === "fleet.delete") truckActions.add("delete")

    if (k.startsWith("invoices.view") || k === "invoices.module") invoiceActions.add("read")
    if (k === "invoices.create") invoiceActions.add("create")
    if (k.startsWith("invoices.edit")) invoiceActions.add("update")

    if (k.startsWith("users.view") || k === "users.module") memberActions.add("read")
    if (k === "users.invite") memberActions.add("create")
    if (k === "users.change_role" || k === "users.suspend" || k === "users.roles.manage") memberActions.add("update")
    if (k === "users.remove") memberActions.add("delete")

    if (k.startsWith("workspace.view") || k === "workspace.module" || k === "workspace.profile.view") workspaceActions.add("read")
    if (k === "workspace.profile.edit") workspaceActions.add("update")
  }

  // Every role in a workspace has member read by default
  memberActions.add("read")

  if (loadsActions.size > 0) payload.load = Array.from(loadsActions)
  if (tripActions.size > 0) payload.trip = Array.from(tripActions)
  if (driverActions.size > 0) payload.driver = Array.from(driverActions)
  if (truckActions.size > 0) payload.truck = Array.from(truckActions)
  if (invoiceActions.size > 0) payload.invoice = Array.from(invoiceActions)
  payload.member = Array.from(memberActions)
  if (workspaceActions.size > 0) payload.workspace = Array.from(workspaceActions)

  return payload
}
