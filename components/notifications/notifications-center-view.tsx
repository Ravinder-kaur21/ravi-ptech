"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  Search,
  CheckCheck,
  Settings,
  Trash2,
  ExternalLink,
  Truck,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  Banknote,
  Users,
  AlertCircle,
  Clock,
  Laptop,
  Check,
  SlidersHorizontal,
} from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
} from "@/app/actions/notifications"
import { NotificationPreferencesDialog } from "@/components/notifications/notification-preferences-dialog"

export interface NotificationRecord {
  id: string
  organizationId: string
  userId?: string | null
  category: string
  event: string
  severity: string
  title: string
  message: string
  link?: string | null
  read: boolean
  readAt?: Date | string | null
  metadata?: any
  createdAt: Date | string
}

interface NotificationsCenterViewProps {
  initialNotifications: NotificationRecord[]
}

export function NotificationsCenterView({
  initialNotifications,
}: NotificationsCenterViewProps) {
  const router = useRouter()
  const [items, setItems] = React.useState<NotificationRecord[]>(initialNotifications)
  const [activeTab, setActiveTab] = React.useState<string>("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [prefsOpen, setPrefsOpen] = React.useState(false)

  // Browser desktop notification permission state
  const [browserPermission, setBrowserPermission] = React.useState<NotificationPermission | "unsupported">("default")

  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission)
    } else {
      setBrowserPermission("unsupported")
    }
  }, [])

  const handleRequestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported in this browser.")
      return
    }

    try {
      const perm = await Notification.requestPermission()
      setBrowserPermission(perm)
      if (perm === "granted") {
        toast.success("Desktop notifications enabled!")
        try {
          new Notification("Muvx TMS Desktop Alerts Enabled", {
            body: "You will now receive desktop notifications for dispatches, CDL warnings, and payments.",
            icon: "/favicon.ico",
          })
        } catch (e) {
          // Ignore sandbox errors
        }
      }
    } catch (err) {
      console.error("[NOTIFICATIONS] Permission request failed:", err)
    }
  }

  const unreadCount = React.useMemo(() => {
    return items.filter((n) => !n.read).length
  }, [items])

  const highSeverityCount = React.useMemo(() => {
    return items.filter((n) => n.severity === "error" || n.severity === "warn").length
  }, [items])

  // Mark single as read
  const handleMarkRead = async (id: string) => {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
    await markNotificationReadAction(id)
  }

  // Mark all as read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    setItems((prev) => prev.map((n) => ({ ...n, read: true })))
    toast.success("All notifications marked as read")
    await markAllNotificationsReadAction()
  }

  // Delete notification
  const handleDelete = async (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
    toast.success("Notification removed")
    await deleteNotificationAction(id)
  }

  // Filtered notifications
  const filteredNotifications = React.useMemo(() => {
    return items.filter((n) => {
      // Tab filter
      if (activeTab === "unread" && n.read) return false
      if (activeTab === "compliance" && n.category !== "compliance") return false
      if (activeTab === "billing" && n.category !== "invoice") return false
      if (activeTab === "ap" && n.category !== "expense" && n.category !== "settlement") return false
      if (activeTab === "loads" && n.category !== "load" && n.category !== "trip" && n.category !== "fleet") return false

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchTitle = n.title.toLowerCase().includes(q)
        const matchMsg = n.message.toLowerCase().includes(q)
        const matchCat = n.category.toLowerCase().includes(q)
        return matchTitle || matchMsg || matchCat
      }

      return true
    })
  }, [items, activeTab, searchQuery])

  // Group by date
  const groupedNotifications = React.useMemo(() => {
    const groups: { [key: string]: NotificationRecord[] } = {
      Today: [],
      Yesterday: [],
      "Earlier this week": [],
      Older: [],
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000
    const startOfWeek = startOfToday - 7 * 24 * 60 * 60 * 1000

    for (const n of filteredNotifications) {
      const time = new Date(n.createdAt).getTime()
      if (time >= startOfToday) {
        groups["Today"].push(n)
      } else if (time >= startOfYesterday) {
        groups["Yesterday"].push(n)
      } else if (time >= startOfWeek) {
        groups["Earlier this week"].push(n)
      } else {
        groups["Older"].push(n)
      }
    }

    return Object.entries(groups).filter(([_, list]) => list.length > 0)
  }, [filteredNotifications])

  return (
    <div className="space-y-6 w-full min-w-0">
      {/* ─── KPI SUMMARY HUD ─── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              Active Notifications
            </span>
            <Bell className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-brand-ink">
            {items.length}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Total operational events recorded
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              Unread Alerts
            </span>
            <AlertCircle className="size-4 text-brand-accent" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-brand-accent">
            {unreadCount}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Awaiting dispatcher review
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              High Priority & Actions
            </span>
            <ShieldAlert className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-serif font-bold text-amber-700">
            {highSeverityCount}
          </p>
          <p className="mt-1 text-xs text-brand-muted-soft">
            CDL warnings & overdue receivables
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-4 shadow-xs rounded-xl">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase font-semibold text-brand-muted-soft">
              Desktop Notifications
            </span>
            <Laptop className="size-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-brand-ink">
              {browserPermission === "granted" ? "Active" : "Disabled"}
            </p>
            {browserPermission !== "granted" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRequestBrowserPermission}
                className="h-7 text-xs px-2.5 rounded-full border-brand-accent text-brand-accent hover:bg-brand-accent-tint"
              >
                Enable
              </Button>
            )}
          </div>
          <p className="mt-1 text-xs text-brand-muted-soft">
            Native OS desktop notification alerts
          </p>
        </Card>
      </div>

      {/* ─── FILTERS & SEARCH TOOLBAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-brand-rule dark:border-zinc-800 p-0.5 h-8.5 rounded-lg flex-wrap">
            <TabsTrigger
              value="all"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
            >
              All Alerts
              <span className="font-mono text-[10px] text-brand-muted-soft px-1 ml-1 bg-black/5 rounded-full">
                {items.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="unread"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
            >
              Unread
              {unreadCount > 0 && (
                <span className="font-mono text-[10px] text-brand-accent font-semibold px-1.5 ml-1 bg-brand-accent-tint rounded-full">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="compliance"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
            >
              Safety & CDL
            </TabsTrigger>
            <TabsTrigger
              value="billing"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
            >
              Invoices & AR
            </TabsTrigger>
            <TabsTrigger
              value="ap"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
            >
              AP & Payroll
            </TabsTrigger>
            <TabsTrigger
              value="loads"
              className="text-xs px-3 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
            >
              Loads & Trips
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications..."
              className="h-8.5 pl-8.5 text-xs bg-brand-card border-brand-rule rounded-lg placeholder:text-brand-muted-soft"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-brand-muted-soft hover:text-brand-ink"
              >
                Clear
              </button>
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
            className="h-8.5 text-xs border-brand-rule bg-brand-card hover:bg-brand-cream-soft text-brand-ink shrink-0 gap-1.5 rounded-lg"
          >
            <CheckCheck className="size-3.5" />
            <span className="hidden sm:inline">Mark all read</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setPrefsOpen(true)}
            className="h-8.5 text-xs border-brand-rule bg-brand-card hover:bg-brand-cream-soft text-brand-ink shrink-0 gap-1.5 rounded-lg"
          >
            <Settings className="size-3.5" />
            <span className="hidden sm:inline">Preferences</span>
          </Button>
        </div>
      </div>

      {/* ─── GROUPED NOTIFICATIONS FEED ─── */}
      <Card className="border-brand-rule bg-brand-card overflow-hidden shadow-xs rounded-xl w-full min-w-0">
        {groupedNotifications.length === 0 ? (
          <div className="py-16 text-center text-brand-muted-soft flex flex-col items-center justify-center p-6">
            <div className="size-12 rounded-full bg-brand-accent-tint flex items-center justify-center mb-3">
              <Bell className="size-6 text-brand-accent" />
            </div>
            <p className="font-serif text-lg font-bold text-brand-ink">No notifications to display</p>
            <p className="text-xs text-brand-muted-soft max-w-sm mt-1">
              {searchQuery
                ? "Try adjusting your search criteria"
                : "Operational events, CDL compliance alerts, and invoice updates will automatically appear here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-brand-rule">
            {groupedNotifications.map(([dateGroup, groupItems]) => (
              <div key={dateGroup} className="space-y-0">
                {/* Date Group Header */}
                <div className="px-5 py-2.5 bg-brand-cream-soft/40 border-b border-brand-rule/60 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider font-semibold text-brand-muted-soft">
                    {dateGroup}
                  </span>
                  <span className="font-mono text-[10px] text-brand-muted-soft">
                    {groupItems.length} {groupItems.length === 1 ? "alert" : "alerts"}
                  </span>
                </div>

                {/* Items in group */}
                <div className="divide-y divide-brand-rule/60">
                  {groupItems.map((item) => {
                    const Icon = getCategoryIcon(item.category, item.severity)
                    const timeFormatted = new Date(item.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })

                    return (
                      <div
                        key={item.id}
                        className={`p-4 flex items-start justify-between gap-4 transition-colors hover:bg-brand-cream-soft/30 ${
                          !item.read ? "bg-brand-accent-tint/15" : ""
                        }`}
                      >
                        {/* Icon & Details */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div
                            className={`size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getSeverityBadge(
                              item.severity
                            )}`}
                          >
                            <Icon className="size-4.5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-xs text-brand-ink">
                                {item.title}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-[10px] font-mono capitalize border-brand-rule text-brand-muted-soft"
                              >
                                {item.category}
                              </Badge>
                              <span className="text-[11px] text-brand-muted-soft font-mono">
                                {timeFormatted}
                              </span>
                              {!item.read && (
                                <span className="size-2 rounded-full bg-brand-accent inline-block" />
                              )}
                            </div>

                            <p className="text-xs text-brand-muted-soft mt-1 leading-relaxed">
                              {item.message}
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {item.link && (
                            <Link
                              href={item.link}
                              onClick={() => {
                                if (!item.read) handleMarkRead(item.id)
                              }}
                              className="inline-flex items-center gap-1 text-xs font-mono font-medium text-brand-accent hover:underline px-2.5 py-1 rounded-md hover:bg-brand-accent-tint transition-colors"
                            >
                              <span>Open Record</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          )}

                          {!item.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkRead(item.id)}
                              className="h-7 px-2 text-[11px] text-brand-muted-soft hover:text-brand-ink rounded-md"
                              title="Mark as read"
                            >
                              <Check className="size-3.5 mr-1" />
                              Read
                            </Button>
                          )}

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(item.id)}
                            className="size-7 text-brand-muted-soft hover:text-red-600 hover:bg-red-50 rounded-md"
                            title="Delete alert"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </div>
  )
}

function getCategoryIcon(category: string, severity: string) {
  if (category === "compliance") {
    return severity === "error" || severity === "warn" ? ShieldAlert : ShieldCheck
  }
  if (category === "invoice") return Receipt
  if (category === "expense") return Receipt
  if (category === "settlement") return Banknote
  if (category === "load" || category === "trip" || category === "fleet") return Truck
  if (category === "team") return Users
  return AlertCircle
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "error":
      return "bg-red-50 text-red-600 border border-red-200"
    case "warn":
      return "bg-amber-50 text-amber-700 border border-amber-200"
    case "success":
      return "bg-emerald-50 text-emerald-700 border border-emerald-200"
    case "info":
    default:
      return "bg-brand-accent-tint text-brand-accent border border-brand-accent/20"
  }
}
