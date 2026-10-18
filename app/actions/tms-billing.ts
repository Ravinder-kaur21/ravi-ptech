"use server"

import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { invoice, load, user as userTable } from "@/lib/schema"
import { requireTenant, TenantError } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"
import { recordAuditEvent } from "@/lib/audit"

// ─── 1. CREATE INVOICE ───────────────────────────────────────────────────────

const createInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required").max(50),
  loadId: z.string().optional().nullable(),
  customerName: z.string().min(1, "Customer name is required").max(255),
  customerEmail: z.string().email().optional().nullable().or(z.literal("")),
  amount: z.string().min(1, "Amount is required"),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createInvoiceAction(raw: z.infer<typeof createInvoiceSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("accounting.invoices.create")

    const parsed = createInvoiceSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "Validation error", details: parsed.error.issues }
    }

    const data = parsed.data
    const id = randomUUID()

    await db.insert(invoice).values({
      id,
      tenantId: ctx.tenantId,
      invoiceNumber: data.invoiceNumber,
      loadId: data.loadId || null,
      customerName: data.customerName,
      customerEmail: data.customerEmail || null,
      amount: data.amount,
      status: "pending",
      dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default Net 30
      notes: data.notes || null,
    })

    // If tied to a load, mark load status as completed
    if (data.loadId) {
      await db
        .update(load)
        .set({ status: "completed", updatedAt: new Date() })
        .where(and(eq(load.id, data.loadId), eq(load.tenantId, ctx.tenantId)))
    }

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "invoice.create",
      target: { type: "invoice", id, label: data.invoiceNumber },
      metadata: { tenantId: ctx.tenantId, amount: data.amount, customerName: data.customerName },
    })

    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "invoice",
      event: "invoice.created",
      severity: "info",
      title: "Customer Invoice Generated",
      message: `Invoice #${data.invoiceNumber} ($${parseFloat(data.amount).toFixed(2)}) issued to ${data.customerName}.`,
      link: `/invoices/${id}`,
      metadata: { invoiceId: id, invoiceNumber: data.invoiceNumber, amount: data.amount },
    })

    revalidatePath("/invoices")
    revalidatePath("/loads")
    return { ok: true, id, invoiceNumber: data.invoiceNumber }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to create invoice" }
  }
}

// ─── 2. APPLY PAYMENT ────────────────────────────────────────────────────────

const applyPaymentSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID is required"),
  paidAmount: z.string().min(1, "Payment amount is required"),
  paymentDate: z.string().optional().nullable(),
  paymentMethod: z.string().default("ACH / Electronic"),
  referenceNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function applyPaymentAction(raw: z.infer<typeof applyPaymentSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("accounting.invoices.apply_payment")

    const parsed = applyPaymentSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "Validation error", details: parsed.error.issues }
    }

    const { invoiceId, paymentDate, referenceNumber, notes } = parsed.data

    const [existing] = await db
      .select()
      .from(invoice)
      .where(and(eq(invoice.id, invoiceId), eq(invoice.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { ok: false, error: "Invoice not found" }
    }

    const paidAt = paymentDate ? new Date(paymentDate) : new Date()

    await db
      .update(invoice)
      .set({
        status: "paid",
        paidDate: paidAt,
        notes: notes ? `${existing.notes ? existing.notes + " | " : ""}Paid ref: ${referenceNumber || "N/A"} - ${notes}` : existing.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(invoice.id, invoiceId), eq(invoice.tenantId, ctx.tenantId)))

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "invoice.update",
      target: { type: "invoice", id: invoiceId, label: existing.invoiceNumber },
      metadata: { tenantId: ctx.tenantId, status: "paid", referenceNumber },
    })

    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "invoice",
      event: "invoice.paid",
      severity: "success",
      title: "Invoice Payment Reconciled",
      message: `Invoice #${existing.invoiceNumber} paid in full ($${parseFloat(existing.amount).toFixed(2)}).`,
      link: `/invoices/${invoiceId}`,
      metadata: { invoiceId, invoiceNumber: existing.invoiceNumber, amount: existing.amount, referenceNumber },
    })

    revalidatePath("/invoices")
    return { ok: true, invoiceNumber: existing.invoiceNumber }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to record payment" }
  }
}

// ─── 3. VOID INVOICE ─────────────────────────────────────────────────────────

export async function voidInvoiceAction(invoiceId: string) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("accounting.invoices.delete")

    const [existing] = await db
      .select()
      .from(invoice)
      .where(and(eq(invoice.id, invoiceId), eq(invoice.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) return { ok: false, error: "Invoice not found" }

    await db
      .update(invoice)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(and(eq(invoice.id, invoiceId), eq(invoice.tenantId, ctx.tenantId)))

    revalidatePath("/invoices")
    return { ok: true }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to void invoice" }
  }
}
