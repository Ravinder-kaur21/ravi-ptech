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
  Layers,
  Sparkles,
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
import { BellButton } from "@/components/kokonutui/bell-button"
import {
  NotificationStack,
  type StackNotification,
} from "@/components/kokonutui/notification-stack"

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

  const handleTogglePush = async (nextSubscribed: boolean) => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported in this browser.")
      return
    }

    if (nextSubscribed && browserPermission !== "granted") {
      try {
        const perm = await Notification.requestPermission()
        setBrowserPermission(perm)
        if (perm === "granted") {
          toast.success("Desktop push alerts activated!")
          try {
            new Notification("Muvx TMS Desktop Alerts Enabled", {
              body: "You will receive desktop push alerts for load dispatches, CDL warnings, and payroll.",
              icon: "/favicon.ico",
            })
          } catch (e) {
            // sandbox fallback
          }
        } else if (perm === "denied") {
          toast.error("Notification permission was denied in your browser settings.")
        }
      } catch (err) {
        console.error("[NOTIFICATIONS] Permission request failed:", err)
      }
    } else if (!nextSubscribed) {
      toast.info("Turn off category rules in Notification Preferences below.")
      setPrefsOpen(true)
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

  // Convert top items to Kokonut UI NotificationStack format
  const stackItems: StackNotification[] = React.useMemo(() => {
    const sourceList = items.filter((n) => !n.read).length > 0
      ? items.filter((n) => !n.read).slice(0, 5)
      : items.slice(0, 4)

    return sourceList.map((item) => {
      const appName =
        item.category === "compliance"
          ? "Safety & DOT"
          : item.category === "invoice"
          ? "Billing & AR"
          : item.category === "expense" || item.category === "settlement"
          ? "Settlements & AP"
          : item.category === "load"
          ? "Dispatch Ops"
          : item.category === "fleet"
          ? "Fleet Units"
          : item.category === "team"
          ? "Team Admin"
          : "System Event"

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

  const handleDismissStackItem = (id: string) => {
    handleMarkRead(id)
  }

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
      {/* ─── EXACT DASHBOARD TASTE KPI CARDS ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Bell className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-ink">{items.length}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Active notifications</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">Total logged operational events</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <AlertCircle className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-brand-accent">{unreadCount}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Unread alerts</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {unreadCount === 0 ? "All caught up" : "Awaiting dispatcher review"}
          </p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-700">
              <ShieldAlert className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-amber-700">{highSeverityCount}</p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">High priority warnings</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">CDL expirations & overdues</p>
        </Card>

        <Card className="border-brand-rule bg-brand-card p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            </div>
          </div>
          <p className="font-serif text-3xl tracking-tight text-emerald-700">
            {browserPermission === "granted" ? "Active" : "Disabled"}
          </p>
          <p className="text-xs mt-0.5 text-brand-muted-soft">Desktop push alerts</p>
          <p className="text-[10px] mt-1 italic text-brand-muted-soft/70">
            {browserPermission === "granted" ? "Live OS notifications on" : "Click bell below to enable"}
          </p>
        </Card>
      </div>

      {/* ─── KOKONUT UI INTERACTIVE STACK & BELL SECTION ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Kokonut UI Notification Stack Card */}
        <Card className="lg:col-span-2 border-brand-rule bg-brand-card p-5 overflow-hidden flex flex-col justify-between">
          <div>
            <div className="border-b border-brand-rule pb-4 mb-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-serif text-xl text-brand-ink">Live Priority Stack</h2>
                  <Badge variant="outline" className="text-[10px] font-mono border-brand-rule text-brand-accent bg-brand-accent-tint">
                    Interactive Cards
                  </Badge>
                </div>
                <p className="text-xs mt-0.5 text-brand-muted-soft">
                  Flick or swipe horizontally to dismiss, or click to fan out all priority items.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllRead}
                  disabled={unreadCount === 0}
                  className="h-8 px-3 text-xs text-brand-muted-soft hover:text-brand-ink gap-1 rounded-lg"
                >
                  <CheckCheck className="size-3.5" />
                  Mark all read
                </Button>
              </div>
            </div>

            {/* Kokonut UI Stack Component */}
            <div className="py-2 flex justify-center">
              {stackItems.length > 0 ? (
                <NotificationStack
                  notifications={stackItems}
                  onDismiss={handleDismissStackItem}
                  className="w-full max-w-lg"
                />
              ) : (
                <div className="p-8 text-center text-brand-muted-soft">
                  <p className="text-sm font-medium text-brand-ink">No urgent stack alerts</p>
                  <p className="text-xs mt-1 text-brand-muted-soft">You are completely caught up with operational events.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 mt-3 border-t border-brand-rule/60 flex items-center justify-between text-xs text-brand-muted-soft">
            <span className="font-mono text-[11px]">
              {unreadCount} unread of {items.length} total events
            </span>
            <span className="font-mono text-[10px] italic">
              Powered by Kokonut UI Physics
            </span>
          </div>
        </Card>

        {/* Right 1 Col: Kokonut UI Bell Button & Rule Controls */}
        <div className="space-y-4">
          <Card className="border-brand-rule bg-brand-card p-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] mb-3 text-brand-muted-soft">
              Desktop Alerts & Sound
            </h3>

            <div className="p-4 rounded-xl bg-brand-cream-soft/40 border border-brand-rule flex flex-col items-center justify-center text-center space-y-3">
              {/* Kokonut UI Bell Button */}
              <BellButton
                variant="default"
                subscribed={browserPermission === "granted"}
                onSubscribedChange={handleTogglePush}
                count={items.length}
                label="Subscribe Push"
                subscribedLabel="Push Active"
                className="shadow-xs cursor-pointer"
              />

              <p className="text-xs text-brand-muted-soft max-w-xs leading-relaxed">
                Click bell to trigger native OS desktop notifications for incoming loads, urgent CDL expirations, and financial remittances.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-brand-rule/60 space-y-2">
              <Button
                variant="outline"
                onClick={() => setPrefsOpen(true)}
                className="w-full h-9 text-xs justify-start gap-2 border-brand-rule bg-brand-card hover:bg-brand-cream-soft text-brand-ink rounded-lg"
              >
                <SlidersHorizontal className="size-3.5 text-brand-accent" />
                <span>Turn Off Rules (Category Matrix)</span>
              </Button>
            </div>
          </Card>

          <Card className="border-brand-rule bg-brand-card p-5">
            <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.04em] mb-2 text-brand-muted-soft">
              Real-Time Situational Ledger
            </h3>
            <p className="text-xs text-brand-muted-soft leading-relaxed">
              Every system event—from dispatcher role updates and new CDL uploads to customer invoice remittances—is audited with multi-tenant isolation.
            </p>
          </Card>
        </div>
      </div>

      {/* ─── FILTERS & SEARCH TOOLBAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
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
            <span className="hidden sm:inline">Mark read</span>
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
