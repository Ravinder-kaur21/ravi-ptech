import { redirect } from "next/navigation"
import { Bell } from "lucide-react"
import { getSession } from "@/lib/dal"
import {
  getNotificationsForUser,
  syncSituationalAlerts,
} from "@/lib/notifications"
import { NotificationsCenterView } from "@/components/notifications/notifications-center-view"

export const instant = false

export default async function NotificationsPage() {
  const session = await getSession()
  if (!session?.user) redirect("/login")
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) redirect("/onboarding")

  // Sync active situational alerts (CDL expirations, overdue invoices, AP approvals)
  await syncSituationalAlerts(tenantId)

  // Fetch initial notifications
  const data = await getNotificationsForUser({
    organizationId: tenantId,
    userId: session.user.id,
    limit: 100,
  })

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto w-full min-w-0">
      {/* ─── STUDIO HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl tracking-tight text-brand-ink">
            Operational <span className="italic text-brand-accent">Notifications</span>
          </h1>
          <p className="mt-1 text-sm text-brand-muted-soft">
            Enterprise situational awareness, dispatch events, CDL compliance warnings, and financial milestones.
          </p>
        </div>
      </div>

      {/* ─── LIVE NOTIFICATIONS CONSOLE ─── */}
      <NotificationsCenterView initialNotifications={data.notifications as any} />
    </div>
  )
}
