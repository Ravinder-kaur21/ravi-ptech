"use server"

import { revalidatePath } from "next/cache"
import { and, eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { invoice } from "@/lib/schema"
import { requirePermission, requireTenant } from "@/lib/dal"

const invoiceSchema = z.object({
  customerName: z.string().trim().min(1).max(120),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  loadId: z.string().trim().optional().or(z.literal("")),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  dueDate: z.string().optional().or(z.literal("")),
  status: z.enum(["draft", "sent", "partially_paid", "paid", "overdue"]).default("draft"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

const paymentSchema = z.object({
  invoiceId: z.string().trim().min(1),
  amount: z.coerce.number().positive("Payment amount must be greater than zero"),
  paymentMethod: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
})

const money = (value: number) => Number(value.toFixed(2))

const createInvoiceNumber = () => {
  const stamp = Date.now().toString().slice(-8)
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `MUVX-${stamp}-${suffix}`
}

const normalizeStatus = (invoiceTotal: number, paidTotal: number, dueDate?: Date | string | null) => {
  const outstanding = Math.max(0, invoiceTotal - paidTotal)
  if (paidTotal >= invoiceTotal) return "paid"
  if (dueDate && new Date(dueDate) < new Date() && outstanding > 0) return "overdue"
  if (outstanding > 0 && paidTotal > 0) return "partially_paid"
  return "sent"
}

export async function createInvoiceAction(formData: FormData) {
  try {
    const ctx = await requireTenant()
    await requirePermission({ resource: "invoice", action: "create" })

    const payload = invoiceSchema.parse({
      customerName: formData.get("customerName"),
      customerEmail: formData.get("customerEmail"),
      loadId: formData.get("loadId"),
      amount: formData.get("amount"),
      dueDate: formData.get("dueDate"),
      status: formData.get("status") ?? "draft",
      notes: formData.get("notes"),
    })

    const [invoiceRecord] = await db
      .insert(invoice)
      .values({
        id: crypto.randomUUID(),
        tenantId: ctx.tenantId,
        invoiceNumber: createInvoiceNumber(),
        loadId: payload.loadId || null,
        customerId: payload.loadId || null,
        customerName: payload.customerName,
        customerEmail: payload.customerEmail || null,
        amount: String(money(payload.amount)),
        status: payload.status,
        dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
        notes: payload.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    revalidatePath("/settings/billing")
    revalidatePath("/settings")
    revalidatePath("/invoices")

    return {
      ok: true,
      invoice: invoiceRecord,
      message: `Invoice ${invoiceRecord.invoiceNumber} created successfully.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create invoice."
    return { ok: false, error: message }
  }
}

export async function recordInvoicePaymentAction(formData: FormData) {
  try {
    const ctx = await requireTenant()
    await requirePermission({ resource: "invoice", action: "update" })

    const payload = paymentSchema.parse({
      invoiceId: formData.get("invoiceId"),
      amount: formData.get("amount"),
      paymentMethod: formData.get("paymentMethod"),
      notes: formData.get("notes"),
    })

    const [target] = await db
      .select()
      .from(invoice)
      .where(and(eq(invoice.id, payload.invoiceId), eq(invoice.tenantId, ctx.tenantId)))
      .limit(1)

    if (!target) {
      return { ok: false, error: "Invoice not found." }
    }

    const totalAmount = Number.parseFloat(String(target.amount || "0")) || 0
    const currentPaid = target.status === "paid" ? totalAmount : target.status === "partially_paid" ? totalAmount * 0.5 : 0
    const nextPaid = Math.min(totalAmount, currentPaid + payload.amount)
    const nextStatus = normalizeStatus(totalAmount, nextPaid, target.dueDate ?? null)

    await db
      .update(invoice)
      .set({
        status: nextStatus,
        paidDate: nextPaid >= totalAmount ? new Date() : target.paidDate,
        updatedAt: new Date(),
      })
      .where(eq(invoice.id, target.id))

    revalidatePath("/settings/billing")
    revalidatePath("/settings")
    revalidatePath("/invoices")

    return {
      ok: true,
      message: `Payment recorded for ${target.invoiceNumber}.`,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record payment."
    return { ok: false, error: message }
  }
}
