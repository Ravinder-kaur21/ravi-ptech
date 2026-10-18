"use server"

import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { carrier, carrierPayment, user as userTable } from "@/lib/schema"
import { requireTenant, TenantError } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"
import { recordAuditEvent } from "@/lib/audit"

// ─── 1. CREATE OUTSIDE CARRIER ────────────────────────────────────────────────

const createCarrierSchema = z.object({
  name: z.string().min(1, "Carrier name is required").max(255),
  mcNumber: z.string().max(50).optional().nullable(),
  dotNumber: z.string().max(50).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  country: z.string().max(10).default("US"),
  zip: z.string().max(20).optional().nullable(),
  taxId: z.string().max(50).optional().nullable(),
  paymentTerms: z.string().max(50).default("Net 30"),
  currency: z.string().max(10).default("USD"),
  insuranceExpiry: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createCarrierAction(raw: z.infer<typeof createCarrierSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("settlements.create")

    const parsed = createCarrierSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid carrier data" }
    }
    const data = parsed.data
    const id = randomUUID()

    await db.insert(carrier).values({
      id,
      tenantId: ctx.tenantId,
      name: data.name,
      mcNumber: data.mcNumber || null,
      dotNumber: data.dotNumber || null,
      contactName: data.contactName || null,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || "US",
      zip: data.zip || null,
      taxId: data.taxId || null,
      paymentTerms: data.paymentTerms || "Net 30",
      currency: data.currency || "USD",
      insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null,
      status: "active",
      notes: data.notes || null,
    })

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "carrier.create",
      target: { type: "carrier", id, label: data.name },
      metadata: { tenantId: ctx.tenantId, mcNumber: data.mcNumber, dotNumber: data.dotNumber },
    })

    try {
      const { dispatchNotificationEvent } = await import("@/lib/notifications")
      await dispatchNotificationEvent({
        organizationId: ctx.tenantId,
        category: "team",
        event: "team.carrier_created",
        severity: "info",
        title: "Carrier Onboarded",
        message: `Outside carrier "${data.name}" was onboarded to the partner directory.`,
        link: "/carrier-pay",
        metadata: { carrierId: id, name: data.name, mcNumber: data.mcNumber },
      })
    } catch (e) {
      console.error("[NOTIFICATIONS] Error dispatching team.carrier_created:", e)
    }

    revalidatePath("/carrier-pay")
    revalidatePath("/trips")
    return { success: true, id }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/CREATE_CARRIER] failed:", err)
    return { success: false, error: "Failed to create carrier" }
  }
}

// ─── 2. CREATE CARRIER SETTLEMENT PAYMENT ─────────────────────────────────────

const createCarrierPaymentSchema = z.object({
  carrierId: z.string().min(1, "Carrier is required"),
  tripId: z.string().optional().nullable(),
  driverId: z.string().optional().nullable(),
  amount: z.string().min(1, "Base amount is required"),
  additions: z.string().default("0"),
  deductions: z.string().default("0"),
  currency: z.string().max(10).default("USD"),
  invoiceNumber: z.string().max(100).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createCarrierPaymentAction(raw: z.infer<typeof createCarrierPaymentSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("settlements.create")

    const parsed = createCarrierPaymentSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid settlement data" }
    }
    const data = parsed.data
    const id = randomUUID()

    const baseAmount = Number(data.amount) || 0
    const addAmt = Number(data.additions) || 0
    const dedAmt = Number(data.deductions) || 0
    const netTotal = Math.max(0, baseAmount + addAmt - dedAmt).toFixed(2)

    await db.insert(carrierPayment).values({
      id,
      tenantId: ctx.tenantId,
      carrierId: data.carrierId,
      tripId: data.tripId || null,
      driverId: data.driverId || null,
      amount: data.amount,
      additions: data.additions || "0",
      deductions: data.deductions || "0",
      netAmount: netTotal,
      currency: data.currency || "USD",
      status: "pending",
      invoiceNumber: data.invoiceNumber || null,
      notes: data.notes || null,
    })

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "carrier_payment.create",
      target: { type: "carrier_payment", id, label: `Carrier settlement $${netTotal}` },
      metadata: { tenantId: ctx.tenantId, carrierId: data.carrierId, tripId: data.tripId },
    })

    try {
      const { dispatchNotificationEvent } = await import("@/lib/notifications")
      await dispatchNotificationEvent({
        organizationId: ctx.tenantId,
        category: "settlement",
        event: "settlement.carrier_payment_created",
        severity: "info",
        title: "Carrier Settlement Generated",
        message: `Settlement of $${netTotal} generated for carrier payment processing.`,
        link: "/carrier-pay",
        metadata: { paymentId: id, carrierId: data.carrierId, amount: netTotal },
      })
    } catch (e) {
      console.error("[NOTIFICATIONS] Error dispatching settlement.carrier_payment_created:", e)
    }

    revalidatePath("/carrier-pay")
    return { success: true, id }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/CREATE_CARRIER_PAYMENT] failed:", err)
    return { success: false, error: "Failed to record carrier settlement" }
  }
}

// ─── 3. UPDATE CARRIER SETTLEMENT STATUS ──────────────────────────────────────

const updateCarrierPaymentStatusSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["pending", "approved", "paid", "void"]),
})

export async function updateCarrierPaymentStatusAction(raw: z.infer<typeof updateCarrierPaymentStatusSchema>) {
  try {
    const ctx = await requireTenant()
    const parsed = updateCarrierPaymentStatusSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: "Invalid status update" }
    }
    const { paymentId, status } = parsed.data

    if (status === "approved") {
      await requireCatalogPermission("settlements.approve")
    } else if (status === "paid") {
      await requireCatalogPermission("settlements.pay")
    } else {
      await requireCatalogPermission("settlements.create")
    }

    const [existing] = await db
      .select()
      .from(carrierPayment)
      .where(and(eq(carrierPayment.id, paymentId), eq(carrierPayment.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Carrier payment not found" }
    }

    await db
      .update(carrierPayment)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(and(eq(carrierPayment.id, paymentId), eq(carrierPayment.tenantId, ctx.tenantId)))

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "carrier_payment.update_status",
      target: { type: "carrier_payment", id: paymentId, label: `Carrier settlement $${existing.netAmount || existing.amount}` },
      metadata: { tenantId: ctx.tenantId, previousStatus: existing.status, newStatus: status },
    })

    try {
      const { dispatchNotificationEvent } = await import("@/lib/notifications")
      await dispatchNotificationEvent({
        organizationId: ctx.tenantId,
        category: "settlement",
        event: "settlement.carrier_payment_updated",
        severity: status === "paid" ? "success" : status === "approved" ? "info" : "warn",
        title: `Carrier Settlement ${status.toUpperCase()}`,
        message: `Carrier settlement ($${existing.netAmount || existing.amount}) marked as ${status}.`,
        link: "/carrier-pay",
        metadata: { paymentId, previousStatus: existing.status, newStatus: status },
      })
    } catch (e) {
      console.error("[NOTIFICATIONS] Error dispatching settlement.carrier_payment_updated:", e)
    }

    revalidatePath("/carrier-pay")
    return { success: true }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/UPDATE_CARRIER_PAYMENT_STATUS] failed:", err)
    return { success: false, error: "Failed to update carrier settlement status" }
  }
}

// ─── 4. CONFIRM REMITTANCE / MARK AS PAID ─────────────────────────────────────

const confirmRemittanceSchema = z.object({
  paymentId: z.string().min(1),
  paymentMethod: z.enum(["ACH", "Wire", "Check", "QuickPay", "EFS", "CreditCard", "Other"]),
  referenceNumber: z.string().min(1, "Reference # / Check # / Trace ID is required").max(100),
  paymentDate: z.string().min(1, "Payment date is required"),
  notes: z.string().optional().nullable(),
})

export async function confirmRemittanceAction(raw: z.infer<typeof confirmRemittanceSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("settlements.pay")

    const parsed = confirmRemittanceSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid remittance details" }
    }
    const data = parsed.data

    const [existing] = await db
      .select()
      .from(carrierPayment)
      .where(and(eq(carrierPayment.id, data.paymentId), eq(carrierPayment.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Carrier payment not found" }
    }

    await db
      .update(carrierPayment)
      .set({
        status: "paid",
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        paymentDate: new Date(data.paymentDate),
        notes: data.notes || existing.notes,
        updatedAt: new Date(),
      })
      .where(and(eq(carrierPayment.id, data.paymentId), eq(carrierPayment.tenantId, ctx.tenantId)))

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "carrier_payment.record_payment",
      target: { type: "carrier_payment", id: data.paymentId, label: `Carrier settlement $${existing.netAmount || existing.amount}` },
      metadata: {
        tenantId: ctx.tenantId,
        paymentMethod: data.paymentMethod,
        referenceNumber: data.referenceNumber,
        paymentDate: data.paymentDate,
      },
    })

    try {
      const { dispatchNotificationEvent } = await import("@/lib/notifications")
      await dispatchNotificationEvent({
        organizationId: ctx.tenantId,
        category: "settlement",
        event: "settlement.carrier_payment_paid",
        severity: "success",
        title: "Carrier Remittance Paid",
        message: `Carrier settlement ($${existing.netAmount || existing.amount}) paid via ${data.paymentMethod} (Ref #${data.referenceNumber}).`,
        link: "/carrier-pay",
        metadata: { paymentId: data.paymentId, method: data.paymentMethod, ref: data.referenceNumber },
      })
    } catch (e) {
      console.error("[NOTIFICATIONS] Error dispatching settlement.carrier_payment_paid:", e)
    }

    revalidatePath("/carrier-pay")
    return { success: true }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/CONFIRM_REMITTANCE] failed:", err)
    return { success: false, error: "Failed to confirm carrier payment" }
  }
}
