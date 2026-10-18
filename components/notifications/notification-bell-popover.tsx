"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  CheckCheck,
  Settings,
  ExternalLink,
  Truck,
  ShieldAlert,
  ShieldCheck,
  Receipt,
  Banknote,
  Users,
  AlertCircle,
  Clock,
  Trash2,
  Check,
  Laptop,
  X,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  fetchNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
} from "@/app/actions/notifications"
import { NotificationPreferencesDialog } from "@/components/notifications/notification-preferences-dialog"
import { BellButton } from "@/components/kokonutui/bell-button"

export interface NotificationItem {
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

export function NotificationBellPopover() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [prefsOpen, setPrefsOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"all" | "unread" | "compliance" | "money" | "ops">("all")
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  // Browser desktop notification permission state
  const [browserPermission, setBrowserPermission] = React.useState<NotificationPermission | "unsupported">("default")
  const [bannerDismissed, setBannerDismissed] = React.useState(false)

  // Check browser notification permission on mount
  React.useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission)
    } else {
      setBrowserPermission("unsupported")
    }
  }, [])

  // Poll notifications periodically & on open
  const loadNotifications = React.useCallback(async () => {
    try {
      const res = await fetchNotificationsAction()
      if (res.success && "notifications" in res && res.notifications) {
        setNotifications(res.notifications as any)
        setUnreadCount(res.unreadCount || 0)
      }
    } catch (err) {
      console.error("[NOTIFICATION-BELL] Failed to load notifications:", err)
    }
  }, [])

  React.useEffect(() => {
    loadNotifications()
    // Poll every 45 seconds for background changes
    const timer = setInterval(loadNotifications, 45000)
    return () => clearInterval(timer)
  }, [loadNotifications])

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      loadNotifications()
    }
  }

  // Request browser notification permission
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
        // Test notification
        try {
          new Notification("Muvx TMS Desktop Alerts Enabled", {
            body: "You will now receive instant desktop alerts for dispatch updates, CDL warnings, and payments.",
            icon: "/favicon.ico",
          })
        } catch (e) {
          console.log("[NOTIFICATIONS] Desktop test notification dispatched")
        }
      } else {
        toast.info("Desktop notifications were disabled.")
      }
    } catch (err) {
      console.error("[NOTIFICATIONS] Permission request failed:", err)
    }
  }

  // Mark single notification read
  const handleMarkRead = async (e: React.MouseEvent, item: NotificationItem) => {
    e.stopPropagation()
    if (item.read) return

    // Optimistic
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    )
    setUnreadCount((c) => Math.max(0, c - 1))

    await markNotificationReadAction(item.id)
  }

  // Mark all read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    toast.success("All notifications marked as read")

    await markAllNotificationsReadAction()
  }

  // Delete notification
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const target = notifications.find((n) => n.id === id)
    if (target && !target.read) {
      setUnreadCount((c) => Math.max(0, c - 1))
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    await deleteNotificationAction(id)
  }

  // Click on a notification item
  const handleClickItem = async (item: NotificationItem) => {
    if (!item.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
      )
      setUnreadCount((c) => Math.max(0, c - 1))
      markNotificationReadAction(item.id)
    }
    setOpen(false)
    if (item.link) {
      router.push(item.link)
    }
  }

  // Filtered list
  const filteredNotifications = React.useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === "unread") return !n.read
      if (activeTab === "compliance") return n.category === "compliance"
      if (activeTab === "money") return n.category === "invoice" || n.category === "expense" || n.category === "settlement"
      if (activeTab === "ops") return n.category === "load" || n.category === "trip" || n.category === "fleet"
      return true
    })
  }, [notifications, activeTab])

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <button type="button" className="relative inline-flex items-center">
              <BellButton
                variant="icon"
                subscribed={unreadCount === 0}
                label="Notifications"
                subscribedLabel="Caught up"
                title="Notifications"
                className="size-9 h-9 w-9 p-0 rounded-full border border-brand-rule bg-brand-card hover:bg-brand-cream-soft text-brand-ink/90 cursor-pointer shadow-2xs flex items-center justify-center transition-all"
              />
              {unreadCount > 0 && (
                <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-4.5 h-4.5 px-1 rounded-full bg-brand-accent text-white font-mono text-[10px] font-bold shadow-xs animate-in zoom-in-50 duration-200">
                  <span className="absolute -inset-0.5 rounded-full bg-brand-accent/40 animate-ping" />
                  <span className="relative">{unreadCount > 99 ? "99+" : unreadCount}</span>
                </span>
              )}
            </button>
          }
        />

        {/* ─── Facebook-Style Rich Dropdown Popover ─── */}
        <PopoverContent
          align="end"
          sideOffset={8}
          className="w-[380px] sm:w-[420px] p-0 rounded-2xl border-brand-rule bg-brand-card shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="p-4 border-b border-brand-rule bg-brand-cream-soft/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-lg font-bold text-brand-ink">Notifications</h2>
              {unreadCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-brand-accent-tint text-brand-accent border-brand-accent/20 font-mono text-[10px] font-bold"
                >
                  {unreadCount} unread
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
                className="h-7 px-2 text-[11px] text-brand-muted-soft hover:text-brand-ink gap-1 rounded-lg"
                title="Mark all as read"
              >
                <CheckCheck className="size-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPrefsOpen(true)}
                className="size-7 text-brand-muted-soft hover:text-brand-ink rounded-lg"
                title="Notification preferences"
              >
                <Settings className="size-3.5" />
              </Button>
            </div>
          </div>

          {/* Desktop Notification Permission Prompt Banner */}
          {browserPermission === "default" && !bannerDismissed && (
            <div className="p-3 bg-brand-accent-tint/60 border-b border-brand-accent/20 flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 text-xs">
                <Laptop className="size-4 text-brand-accent shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-brand-ink text-[11px]">Enable desktop alerts?</p>
                  <p className="text-[10px] text-brand-muted-soft">
                    Get instant alerts when loads dispatch or driver CDLs expire.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleRequestBrowserPermission}
                  className="px-2 py-0.5 rounded-full bg-brand-accent text-white text-[10px] font-medium hover:bg-brand-accent-hover transition-colors"
                >
                  Enable
                </button>
                <button
                  onClick={() => setBannerDismissed(true)}
                  className="p-1 text-brand-muted-soft hover:text-brand-ink"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          )}

          {/* Tabs Filter Bar */}
          <div className="px-3 pt-2.5 pb-1 border-b border-brand-rule bg-brand-card">
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="bg-brand-cream-soft/60 border border-brand-rule/60 p-0.5 h-7.5 rounded-lg w-full justify-start overflow-x-auto">
                <TabsTrigger
                  value="all"
                  className="text-[11px] px-2.5 h-6.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="unread"
                  className="text-[11px] px-2.5 h-6.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all gap-1"
                >
                  Unread
                  {unreadCount > 0 && (
                    <span className="size-1.5 rounded-full bg-brand-accent inline-block" />
                  )}
                </TabsTrigger>
                <TabsTrigger
                  value="compliance"
                  className="text-[11px] px-2.5 h-6.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
                >
                  Compliance
                </TabsTrigger>
                <TabsTrigger
                  value="money"
                  className="text-[11px] px-2.5 h-6.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
                >
                  Billing & AP
                </TabsTrigger>
                <TabsTrigger
                  value="ops"
                  className="text-[11px] px-2.5 h-6.5 data-[state=active]:bg-brand-card data-[state=active]:text-brand-ink rounded-md transition-all"
                >
                  Loads
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable Notification Items List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-brand-rule/60">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center p-4">
                <div className="size-10 rounded-full bg-brand-cream-soft flex items-center justify-center mb-2 text-brand-muted-soft">
                  <Bell className="size-5" />
                </div>
                <p className="font-semibold text-xs text-brand-ink">No notifications</p>
                <p className="text-[11px] text-brand-muted-soft mt-0.5">
                  {activeTab === "unread"
                    ? "You're all caught up! No unread notifications."
                    : "No notifications found in this filter."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const Icon = getNotificationIcon(item.category, item.severity)
                const relativeTime = getRelativeTime(item.createdAt)

                return (
                  <div
                    key={item.id}
                    onClick={() => handleClickItem(item)}
                    className={`group relative p-3.5 hover:bg-brand-cream-soft/40 transition-colors cursor-pointer flex items-start gap-3 ${
                      !item.read ? "bg-brand-accent-tint/20" : ""
                    }`}
                  >
                    {/* Category Icon */}
                    <div
                      className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${getSeverityStyles(
                        item.severity
                      )}`}
                    >
                      <Icon className="size-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-brand-ink line-clamp-1">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-brand-muted-soft font-mono">
                          · {relativeTime}
                        </span>
                      </div>
                      <p className="text-[11px] text-brand-muted-soft mt-0.5 leading-snug line-clamp-2">
                        {item.message}
                      </p>

                      {item.link && (
                        <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-brand-accent font-medium">
                          <span>View details</span>
                          <ExternalLink className="size-2.5" />
                        </div>
                      )}
                    </div>

                    {/* Right action dots / buttons */}
                    <div className="absolute right-3 top-3.5 flex items-center gap-1">
                      {!item.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkRead(e, item)}
                          className="size-5 rounded-full flex items-center justify-center text-brand-accent hover:bg-brand-accent-tint"
                          title="Mark as read"
                        >
                          <span className="size-2 rounded-full bg-brand-accent" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, item.id)}
                        className="opacity-0 group-hover:opacity-100 size-6 rounded-md flex items-center justify-center text-brand-muted-soft hover:text-red-600 hover:bg-red-50 transition-opacity"
                        title="Delete notification"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer linking to dedicated notifications page */}
          <div className="p-3 border-t border-brand-rule bg-brand-cream-soft/20 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setOpen(false)
                setPrefsOpen(true)
              }}
              className="text-[11px] text-brand-muted-soft hover:text-brand-ink font-medium transition-colors"
            >
              Notification Rules
            </button>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="font-mono text-[11px] text-brand-accent hover:underline font-semibold flex items-center gap-1"
            >
              <span>View full center</span>
              <ExternalLink className="size-3" />
            </Link>
          </div>
        </PopoverContent>
      </Popover>

      {/* Preferences Dialog */}
      <NotificationPreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} />
    </>
  )
}

function getNotificationIcon(category: string, severity: string) {
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

function getSeverityStyles(severity: string) {
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

function getRelativeTime(dateInput: Date | string) {
  const date = new Date(dateInput)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 60) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return "Yesterday"
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}
