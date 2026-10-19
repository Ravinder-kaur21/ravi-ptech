import { randomUUID } from "node:crypto"
import { NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { truck, user as userTable } from "@/lib/schema"
import { recordAuditEvent } from "@/lib/audit"
import { requirePermission, withTenant } from "@/lib/dal"

const mileageSchema = z
  .string()
  .regex(/^\d{1,10}$/, "Enter a valid non-negative mileage")
  .nullable()
  .optional()

const createTruckSchema = z.object({
  unitNumber: z.string().trim().min(1).max(50),
  make: z.string().trim().max(100).nullable().optional(),
  model: z.string().trim().max(100).nullable().optional(),
  licensePlate: z.string().trim().max(50).nullable().optional(),
  licenseState: z.string().trim().max(50).nullable().optional(),
  status: z.enum(["available", "maintenance", "out_of_service"]),
  currentMiles: mileageSchema,
  nextServiceMiles: mileageSchema,
  nextServiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid service date")
    .nullable()
    .optional(),
})

export const POST = withTenant(async (request: Request, { tenantId, userId }) => {
  await requirePermission({ resource: "truck", action: "create" })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 })
  }

  const parsed = createTruckSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid truck details", details: parsed.error.issues },
      { status: 400 },
    )
  }

  const data = parsed.data
  const serviceDate = data.nextServiceDate
    ? new Date(`${data.nextServiceDate}T00:00:00.000Z`)
    : null
  if (
    serviceDate &&
    (Number.isNaN(serviceDate.getTime()) ||
      serviceDate.toISOString().slice(0, 10) !== data.nextServiceDate)
  ) {
    return NextResponse.json(
      { error: "Enter a valid service date" },
      { status: 400 },
    )
  }

  const id = randomUUID()
  try {
    await db.insert(truck).values({
      id,
      tenantId,
      unitNumber: data.unitNumber,
      make: data.make || null,
      model: data.model || null,
      licensePlate: data.licensePlate || null,
      licenseState: data.licenseState || null,
      status: data.status,
      currentMiles: data.currentMiles || null,
      nextServiceMiles: data.nextServiceMiles || null,
      nextServiceDate: serviceDate,
    })
  } catch (error) {
    console.error("[API/TRUCKS] insert failed", error)
    return NextResponse.json({ error: "Failed to create truck" }, { status: 500 })
  }

  try {
    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1)
    await recordAuditEvent({
      actor: { id: userId, email: actor?.email ?? "(unknown)" },
      action: "truck.create",
      target: { type: "truck", id, label: data.unitNumber },
      metadata: { tenantId },
    })
  } catch (error) {
    console.error("[API/TRUCKS] audit event failed after truck creation", error)
    return NextResponse.json(
      { id, unitNumber: data.unitNumber, warning: "Truck created, but audit logging failed" },
      { status: 201 },
    )
  }

  return NextResponse.json({ id, unitNumber: data.unitNumber }, { status: 201 })
})
