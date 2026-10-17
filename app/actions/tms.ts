"use server"

import { z } from "zod"
import { eq, and } from "drizzle-orm"
import { randomUUID } from "node:crypto"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { load, trip, driver, truck, trailer, user as userTable } from "@/lib/schema"
import { requireTenant, TenantError } from "@/lib/dal"
import { requireCatalogPermission } from "@/lib/can"
import { recordAuditEvent } from "@/lib/audit"

// ─── 1. CREATE TRUCK ─────────────────────────────────────────────────────────

const truckSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required").max(50),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  year: z.string().max(10).optional().nullable(),
  vin: z.string().max(50).optional().nullable(),
  licensePlate: z.string().max(50).optional().nullable(),
  licenseState: z.string().max(50).optional().nullable(),
  fuelType: z.string().max(50).optional().nullable(),
  fuelCapacity: z.string().max(50).optional().nullable(),
  currentLocation: z.string().max(255).optional().nullable(),
  currentMiles: z.string().max(50).optional().nullable(),
  status: z.enum(["available", "in_use", "maintenance", "out_of_service"]).default("available"),
  notes: z.string().optional().nullable(),
})

export async function createTruckAction(raw: z.infer<typeof truckSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("fleet.create")

    const parsed = truckSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "Validation error", details: parsed.error.issues }
    }

    const data = parsed.data
    const id = randomUUID()

    await db.insert(truck).values({
      id,
      tenantId: ctx.tenantId,
      unitNumber: data.unitNumber,
      make: data.make ?? null,
      model: data.model ?? null,
      year: data.year ?? null,
      vin: data.vin ?? null,
      licensePlate: data.licensePlate ?? null,
      licenseState: data.licenseState ?? null,
      fuelType: data.fuelType ?? "Diesel",
      fuelCapacity: data.fuelCapacity ?? null,
      currentLocation: data.currentLocation ?? null,
      currentMiles: data.currentMiles ?? null,
      status: data.status,
      notes: data.notes ?? null,
    })

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "truck.create",
      target: { type: "truck", id, label: data.unitNumber },
      metadata: { tenantId: ctx.tenantId, unitNumber: data.unitNumber },
    })

    revalidatePath("/fleet")
    return { ok: true, id, unitNumber: data.unitNumber }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to create truck" }
  }
}

// ─── 2. CREATE TRAILER ───────────────────────────────────────────────────────

const trailerSchema = z.object({
  unitNumber: z.string().min(1, "Unit number is required").max(50),
  type: z.string().max(50).optional().nullable(),
  make: z.string().max(100).optional().nullable(),
  model: z.string().max(100).optional().nullable(),
  year: z.string().max(10).optional().nullable(),
  vin: z.string().max(50).optional().nullable(),
  licensePlate: z.string().max(50).optional().nullable(),
  licenseState: z.string().max(50).optional().nullable(),
  status: z.enum(["available", "in_use", "maintenance"]).default("available"),
  notes: z.string().optional().nullable(),
})

export async function createTrailerAction(raw: z.infer<typeof trailerSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("fleet.create")

    const parsed = trailerSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "Validation error", details: parsed.error.issues }
    }

    const data = parsed.data
    const id = randomUUID()

    await db.insert(trailer).values({
      id,
      tenantId: ctx.tenantId,
      unitNumber: data.unitNumber,
      type: data.type ?? "Dry Van",
      make: data.make ?? null,
      model: data.model ?? null,
      year: data.year ?? null,
      vin: data.vin ?? null,
      licensePlate: data.licensePlate ?? null,
      licenseState: data.licenseState ?? null,
      status: data.status,
      notes: data.notes ?? null,
    })

    revalidatePath("/fleet")
    return { ok: true, id, unitNumber: data.unitNumber }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to create trailer" }
  }
}

// ─── 3. CREATE DRIVER ────────────────────────────────────────────────────────

const driverSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().max(50).optional().nullable(),
  cdlNumber: z.string().max(50).optional().nullable(),
  cdlState: z.string().max(50).optional().nullable(),
  payType: z.string().max(50).optional().nullable(),
  payRate: z.string().max(50).optional().nullable(),
  status: z.enum(["active", "inactive", "on_leave"]).default("active"),
  notes: z.string().optional().nullable(),
})

export async function createDriverAction(raw: z.infer<typeof driverSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("drivers.create")

    const parsed = driverSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "Validation error", details: parsed.error.issues }
    }

    const data = parsed.data
    const id = randomUUID()

    await db.insert(driver).values({
      id,
      tenantId: ctx.tenantId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email || null,
      phone: data.phone ?? null,
      cdlNumber: data.cdlNumber ?? null,
      cdlState: data.cdlState ?? null,
      payType: data.payType ?? "Per Mile",
      payRate: data.payRate ?? null,
      status: data.status,
      notes: data.notes ?? null,
    })

    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "driver.create",
      target: { type: "driver", id, label: `${data.firstName} ${data.lastName}` },
      metadata: { tenantId: ctx.tenantId },
    })

    revalidatePath("/drivers")
    return { ok: true, id, name: `${data.firstName} ${data.lastName}` }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to create driver" }
  }
}

// ─── 4. DISPATCH LOAD & CREATE TRIP ──────────────────────────────────────────

const dispatchSchema = z.object({
  loadId: z.string().min(1, "Load ID is required"),
  driverId: z.string().min(1, "Driver assignment is required"),
  truckId: z.string().min(1, "Truck assignment is required"),
  trailerId: z.string().optional().nullable(),
  tripNumber: z.string().optional(),
  totalMiles: z.string().optional().nullable(),
})

export async function dispatchLoadAction(raw: z.infer<typeof dispatchSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("loads.dispatch")

    const parsed = dispatchSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "Validation error", details: parsed.error.issues }
    }

    const { loadId, driverId, truckId, trailerId, tripNumber, totalMiles } = parsed.data

    // Verify load exists and belongs to tenant
    const [existingLoad] = await db
      .select()
      .from(load)
      .where(and(eq(load.id, loadId), eq(load.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existingLoad) {
      return { ok: false, error: "Load not found" }
    }

    const tripId = randomUUID()
    const generatedTripNumber = tripNumber || `TRP-${Date.now().toString().slice(-6)}`

    // Create the trip
    await db.insert(trip).values({
      id: tripId,
      tenantId: ctx.tenantId,
      tripNumber: generatedTripNumber,
      loadId,
      driverId,
      truckId,
      trailerId: trailerId ?? null,
      status: "in_progress",
      startDate: new Date(),
      totalMiles: totalMiles ?? null,
      totalRevenue: existingLoad.rate ?? null,
    })

    // Update load status to dispatched
    await db
      .update(load)
      .set({
        status: "dispatched",
        updatedAt: new Date(),
      })
      .where(and(eq(load.id, loadId), eq(load.tenantId, ctx.tenantId)))

    // Update truck to in_use
    await db
      .update(truck)
      .set({ status: "in_use", updatedAt: new Date() })
      .where(and(eq(truck.id, truckId), eq(truck.tenantId, ctx.tenantId)))

    // Update trailer to in_use if provided
    if (trailerId) {
      await db
        .update(trailer)
        .set({ status: "in_use", updatedAt: new Date() })
        .where(and(eq(trailer.id, trailerId), eq(trailer.tenantId, ctx.tenantId)))
    }

    // Audit log
    const [actor] = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, ctx.userId))
      .limit(1)

    await recordAuditEvent({
      actor: { id: ctx.userId, email: actor?.email ?? "(unknown)" },
      action: "trip.create",
      target: { type: "trip", id: tripId, label: generatedTripNumber },
      metadata: { tenantId: ctx.tenantId, loadId, truckId, driverId },
    })

    revalidatePath("/loads")
    revalidatePath(`/loads/${loadId}`)
    revalidatePath("/trips")
    revalidatePath("/fleet")

    return { ok: true, tripId, tripNumber: generatedTripNumber }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to dispatch load" }
  }
}

// ─── 5. UPDATE TRIP STATUS ───────────────────────────────────────────────────

const updateTripStatusSchema = z.object({
  tripId: z.string().min(1),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]),
})

export async function updateTripStatusAction(raw: z.infer<typeof updateTripStatusSchema>) {
  try {
    const ctx = await requireTenant()
    await requireCatalogPermission("loads.update_status")

    const parsed = updateTripStatusSchema.safeParse(raw)
    if (!parsed.success) {
      return { ok: false, error: "Validation error" }
    }

    const { tripId, status } = parsed.data

    const [existingTrip] = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, tripId), eq(trip.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existingTrip) {
      return { ok: false, error: "Trip not found" }
    }

    await db
      .update(trip)
      .set({
        status,
        endDate: status === "completed" ? new Date() : existingTrip.endDate,
        updatedAt: new Date(),
      })
      .where(and(eq(trip.id, tripId), eq(trip.tenantId, ctx.tenantId)))

    // If completed or cancelled, release truck and trailer back to available
    if (status === "completed" || status === "cancelled") {
      if (existingTrip.truckId) {
        await db
          .update(truck)
          .set({ status: "available", updatedAt: new Date() })
          .where(and(eq(truck.id, existingTrip.truckId), eq(truck.tenantId, ctx.tenantId)))
      }
      if (existingTrip.trailerId) {
        await db
          .update(trailer)
          .set({ status: "available", updatedAt: new Date() })
          .where(and(eq(trailer.id, existingTrip.trailerId), eq(trailer.tenantId, ctx.tenantId)))
      }
      if (existingTrip.loadId && status === "completed") {
        await db
          .update(load)
          .set({ status: "delivered", updatedAt: new Date() })
          .where(and(eq(load.id, existingTrip.loadId), eq(load.tenantId, ctx.tenantId)))
      }
    }

    revalidatePath("/trips")
    revalidatePath("/loads")
    revalidatePath("/fleet")

    return { ok: true, status }
  } catch (err: any) {
    if (err instanceof TenantError) return { ok: false, error: err.code }
    return { ok: false, error: err.message || "Failed to update trip status" }
  }
}
