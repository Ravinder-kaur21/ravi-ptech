"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Truck,
  Map,
  Users,
  Receipt,
  Banknote,
  ClipboardList,
  TrendingUp,
  Settings,
  CreditCard,
  UserCog,
  Bell,
  Plus,
  type LucideIcon,
} from "lucide-react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"

type NavEntry = {
  label: string
  href: string
  icon: LucideIcon
  shortcut?: string
  group: "Pages" | "Actions" | "Account"
}

const ENTRIES: NavEntry[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Pages" },
  { label: "Loads", href: "/loads", icon: Truck, group: "Pages" },
  { label: "Trips", href: "/trips", icon: Map, group: "Pages" },
  { label: "Fleet", href: "/fleet", icon: Truck, group: "Pages" },
  { label: "Drivers", href: "/drivers", icon: Users, group: "Pages" },
  { label: "Invoices", href: "/invoices", icon: Receipt, group: "Pages" },
  { label: "Accounts Payable", href: "/accounts-payable", icon: Receipt, group: "Pages" },
  { label: "Carrier Pay", href: "/carrier-pay", icon: Banknote, group: "Pages" },
  { label: "Payroll", href: "/payroll", icon: ClipboardList, group: "Pages" },
  { label: "Reports", href: "/reports", icon: TrendingUp, group: "Pages" },
  { label: "Create new load", href: "/loads/new", icon: Plus, shortcut: "C", group: "Actions" },
  { label: "Notifications", href: "/notifications", icon: Bell, group: "Account" },
  { label: "Members", href: "/settings/members", icon: UserCog, group: "Account" },
  { label: "Settings", href: "/settings", icon: Settings, group: "Account" },
  { label: "Billing", href: "/settings/billing", icon: CreditCard, group: "Account" },
]

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const router = useRouter()
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {(["Pages", "Actions", "Account"] as const).map((group, i) => (
          <React.Fragment key={group}>
            {i > 0 && <CommandSeparator />}
            <CommandGroup heading={group}>
              {ENTRIES.filter((e) => e.group === group).map((entry) => (
                <CommandItem
                  key={entry.href}
                  value={`${entry.label} ${entry.href}`}
                  onSelect={() => {
                    onOpenChange(false)
                    router.push(entry.href)
                  }}
                >
                  <entry.icon className="size-4 text-brand-muted-soft" />
                  <span>{entry.label}</span>
                  {entry.shortcut && (
                    <CommandShortcut>{entry.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
