"use server"

import { revalidatePath } from "next/cache"
import { getSession } from "@/lib/dal"
import {
  getNotificationsForUser,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUserNotificationPreferences,
  updateUserNotificationPreference,
  syncSituationalAlerts,
  dispatchNotificationEvent,
  type NotificationCategory,
  type NotificationSeverity,
} from "@/lib/notifications"

export async function fetchNotificationsAction() {
  const session = await getSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { success: false, error: "No active workspace" }

  console.log(`[ACTIONS:NOTIFICATIONS] Fetching for user="${session.user.id}" org="${organizationId}"`)

  // Sync situational alerts first so active items (CDL expiry, overdue invoices) are updated
  await syncSituationalAlerts(organizationId)

  const data = await getNotificationsForUser({
    organizationId,
    userId: session.user.id,
    limit: 60,
  })

  return { success: true, ...data }
}

export async function markNotificationReadAction(id: string) {
  const session = await getSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { success: false, error: "No active workspace" }

  console.log(`[ACTIONS:NOTIFICATIONS] Marking read: id="${id}"`)
  const res = await markNotificationAsRead(id, organizationId)
  revalidatePath("/notifications")
  return res
}

export async function markAllNotificationsReadAction() {
  const session = await getSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { success: false, error: "No active workspace" }

  console.log(`[ACTIONS:NOTIFICATIONS] Marking all read for user="${session.user.id}"`)
  const res = await markAllNotificationsAsRead(organizationId, session.user.id)
  revalidatePath("/notifications")
  return res
}

export async function deleteNotificationAction(id: string) {
  const session = await getSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { success: false, error: "No active workspace" }

  console.log(`[ACTIONS:NOTIFICATIONS] Deleting: id="${id}"`)
  const res = await deleteNotification(id, organizationId)
  revalidatePath("/notifications")
  return res
}

export async function fetchNotificationPreferencesAction() {
  const session = await getSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { success: false, error: "No active workspace" }

  console.log(`[ACTIONS:NOTIFICATIONS] Fetching preferences for user="${session.user.id}"`)
  const prefs = await getUserNotificationPreferences(session.user.id, organizationId)
  return { success: true, preferences: prefs }
}

export async function updateNotificationPreferenceAction({
  category,
  inApp,
  browserPush,
  email,
}: {
  category: NotificationCategory
  inApp?: boolean
  browserPush?: boolean
  email?: boolean
}) {
  const session = await getSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { success: false, error: "No active workspace" }

  console.log(`[ACTIONS:NOTIFICATIONS] Updating preference category="${category}" user="${session.user.id}"`)
  const res = await updateUserNotificationPreference({
    userId: session.user.id,
    organizationId,
    category,
    inApp,
    browserPush,
    email,
  })

  revalidatePath("/notifications")
  return res
}

/**
 * Trigger a live custom notification event (used by tests, debug, or dispatch events).
 */
export async function triggerLiveNotificationAction({
  category,
  event,
  title,
  message,
  severity = "info",
  link,
}: {
  category: NotificationCategory
  event: string
  title: string
  message: string
  severity?: NotificationSeverity
  link?: string
}) {
  const session = await getSession()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  const organizationId = session.session.activeOrganizationId
  if (!organizationId) return { success: false, error: "No active workspace" }

  console.log(`[ACTIONS:NOTIFICATIONS] Dispatching custom notification event="${event}"`)
  const created = await dispatchNotificationEvent({
    organizationId,
    category,
    event,
    severity,
    title,
    message,
    link,
    metadata: { triggeredBy: session.user.email },
  })

  revalidatePath("/notifications")
  return { success: !!created, notification: created }
}
