"use server"

import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { customer, facility, user as userTable } from "@/lib/schema"
import { requireTenant, TenantError } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"
import { recordAuditEvent } from "@/lib/audit"

// ─── 1. CREATE CUSTOMER ──────────────────────────────────────────────────────

const createCustomerSchema = z.object({
  name: z.string().min(1, "Customer name is required").max(255),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().max(100).optional().nullable(),
  state: z.string().max(50).optional().nullable(),
  country: z.string().max(10).default("US"),
  zip: z.string().max(20).optional().nullable(),
  paymentTerms: z.string().max(50).default("Net 30"),
  currency: z.string().max(10).default("USD"),
  creditLimit: z.string().max(50).optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createCustomerAction(raw: z.infer<typeof createCustomerSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("customers.create")

    const parsed = createCustomerSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid customer data" }
    }
    const data = parsed.data
    const id = randomUUID()

    await db.insert(customer).values({
      id,
      tenantId: ctx.tenantId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      contactName: data.contactName || null,
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || "US",
      zip: data.zip || null,
      paymentTerms: data.paymentTerms || "Net 30",
      currency: data.currency || "USD",
      creditLimit: data.creditLimit || null,
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
      action: "customer.create",
      target: { type: "customer", id, label: data.name },
      metadata: { tenantId: ctx.tenantId, paymentTerms: data.paymentTerms },
    })

    revalidatePath("/customers")
    revalidatePath("/loads/new")
    revalidatePath("/invoices")
    return { success: true, id }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/CREATE_CUSTOMER] failed:", err)
    return { success: false, error: "Failed to create customer" }
  }
}

// ─── 2. CREATE FACILITY ──────────────────────────────────────────────────────

const createFacilitySchema = z.object({
  name: z.string().min(1, "Facility name is required").max(255),
  facilityType: z.string().default("shipper_receiver"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(50),
  country: z.string().max(10).default("US"),
  zip: z.string().max(20).optional().nullable(),
  contactName: z.string().max(100).optional().nullable(),
  contactPhone: z.string().max(50).optional().nullable(),
  operatingHours: z.string().max(100).optional().nullable(),
  appointmentRequired: z.boolean().default(true),
  checkInInstructions: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})

export async function createFacilityAction(raw: z.infer<typeof createFacilitySchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("customers.create")

    const parsed = createFacilitySchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid facility data" }
    }
    const data = parsed.data
    const id = randomUUID()

    await db.insert(facility).values({
      id,
      tenantId: ctx.tenantId,
      name: data.name,
      facilityType: data.facilityType,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country || "US",
      zip: data.zip || null,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      operatingHours: data.operatingHours || null,
      appointmentRequired: data.appointmentRequired,
      checkInInstructions: data.checkInInstructions || null,
      notes: data.notes || null,
    })

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "facility.create",
      target: { type: "facility", id, label: data.name },
      metadata: { tenantId: ctx.tenantId, city: data.city, state: data.state },
    })

    revalidatePath("/customers")
    revalidatePath("/loads/new")
    return { success: true, id }
  } catch (err) {
    if (err instanceof TenantError) {
      return { success: false, error: err.message }
    }
    console.error("[ACTION/CREATE_FACILITY] failed:", err)
    return { success: false, error: "Failed to create facility" }
  }
}
