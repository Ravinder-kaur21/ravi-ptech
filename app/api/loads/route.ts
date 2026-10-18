import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { load, user as userTable } from "@/lib/schema"
import { withTenant, requirePermission } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"
import { recordAuditEvent } from "@/lib/audit"
import { randomUUID } from "crypto"

const stopSchema = z.object({
  id: z.string(),
  type: z.enum(["pickup", "delivery"]),
  facilityName: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().optional().nullable(),
  zip: z.string().default(""),
  contactName: z.string().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  appointmentDate: z.string().optional().nullable(),
  appointmentTime: z.string().optional().nullable(),
  appointmentType: z.enum(["strict", "window", "first_come", "tba"]).optional().nullable(),
  notes: z.string().optional().nullable(),
})

const createLoadSchema = z.object({
  loadNumber: z.string().min(1).max(50),
  customerName: z.string().max(255).optional().nullable(),
  tenderNumber: z.string().max(100).optional().nullable(),
  originAddress: z.string().optional().nullable(),
  originCity: z.string().max(100).optional().nullable(),
  originState: z.string().max(50).optional().nullable(),
  originZip: z.string().max(20).optional().nullable(),
  originContact: z.string().max(100).optional().nullable(),
  originPhone: z.string().max(50).optional().nullable(),
  originAppointment: z.string().optional().nullable(),
  destAddress: z.string().optional().nullable(),
  destCity: z.string().max(100).optional().nullable(),
  destState: z.string().max(50).optional().nullable(),
  destZip: z.string().max(20).optional().nullable(),
  destContact: z.string().max(100).optional().nullable(),
  destPhone: z.string().max(50).optional().nullable(),
  destAppointment: z.string().optional().nullable(),
  stops: z.array(stopSchema).optional().nullable(),
  loadType: z.string().max(50).optional().nullable(),
  commodity: z.string().max(255).optional().nullable(),
  weight: z.string().max(50).optional().nullable(),
  temperature: z.string().max(50).optional().nullable(),
  isRefrigerated: z.boolean().optional().nullable(),
  currency: z.string().max(10).optional().nullable(),
  rate: z.string().max(50).optional().nullable(),
  salesTaxType: z.string().max(20).optional().nullable(),
  salesTaxRate: z.string().max(20).optional().nullable(),
  salesTaxAmount: z.string().max(20).optional().nullable(),
  finalRate: z.string().max(50).optional().nullable(),
  specialInstructions: z.string().optional().nullable(),
  pickupDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
})

// [API/LOADS] Create a load. tenantId comes from the session via
// withTenant() — never from the request body.
export const POST = withTenant(async (req: Request, { tenantId, userId }) => {
  // Coarse Better Auth membership gate + Granular Catalog override gate
  await requirePermission({ resource: "load", action: "create" })
  await requireCatalogPermission("loads.create")

  const body = await req.json().catch(() => null)
  const parsed = createLoadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    )
  }
  const data = parsed.data
  console.log("[API/LOADS] creating load:", data.loadNumber, "for tenant:", tenantId)

  const id = randomUUID()
  try {
    await db.insert(load).values({
      id,
      tenantId,
      loadNumber: data.loadNumber,
      status: "available",
      customerName: data.customerName ?? null,
      tenderNumber: data.tenderNumber ?? null,
      originAddress: data.originAddress ?? null,
      originCity: data.originCity ?? null,
      originState: data.originState ?? null,
      originZip: data.originZip ?? null,
      originContact: data.originContact ?? null,
      originPhone: data.originPhone ?? null,
      originAppointment: data.originAppointment ? new Date(data.originAppointment) : null,
      destAddress: data.destAddress ?? null,
      destCity: data.destCity ?? null,
      destState: data.destState ?? null,
      destZip: data.destZip ?? null,
      destContact: data.destContact ?? null,
      destPhone: data.destPhone ?? null,
      destAppointment: data.destAppointment ? new Date(data.destAppointment) : null,
      stops: data.stops ? JSON.stringify(data.stops) : null,
      loadType: data.loadType ?? "Dry Van",
      commodity: data.commodity ?? null,
      weight: data.weight ?? null,
      temperature: data.temperature ?? null,
      isRefrigerated: data.isRefrigerated ?? false,
      currency: data.currency ?? "USD",
      rate: data.rate ?? null,
      salesTaxType: data.salesTaxType ?? "none",
      salesTaxRate: data.salesTaxRate ?? null,
      salesTaxAmount: data.salesTaxAmount ?? null,
      finalRate: data.finalRate ?? data.rate ?? null,
      specialInstructions: data.specialInstructions ?? null,
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      isStarred: false,
    })
  } catch (err) {
    console.error("[API/LOADS] insert failed:", err)
    return NextResponse.json({ error: "Failed to create load" }, { status: 500 })
  }

  // Phase 2 (R-07): audit the create.
  const [actor] = await db
    .select({ email: userTable.email })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)
  await recordAuditEvent({
    actor: { id: userId, email: actor?.email ?? "(unknown)" },
    action: "load.create",
    target: { type: "load", id, label: data.loadNumber },
    metadata: { tenantId, customerName: data.customerName ?? null },
  })

  try {
    const { dispatchNotificationEvent } = await import("@/lib/notifications")
    await dispatchNotificationEvent({
      organizationId: tenantId,
      category: "load",
      event: "load.created",
      severity: "info",
      title: `New Load #${data.loadNumber} Created`,
      message: `Load #${data.loadNumber} booked for ${data.customerName || "shipper"}: ${data.originCity || "Origin"} → ${data.destCity || "Destination"}.`,
      link: `/loads/${id}`,
      metadata: { loadId: id, loadNumber: data.loadNumber, rate: data.rate },
    })
  } catch (notifErr) {
    console.error("[NOTIFICATIONS] Error dispatching load.created:", notifErr)
  }

  return NextResponse.json({ id, loadNumber: data.loadNumber }, { status: 201 })
})