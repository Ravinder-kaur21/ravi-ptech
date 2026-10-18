"use server"

import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { apExpense, user as userTable } from "@/lib/schema"
import { requireTenant, TenantError } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"
import { recordAuditEvent } from "@/lib/audit"

// ─── 1. CREATE EXPENSE ────────────────────────────────────────────────────────

const createExpenseSchema = z.object({
  tripId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  type: z.string().min(1, "Expense category is required"),
  vendor: z.string().min(1, "Vendor name is required").max(255),
  amount: z.string().min(1, "Amount is required"),
  date: z.string().min(1, "Expense date is required"),
  receipt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createExpenseAction(raw: z.infer<typeof createExpenseSchema>) {
  try {
    const ctx = await requireTenant()
    // Accounting module or settlements AP write
    await requireCatalogPermission("accounting.invoices.create")

    const parsed = createExpenseSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid expense data" }
    }
    const data = parsed.data
    const id = randomUUID()

    await db.insert(apExpense).values({
      id,
      tenantId: ctx.tenantId,
      tripId: data.tripId || null,
      driverId: data.driverId || null,
      type: data.type,
      vendor: data.vendor,
      amount: data.amount,
      date: new Date(data.date),
      status: "pending",
      receipt: data.receipt || null,
      notes: data.notes || null,
    })

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "expense.create",
      target: { type: "expense", id, label: `${data.type} - $${data.amount}` },
      metadata: { tenantId: ctx.tenantId, vendor: data.vendor, tripId: data.tripId },
    })

    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "expense",
      event: "expense.submitted",
      severity: "info",
      title: "New Trip Expense Logged",
      message: `${data.vendor}: $${parseFloat(data.amount).toFixed(2)} (${data.type}) recorded and pending review.`,
      link: "/accounts-payable",
      metadata: { expenseId: id, vendor: data.vendor, amount: data.amount, type: data.type },
    })

    revalidatePath("/accounts-payable")
    revalidatePath("/trips")
    return { success: true, id }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/CREATE_EXPENSE] failed:", err)
    return { success: false, error: "Failed to record expense" }
  }
}

// ─── 2. UPDATE EXPENSE STATUS (APPROVE / REIMBURSE / REJECT) ──────────────────

const updateExpenseStatusSchema = z.object({
  expenseId: z.string().min(1),
  status: z.enum(["pending", "approved", "reimbursed", "rejected"]),
})

export async function updateExpenseStatusAction(raw: z.infer<typeof updateExpenseStatusSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("accounting.invoices.create")

    const parsed = updateExpenseStatusSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: "Invalid status update" }
    }
    const { expenseId, status } = parsed.data

    const [existing] = await db
      .select()
      .from(apExpense)
      .where(and(eq(apExpense.id, expenseId), eq(apExpense.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Expense not found" }
    }

    await db
      .update(apExpense)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(apExpense.id, expenseId), eq(apExpense.tenantId, ctx.tenantId)))

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "expense.update_status",
      target: { type: "expense", id: expenseId, label: `${existing.type} - $${existing.amount}` },
      metadata: { tenantId: ctx.tenantId, previousStatus: existing.status, newStatus: status },
    })

    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "expense",
      event: `expense.${status}`,
      severity: status === "approved" ? "success" : status === "rejected" ? "error" : "info",
      title: `Expense ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `${existing.vendor || existing.type} expense of $${parseFloat(existing.amount || "0").toFixed(2)} was marked ${status}.`,
      link: "/accounts-payable",
      metadata: { expenseId, status, amount: existing.amount, vendor: existing.vendor },
    })

    revalidatePath("/accounts-payable")
    return { success: true }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/UPDATE_EXPENSE_STATUS] failed:", err)
    return { success: false, error: "Failed to update expense status" }
  }
}
