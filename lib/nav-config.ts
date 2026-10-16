/**
 * Muvx TMS — navigation config
 *
 * One source of truth for the sidebar, the command palette, the
 * header quick-create menu, and the dashboard section registry.
 *
 * Every entry declares:
 *   - a permission key that gates visibility
 *   - the href, label, icon, and group it belongs to
 *   - optional quick-create actions
 *
 * UI surfaces read this and filter by `can(perms, entry.requiresKey)`.
 * No role names appear here — only permission keys.
 */

import {
  LayoutDashboard,
  Truck,
  Map,
  Users,
  Receipt,
  Banknote,
  ClipboardList,
  TrendingUp,
  Bell,
  Settings,
  Plug,
  ShieldCheck,
  FileText,
  CreditCard,
  UserCog,
  Building2,
  KeyRound,
  History,
  type LucideIcon,
} from "lucide-react"

export type NavGroup = {
  id: "main" | "ops" | "money" | "compliance" | "team" | "settings"
  label: string
  items: NavItem[]
}

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Permission key that gates visibility. */
  requiresKey: string
  /** One-line description shown in tooltip + command palette. */
  hint?: string
  /** Optional keyboard shortcut (single letter). */
  shortcut?: string
  /** Stable id for keying and audit. */
  id: string
}

/** Sidebar groups. Each item is permission-gated. */
export const SIDEBAR_NAV: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        requiresKey: "workspace.profile.view",
        hint: "Your home for the workspace.",
      },
      {
        id: "notifications",
        label: "Notifications",
        href: "/notifications",
        icon: Bell,
        requiresKey: "workspace.profile.view",
        hint: "Status events, mentions, and alerts.",
      },
    ],
  },
  {
    id: "ops",
    label: "Operations",
    items: [
      {
        id: "loads",
        label: "Loads",
        href: "/loads",
        icon: Truck,
        requiresKey: "loads.module",
        hint: "The dispatch board. Create, assign, track.",
      },
      {
        id: "trips",
        label: "Trips",
        href: "/trips",
        icon: Map,
        requiresKey: "loads.module",
        hint: "Active trips and execution status.",
      },
      {
        id: "fleet",
        label: "Fleet & Equipment",
        href: "/fleet",
        icon: Truck,
        requiresKey: "fleet.module",
        hint: "Tractors, trailers, maintenance, fault codes.",
      },
      {
        id: "drivers",
        label: "Drivers",
        href: "/drivers",
        icon: Users,
        requiresKey: "drivers.module",
        hint: "Roster, pay, DQ files, invitations.",
      },
      {
        id: "customers",
        label: "Customers & Brokers",
        href: "/customers",
        icon: Building2,
        requiresKey: "customers.module",
        hint: "Counterparties, credit, contacts.",
      },
    ],
  },
  {
    id: "money",
    label: "Money",
    items: [
      {
        id: "invoices",
        label: "Invoices",
        href: "/invoices",
        icon: Receipt,
        requiresKey: "accounting.invoices.view_all",
        hint: "Customer invoices, factoring, AR aging.",
      },
      {
        id: "ap",
        label: "Accounts Payable",
        href: "/accounts-payable",
        icon: Receipt,
        requiresKey: "settlements.ap.view",
        hint: "Bills, fuel advances, lumper reimbursements.",
      },
      {
        id: "settlements",
        label: "Settlements",
        href: "/settlements",
        icon: Banknote,
        requiresKey: "settlements.module",
        hint: "Driver and carrier settlements.",
      },
      {
        id: "payroll",
        label: "Payroll",
        href: "/payroll",
        icon: ClipboardList,
        requiresKey: "settlements.module",
        hint: "Pay periods, deductions, W-2 / 1099.",
      },
    ],
  },
  {
    id: "compliance",
    label: "Compliance",
    items: [
      {
        id: "safety",
        label: "Safety & Compliance",
        href: "/safety",
        icon: ShieldCheck,
        requiresKey: "safety.module",
        hint: "HOS, DVIR, accidents, drug clearinghouse.",
      },
      {
        id: "documents",
        label: "Documents",
        href: "/documents",
        icon: FileText,
        requiresKey: "documents.module",
        hint: "BOL, POD, rate con, insurance cards.",
      },
      {
        id: "reports",
        label: "Reports",
        href: "/reports",
        icon: TrendingUp,
        requiresKey: "reports.module",
        hint: "Operational, financial, and safety reports.",
      },
    ],
  },
  {
    id: "team",
    label: "Team",
    items: [
      {
        id: "team",
        label: "Team & Members",
        href: "/settings/team",
        icon: UserCog,
        requiresKey: "users.module",
        hint: "Invite and manage workspace members.",
      },
      {
        id: "roles",
        label: "Roles & permissions",
        href: "/settings/roles",
        icon: KeyRound,
        requiresKey: "users.roles.manage",
        hint: "Starter and custom role presets.",
      },
      {
        id: "integrations",
        label: "Integrations",
        href: "/settings/integrations",
        icon: Plug,
        requiresKey: "workspace.profile.view",
        hint: "ELD, accounting, mapping, and rate providers.",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      {
        id: "workspace-settings",
        label: "Workspace",
        href: "/settings/workspace",
        icon: Settings,
        requiresKey: "workspace.module",
        hint: "Profile, branding, defaults.",
      },
      {
        id: "billing",
        label: "Billing",
        href: "/settings/billing",
        icon: CreditCard,
        requiresKey: "workspace.profile.view",
        hint: "Subscription and payment methods.",
      },
      {
        id: "audit",
        label: "Audit log",
        href: "/settings/audit",
        icon: History,
        requiresKey: "workspace.audit_log.view",
        hint: "Every change, every login, every action.",
      },
    ],
  },
]

/** Quick-create items shown in the header `+` dropdown. */
export type QuickAction = {
  id: string
  label: string
  href: string
  requiresKey: string
  icon: LucideIcon
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "new-load",
    label: "New load",
    href: "/loads/new",
    requiresKey: "loads.create",
    icon: Truck,
  },
  {
    id: "new-driver",
    label: "Invite driver",
    href: "/drivers/new",
    requiresKey: "drivers.invite",
    icon: Users,
  },
  {
    id: "new-customer",
    label: "New customer",
    href: "/customers/new",
    requiresKey: "customers.create",
    icon: Building2,
  },
  {
    id: "new-invoice",
    label: "New invoice",
    href: "/invoices/new",
    requiresKey: "accounting.invoices.create",
    icon: Receipt,
  },
  {
    id: "new-settlement",
    label: "New settlement",
    href: "/settlements/new",
    requiresKey: "settlements.create",
    icon: Banknote,
  },
]

/** Filter helper. */
export function filterNavByPermissions<T extends { requiresKey: string }>(
  items: T[],
  perms: Set<string>
): T[] {
  return items.filter((i) => perms.has(i.requiresKey))
}
