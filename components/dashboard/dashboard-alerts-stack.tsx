"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowUpRight, Bell, ShieldAlert, ShieldCheck, Truck, Receipt, Banknote, Users, AlertCircle } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  NotificationStack,
  type StackNotification,
} from "@/components/kokonutui/notification-stack"
import { markNotificationReadAction } from "@/app/actions/notifications"

interface DashboardAlertsStackProps {
  notifications: Array<{
    id: string
    category: string
    severity: string
    title: string
    message: string
    createdAt: Date | string
    read: boolean
  }>
}

export function DashboardAlertsStack({ notifications }: DashboardAlertsStackProps) {
  const [items, setItems] = React.useState(notifications)

  const stackItems: StackNotification[] = React.useMemo(() => {
    const list = items.slice(0, 4)
    if (list.length === 0) {
      return [
        {
          id: "welcome-system",
          app: "System Fleet",
          title: "All Systems Operational",
          body: "Fleet tracking, HOS compliance, and dispatch lines running normally.",
          time: "now",
          icon: (
            <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-2xs">
              <ShieldCheck className="size-4" />
            </span>
          ),
        },
      ]
    }

    return list.map((item) => {
      const appName =
        item.category === "compliance"
          ? "Safety & DOT"
          : item.category === "invoice"
          ? "Billing & AR"
          : item.category === "expense" || item.category === "settlement"
          ? "Settlements"
          : item.category === "load"
          ? "Dispatch Ops"
          : item.category === "fleet"
          ? "Equipment"
          : item.category === "team"
          ? "Workspace"
          : "Fleet Alert"

      const iconBg =
        item.severity === "error"
          ? "bg-red-500"
          : item.severity === "warn"
          ? "bg-[#d9622b]"
          : item.category === "compliance"
          ? "bg-amber-600"
          : item.category === "invoice"
          ? "bg-blue-600"
          : "bg-zinc-800"

      const IconComponent = getCategoryIcon(item.category, item.severity)

      const timeDiffMs = Date.now() - new Date(item.createdAt).getTime()
      const mins = Math.floor(timeDiffMs / 60000)
      const hours = Math.floor(mins / 60)
      const days = Math.floor(hours / 24)
      const relativeTime =
        mins < 1 ? "now" : mins < 60 ? `${mins}m` : hours < 24 ? `${hours}h` : `${days}d`

      return {
        id: item.id,
        app: appName,
        title: item.title,
        body: item.message,
        time: relativeTime,
        icon: (
          <span className={`flex size-8 items-center justify-center rounded-lg ${iconBg} text-white shadow-2xs`}>
            <IconComponent className="size-4" />
          </span>
        ),
      }
    })
  }, [items])

  const handleDismiss = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (id !== "welcome-system") {
      markNotificationReadAction(id).catch(console.error)
    }
  }

  return (
    <Card className="border-brand-rule bg-brand-card p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] text-brand-muted-soft">
          Live Fleet Alerts
        </h3>
        <Link
          href="/notifications"
          className="text-xs text-brand-accent hover:underline flex items-center gap-1 font-medium"
        >
          <span>All alerts</span>
          <ArrowUpRight className="size-3" />
        </Link>
      </div>

      <div className="py-1">
        <NotificationStack
          notifications={stackItems}
          onDismiss={handleDismiss}
          className="w-full"
        />
      </div>
    </Card>
  )
}

function getCategoryIcon(category: string, severity: string) {
  if (category === "compliance") {
    return severity === "error" || severity === "warn" ? ShieldAlert : ShieldCheck
  }
  if (category === "invoice" || category === "expense") return Receipt
  if (category === "settlement") return Banknote
  if (category === "load" || category === "trip" || category === "fleet") return Truck
  if (category === "team") return Users
  return AlertCircle
}
