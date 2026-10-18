"use server"

import { revalidatePath } from "next/cache"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"
import { db } from "@/lib/db"
import { payStub } from "@/lib/schema"
import { getSession } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"

export async function generatePayStubAction(input: {
  driverId: string
  payPeriodStart: string
  payPeriodEnd: string
  totalMiles?: string | null
  payRate?: string | null
  grossPay: string
  deductions?: string | null
  netPay: string
  notes?: string | null
}) {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: "Unauthorized" }
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) return { ok: false, error: "No active organization" }

  await requireCatalogPermission("settlements.create")

  const id = `ps_${nanoid(12)}`
  await db.insert(payStub).values({
    id,
    tenantId,
    driverId: input.driverId,
    payPeriodStart: new Date(input.payPeriodStart),
    payPeriodEnd: new Date(input.payPeriodEnd),
    totalMiles: input.totalMiles || null,
    payRate: input.payRate || null,
    grossPay: input.grossPay,
    deductions: input.deductions || "0",
    netPay: input.netPay,
    status: "pending",
    notes: input.notes || null,
  })

  const { dispatchNotificationEvent } = await import("@/lib/notifications")
  await dispatchNotificationEvent({
    organizationId: tenantId,
    category: "settlement",
    event: "settlement.generated",
    severity: "info",
    title: "Payroll Statement Generated",
    message: `Driver payroll statement created: Gross $${input.grossPay} (Net $${input.netPay}).`,
    link: "/payroll",
    metadata: { payStubId: id, driverId: input.driverId, netPay: input.netPay },
  })

  revalidatePath("/payroll")
  return { ok: true, payStubId: id }
}

export async function markPayStubPaidAction(input: {
  payStubId: string
  paidDate?: string | null
}) {
  const session = await getSession()
  if (!session?.user) return { ok: false, error: "Unauthorized" }
  const tenantId = session.session.activeOrganizationId
  if (!tenantId) return { ok: false, error: "No active organization" }

  await requireCatalogPermission("settlements.pay")

  await db
    .update(payStub)
    .set({
      status: "paid",
      paidDate: input.paidDate ? new Date(input.paidDate) : new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(payStub.id, input.payStubId), eq(payStub.tenantId, tenantId)))

  const { dispatchNotificationEvent } = await import("@/lib/notifications")
  await dispatchNotificationEvent({
    organizationId: tenantId,
    category: "settlement",
    event: "settlement.paid",
    severity: "success",
    title: "Driver Payroll Disbursed",
    message: `Driver settlement statement marked Paid and remittance released.`,
    link: "/payroll",
    metadata: { payStubId: input.payStubId },
  })

  revalidatePath("/payroll")
  return { ok: true }
}
