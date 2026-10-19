/**
 * Muvx TMS — Enterprise Notifications & Event Dispatcher
 *
 * Central engine for dispatching, logging, collecting, and managing
 * in-app, browser push, and compliance notifications.
 *
 * Every event is logged to the console with [NOTIFICATIONS] tags
 * and recorded in the database.
 */

import { eq, and, or, isNull, desc, sql, lte, gte } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { db } from "@/lib/db"
import {
  notification,
  notificationPreference,
  driver,
  invoice,
  apExpense,
  load,
  user as userTable,
} from "@/lib/schema"

export type NotificationCategory =
  | "load"
  | "trip"
  | "invoice"
  | "expense"
  | "settlement"
  | "compliance"
  | "fleet"
  | "team"
  | "system"

export type NotificationSeverity = "info" | "success" | "warn" | "error"

export interface DispatchNotificationParams {
  organizationId: string
  userId?: string | null
  category: NotificationCategory
  event: string
  severity?: NotificationSeverity
  title: string
  message: string
  link?: string | null
  metadata?: Record<string, unknown>
}

/**
 * Dispatch an event to the notification engine.
 * Checks preferences, logs to console, and inserts record.
 */
export async function dispatchNotificationEvent({
  organizationId,
  userId = null,
  category,
  event,
  severity = "info",
  title,
  message,
  link = null,
  metadata = {},
}: DispatchNotificationParams) {
  const timestamp = new Date()
  console.log(
    `[NOTIFICATIONS] 🔔 [${category.toUpperCase()}] event="${event}" severity="${severity}" title="${title}" org="${organizationId}" user="${userId ?? "ALL"}"`
  )

  try {
    // 1. Check user preferences if a specific user is targeted
    if (userId) {
      const [pref] = await db
        .select()
        .from(notificationPreference)
        .where(
          and(
            eq(notificationPreference.userId, userId),
            eq(notificationPreference.organizationId, organizationId),
            eq(notificationPreference.category, category)
          )
        )
        .limit(1)

      if (pref && !pref.inApp) {
        console.log(
          `[NOTIFICATIONS] 🔕 In-app notification suppressed for user="${userId}" in category="${category}" by preference.`
        )
        return null
      }
    }

    // 2. Insert notification row
    const id = randomUUID()
    const [created] = await db
      .insert(notification)
      .values({
        id,
        organizationId,
        userId,
        category,
        event,
        severity,
        title,
        message,
        link,
        read: false,
        metadata,
        createdAt: timestamp,
      })
      .returning()

    console.log(`[NOTIFICATIONS] ✅ Notification stored with id="${id}"`)
    return created
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Failed to dispatch notification:`, err)
    return null
  }
}

/**
 * Fetch notifications for a given user in their active organization.
 * Includes both user-specific and organization-wide broadcasts.
 */
export async function getNotificationsForUser({
  organizationId,
  userId,
  limit = 50,
}: {
  organizationId: string
  userId: string
  limit?: number
}) {
  console.log(`[NOTIFICATIONS] Fetching notifications for org="${organizationId}" user="${userId}" limit=${limit}`)

  try {
    const rows = await db
      .select()
      .from(notification)
      .where(
        and(
          eq(notification.organizationId, organizationId),
          or(eq(notification.userId, userId), isNull(notification.userId))
        )
      )
      .orderBy(desc(notification.createdAt))
      .limit(limit)

    const unreadCount = rows.filter((r) => !r.read).length
    console.log(`[NOTIFICATIONS] Found ${rows.length} notifications (${unreadCount} unread)`)

    return {
      notifications: rows,
      unreadCount,
    }
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Error querying notifications:`, err)
    return { notifications: [], unreadCount: 0 }
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(id: string, organizationId: string) {
  console.log(`[NOTIFICATIONS] Marking notification id="${id}" as read`)
  try {
    await db
      .update(notification)
      .set({ read: true, readAt: new Date() })
      .where(and(eq(notification.id, id), eq(notification.organizationId, organizationId)))
    return { success: true }
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Error marking notification read:`, err)
    return { success: false, error: "Failed to mark notification as read" }
  }
}

/**
 * Mark all notifications as read for a user in their active organization.
 */
export async function markAllNotificationsAsRead(organizationId: string, userId: string) {
  console.log(`[NOTIFICATIONS] Marking ALL notifications as read for org="${organizationId}" user="${userId}"`)
  try {
    await db
      .update(notification)
      .set({ read: true, readAt: new Date() })
      .where(
        and(
          eq(notification.organizationId, organizationId),
          or(eq(notification.userId, userId), isNull(notification.userId)),
          eq(notification.read, false)
        )
      )
    return { success: true }
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Error marking all notifications read:`, err)
    return { success: false, error: "Failed to mark all as read" }
  }
}

/**
 * Clear/Delete a single notification.
 */
export async function deleteNotification(id: string, organizationId: string) {
  console.log(`[NOTIFICATIONS] Deleting notification id="${id}"`)
  try {
    await db
      .delete(notification)
      .where(and(eq(notification.id, id), eq(notification.organizationId, organizationId)))
    return { success: true }
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Error deleting notification:`, err)
    return { success: false, error: "Failed to delete notification" }
  }
}

/**
 * Read notification preferences for a user in an organization.
 */
export async function getUserNotificationPreferences(userId: string, organizationId: string) {
  console.log(`[NOTIFICATIONS] Reading preferences for user="${userId}" org="${organizationId}"`)
  try {
    const prefs = await db
      .select()
      .from(notificationPreference)
      .where(
        and(
          eq(notificationPreference.userId, userId),
          eq(notificationPreference.organizationId, organizationId)
        )
      )

    // Build map with defaults for any category not explicitly configured
    const defaultCategories: NotificationCategory[] = [
      "load",
      "trip",
      "invoice",
      "expense",
      "settlement",
      "compliance",
      "fleet",
      "team",
      "system",
    ]

    const result: Record<
      NotificationCategory,
      { inApp: boolean; browserPush: boolean; email: boolean }
    > = {} as any

    for (const cat of defaultCategories) {
      const match = prefs.find((p) => p.category === cat)
      result[cat] = {
        inApp: match?.inApp ?? true,
        browserPush: match?.browserPush ?? true,
        email: match?.email ?? false,
      }
    }

    return result
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Error fetching preferences:`, err)
    return null
  }
}

/**
 * Update user notification preferences for a specific category.
 */
export async function updateUserNotificationPreference({
  userId,
  organizationId,
  category,
  inApp,
  browserPush,
  email,
}: {
  userId: string
  organizationId: string
  category: NotificationCategory
  inApp?: boolean
  browserPush?: boolean
  email?: boolean
}) {
  console.log(
    `[NOTIFICATIONS] Updating preferences user="${userId}" org="${organizationId}" category="${category}" inApp=${inApp} browser=${browserPush} email=${email}`
  )

  try {
    const [existing] = await db
      .select()
      .from(notificationPreference)
      .where(
        and(
          eq(notificationPreference.userId, userId),
          eq(notificationPreference.organizationId, organizationId),
          eq(notificationPreference.category, category)
        )
      )
      .limit(1)

    if (existing) {
      await db
        .update(notificationPreference)
        .set({
          inApp: inApp !== undefined ? inApp : existing.inApp,
          browserPush: browserPush !== undefined ? browserPush : existing.browserPush,
          email: email !== undefined ? email : existing.email,
          updatedAt: new Date(),
        })
        .where(eq(notificationPreference.id, existing.id))
    } else {
      await db.insert(notificationPreference).values({
        id: randomUUID(),
        userId,
        organizationId,
        category,
        inApp: inApp ?? true,
        browserPush: browserPush ?? true,
        email: email ?? false,
      })
    }

    return { success: true }
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Error updating preference:`, err)
    return { success: false, error: "Failed to update notification preferences" }
  }
}

/**
 * Active Situational Alert Collector:
 * Inspects live database records (CDL expiry within 30 days, overdue customer invoices,
 * pending AP expenses) and automatically ensures a notification exists.
 */
export async function syncSituationalAlerts(organizationId: string) {
  console.log(`[NOTIFICATIONS] 🔍 Running situational alert collector for org="${organizationId}"`)
  const now = new Date()
  const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  try {
    // 1. Check CDL Expirations
    const activeDrivers = await db
      .select({
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        cdlExpiration: driver.cdlExpiration,
      })
      .from(driver)
      .where(and(eq(driver.tenantId, organizationId), eq(driver.status, "active")))

    for (const d of activeDrivers) {
      if (d.cdlExpiration && new Date(d.cdlExpiration) <= thirtyDaysAhead) {
        const daysLeft = Math.ceil(
          (new Date(d.cdlExpiration).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        )
        const eventKey = `cdl-exp-${d.id}-${new Date(d.cdlExpiration).toISOString().slice(0, 10)}`

        // Check if alert already logged
        const [existing] = await db
          .select({ id: notification.id })
          .from(notification)
          .where(
            and(
              eq(notification.organizationId, organizationId),
              eq(notification.event, eventKey)
            )
          )
          .limit(1)

        if (!existing) {
          await dispatchNotificationEvent({
            organizationId,
            category: "compliance",
            event: eventKey,
            severity: daysLeft <= 7 ? "error" : "warn",
            title: `CDL Expiration Warning`,
            message: `Commercial driver ${d.firstName} ${d.lastName}'s CDL expires in ${Math.max(0, daysLeft)} days. Renew DQ file immediately.`,
            link: `/drivers`,
            metadata: { driverId: d.id, daysLeft },
          })
        }
      }
    }

    // 2. Check Overdue Customer Invoices
    const pendingInvoices = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: invoice.amount,
        dueDate: invoice.dueDate,
        status: invoice.status,
      })
      .from(invoice)
      .where(
        and(
          eq(invoice.tenantId, organizationId),
          or(eq(invoice.status, "pending"), eq(invoice.status, "overdue"))
        )
      )

    for (const inv of pendingInvoices) {
      if (inv.dueDate && new Date(inv.dueDate) < now) {
        const daysOver = Math.floor(
          (now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)
        )
        const eventKey = `inv-overdue-${inv.id}`

        const [existing] = await db
          .select({ id: notification.id })
          .from(notification)
          .where(
            and(
              eq(notification.organizationId, organizationId),
              eq(notification.event, eventKey)
            )
          )
          .limit(1)

        if (!existing) {
          await dispatchNotificationEvent({
            organizationId,
            category: "invoice",
            event: eventKey,
            severity: "warn",
            title: `Overdue Invoice AR Alert`,
            message: `Invoice #${inv.invoiceNumber} ($${parseFloat(inv.amount).toFixed(2)}) is ${daysOver} days past due date.`,
            link: `/invoices/${inv.id}`,
            metadata: { invoiceId: inv.id, invoiceNumber: inv.invoiceNumber, daysOver },
          })
        }
      }
    }

    // 3. Check Pending AP Expenses Awaiting Approval
    const unapprovedExpenses = await db
      .select({
        id: apExpense.id,
        vendor: apExpense.vendor,
        amount: apExpense.amount,
        type: apExpense.type,
      })
      .from(apExpense)
      .where(and(eq(apExpense.tenantId, organizationId), eq(apExpense.status, "pending")))

    if (unapprovedExpenses.length > 0) {
      const pendingSum = unapprovedExpenses.reduce((acc, e) => acc + parseFloat(e.amount || "0"), 0)
      const eventKey = `ap-pending-summary-${now.toISOString().slice(0, 10)}`

      const [existing] = await db
        .select({ id: notification.id })
        .from(notification)
        .where(
          and(
            eq(notification.organizationId, organizationId),
            eq(notification.event, eventKey)
          )
        )
        .limit(1)

      if (!existing && unapprovedExpenses.length > 0) {
        await dispatchNotificationEvent({
          organizationId,
          category: "expense",
          event: eventKey,
          severity: "info",
          title: `Pending AP Expense Approvals`,
          message: `${unapprovedExpenses.length} trip expenses totaling $${pendingSum.toFixed(2)} are awaiting managerial review and approval.`,
          link: `/accounts-payable`,
          metadata: { count: unapprovedExpenses.length, total: pendingSum },
        })
      }
    }

    console.log(`[NOTIFICATIONS] ✅ Situational alert collector completed.`)
  } catch (err) {
    console.error(`[NOTIFICATIONS] ❌ Error running situational alert collector:`, err)
  }
}
