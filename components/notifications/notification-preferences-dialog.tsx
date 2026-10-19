"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Settings,
  Bell,
  Truck,
  ShieldCheck,
  Receipt,
  Banknote,
  Users,
  Laptop,
  Mail,
  Loader2,
  CheckCircle2,
} from "lucide-react"
import { toast } from "sonner"
import {
  fetchNotificationPreferencesAction,
  updateNotificationPreferenceAction,
} from "@/app/actions/notifications"
import type { NotificationCategory } from "@/lib/notifications"

const CATEGORIES: Array<{
  id: NotificationCategory
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  {
    id: "load",
    label: "Loads & Dispatch",
    description: "New loads created, driver assignments, live transit legs, deliveries.",
    icon: Truck,
  },
  {
    id: "compliance",
    label: "Safety & Driver Compliance",
    description: "CDL 30-day expiration warnings, medical card renewals, DVIR logs.",
    icon: ShieldCheck,
  },
  {
    id: "invoice",
    label: "Customer Invoices & AR",
    description: "Invoices generated, overdue payments past Net 30, payment reconciliations.",
    icon: Receipt,
  },
  {
    id: "expense",
    label: "Accounts Payable & Expenses",
    description: "Driver trip expense receipts, fuel purchases, approvals and rejections.",
    icon: Receipt,
  },
  {
    id: "settlement",
    label: "Driver Payroll & Settlements",
    description: "Weekly settlement statement generation, carrier remittance releases.",
    icon: Banknote,
  },
  {
    id: "team",
    label: "Team & Workspace Members",
    description: "Invitations sent, accepted joins, role and permission updates.",
    icon: Users,
  },
]

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
  trigger,
}: {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  trigger?: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  const setIsOpen = isControlled ? onOpenChange! : setInternalOpen

  const [loading, setLoading] = React.useState(false)
  const [savingKey, setSavingKey] = React.useState<string | null>(null)
  const [preferences, setPreferences] = React.useState<
    Record<NotificationCategory, { inApp: boolean; browserPush: boolean; email: boolean }>
  >({} as any)

  React.useEffect(() => {
    if (isOpen) {
      setLoading(true)
      fetchNotificationPreferencesAction()
        .then((res) => {
          if (res.success && res.preferences) {
            setPreferences(res.preferences)
          }
        })
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  const handleToggle = async (
    category: NotificationCategory,
    channel: "inApp" | "browserPush" | "email",
    currentVal: boolean
  ) => {
    const newVal = !currentVal
    setSavingKey(`${category}-${channel}`)

    // Optimistic update
    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || { inApp: true, browserPush: true, email: false }),
        [channel]: newVal,
      },
    }))

    const res = await updateNotificationPreferenceAction({
      category,
      [channel]: newVal,
    })

    if (res.success) {
      toast.success(
        `${channel === "inApp" ? "In-app" : channel === "browserPush" ? "Desktop push" : "Email"} ${newVal ? "enabled" : "disabled"} for ${category}`
      )
    } else {
      toast.error("Failed to update preference")
      // Revert on failure
      setPreferences((prev) => ({
        ...prev,
        [category]: {
          ...(prev[category] || { inApp: true, browserPush: true, email: false }),
          [channel]: currentVal,
        },
      }))
    }
    setSavingKey(null)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger render={trigger as any} />}

      <DialogContent className="max-w-2xl bg-brand-card border-brand-rule p-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="p-5 border-b border-brand-rule bg-brand-cream-soft/40">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-accent-tint text-brand-accent">
              <Settings className="size-4" />
            </span>
            <DialogTitle className="font-serif text-xl text-brand-ink font-semibold">
              Notification Preferences
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-brand-muted-soft mt-1">
            Configure enterprise notification rules. Turn off categories you do not wish to receive in-app, via browser desktop push, or email.
          </DialogDescription>
        </DialogHeader>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-brand-muted-soft">
              <Loader2 className="size-6 animate-spin text-brand-accent" />
              <p className="text-xs">Loading preferences...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Table header for channels */}
              <div className="grid grid-cols-12 items-center text-[11px] font-mono uppercase font-semibold text-brand-muted-soft px-3 py-1 border-b border-brand-rule">
                <span className="col-span-6">Category / Event Scope</span>
                <span className="col-span-2 text-center flex items-center justify-center gap-1">
                  <Bell className="size-3 text-brand-muted-soft" /> In-App
                </span>
                <span className="col-span-2 text-center flex items-center justify-center gap-1">
                  <Laptop className="size-3 text-brand-muted-soft" /> Desktop
                </span>
                <span className="col-span-2 text-center flex items-center justify-center gap-1">
                  <Mail className="size-3 text-brand-muted-soft" /> Email
                </span>
              </div>

              {CATEGORIES.map((cat) => {
                const Icon = cat.icon
                const current = preferences[cat.id] || { inApp: true, browserPush: true, email: false }
                const isSavingThis = savingKey?.startsWith(cat.id)

                return (
                  <div
                    key={cat.id}
                    className="grid grid-cols-12 items-center p-3 rounded-xl hover:bg-brand-cream-soft/30 transition-colors border border-brand-rule/60 gap-2"
                  >
                    {/* Category Label & Desc */}
                    <div className="col-span-6 pr-2">
                      <div className="flex items-center gap-2">
                        <Icon className="size-4 text-brand-accent shrink-0" />
                        <span className="text-xs font-semibold text-brand-ink">{cat.label}</span>
                      </div>
                      <p className="text-[11px] text-brand-muted-soft mt-0.5 leading-snug line-clamp-2">
                        {cat.description}
                      </p>
                    </div>

                    {/* In-App Toggle */}
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={current.inApp}
                        onCheckedChange={() => handleToggle(cat.id, "inApp", current.inApp)}
                        disabled={isSavingThis}
                        className="data-[state=checked]:bg-brand-accent"
                      />
                    </div>

                    {/* Desktop Push Toggle */}
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={current.browserPush}
                        onCheckedChange={() => handleToggle(cat.id, "browserPush", current.browserPush)}
                        disabled={isSavingThis}
                        className="data-[state=checked]:bg-brand-accent"
                      />
                    </div>

                    {/* Email Toggle */}
                    <div className="col-span-2 flex justify-center">
                      <Switch
                        checked={current.email}
                        onCheckedChange={() => handleToggle(cat.id, "email", current.email)}
                        disabled={isSavingThis}
                        className="data-[state=checked]:bg-brand-accent"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-brand-rule bg-brand-cream-soft/20 flex items-center justify-between">
          <span className="text-[11px] text-brand-muted-soft">
            Preferences apply instantly across your Muvx sessions.
          </span>
          <Button
            size="sm"
            onClick={() => setIsOpen(false)}
            className="rounded-full bg-brand-ink text-brand-cream hover:bg-brand-ink-soft text-xs h-8 px-4"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
