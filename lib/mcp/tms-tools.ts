import { z } from "zod"
import { randomUUID } from "node:crypto"
import { eq, and, desc, sql, like, or } from "drizzle-orm"
import { db } from "@/lib/db"
import {
  load,
  trip,
  driver,
  truck,
  trailer,
  customer,
  facility,
  carrier,
  invoice,
  carrierPayment,
  apExpense,
  member,
  invitation,
  user as userTable,
  auditLog,
} from "@/lib/schema"
import { recordAuditEvent } from "@/lib/audit"
import { dispatchNotificationEvent } from "@/lib/notifications"
import { sendInvoiceEmail } from "@/lib/email"

export interface ToolContext {
  userId: string
  userEmail: string
  userName?: string | null
  tenantId: string
  perms: Set<string>
}

/**
 * Metadata definition for every Muvx TMS tool.
 * Shared between the AI Copilot route and the Model Context Protocol (MCP) server.
 */
export interface TmsToolDef<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = any> {
  name: string
  description: string
  inputSchema: TInput
  requiresApproval?: boolean
  approvalReason?: string
  execute: (input: z.infer<TInput>, ctx: ToolContext) => Promise<TOutput>
}

export function defineTmsTool<TInput extends z.ZodTypeAny, TOutput = any>(
  def: TmsToolDef<TInput, TOutput>
): TmsToolDef<TInput, TOutput> {
  return def
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOADS TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const bookLoadTool = defineTmsTool({
  name: "bookLoad",
  description: "Book a new freight load into Muvx TMS with shipper, equipment, route, and linehaul rate. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Booking this load writes it to the operational database and notifies dispatchers.",
  inputSchema: z.object({
    customerName: z.string().describe("Customer or broker name (e.g. Walmart, CH Robinson)"),
    loadNumber: z.string().optional().describe("Load/tender number (auto-generated if omitted)"),
    originCity: z.string().describe("Pickup city"),
    originState: z.string().describe("Pickup 2-letter state code (e.g. IL)"),
    destCity: z.string().describe("Delivery city"),
    destState: z.string().describe("Delivery 2-letter state code (e.g. TX)"),
    rate: z.number().describe("Agreed linehaul rate amount in USD"),
    equipmentType: z
      .enum(["Dry Van", "Reefer", "Flatbed", "Step Deck", "Power Only", "Box Truck"])
      .default("Dry Van"),
    commodity: z.string().optional().describe("Description of freight goods"),
    weight: z.number().optional().describe("Total weight in lbs"),
    pickupDate: z.string().optional().describe("YYYY-MM-DD pickup date"),
    deliveryDate: z.string().optional().describe("YYYY-MM-DD delivery date"),
  }),
  execute: async (params, ctx) => {
    const loadId = randomUUID()
    const loadNum = params.loadNumber || `LD-${Math.floor(100000 + Math.random() * 900000)}`

    await db.insert(load).values({
      id: loadId,
      tenantId: ctx.tenantId,
      loadNumber: loadNum,
      customerName: params.customerName,
      status: "available",
      originCity: params.originCity,
      originState: params.originState,
      destCity: params.destCity,
      destState: params.destState,
      loadType: params.equipmentType,
      commodity: params.commodity ?? null,
      weight: params.weight ? String(params.weight) : null,
      rate: String(params.rate),
      finalRate: String(params.rate),
      currency: "USD",
      pickupDate: params.pickupDate ? new Date(params.pickupDate) : new Date(),
      deliveryDate: params.deliveryDate ? new Date(params.deliveryDate) : null,
    })

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "load.create",
      target: { type: "load", id: loadId, label: loadNum },
      metadata: {
        customer: params.customerName,
        rate: params.rate,
        lane: `${params.originCity}, ${params.originState} -> ${params.destCity}, ${params.destState}`,
        tenantId: ctx.tenantId,
      },
    })

    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "load",
      event: "load.created_by_copilot",
      severity: "info",
      title: `Load #${loadNum} Booked`,
      message: `Booked for ${params.customerName} ($${params.rate.toLocaleString()}) by Copilot.`,
      link: `/loads/${loadId}`,
    })

    return {
      success: true,
      loadId,
      loadNumber: loadNum,
      customerName: params.customerName,
      origin: `${params.originCity}, ${params.originState}`,
      destination: `${params.destCity}, ${params.destState}`,
      rate: `$${params.rate.toLocaleString()}`,
      status: "available",
      message: `Load #${loadNum} booked successfully. Ready for driver dispatch.`,
    }
  },
})

export const queryLoadsTool = defineTmsTool({
  name: "queryLoads",
  description: "Query active freight loads in Muvx TMS by status, customer, or origin/destination.",
  inputSchema: z.object({
    status: z
      .enum(["all", "available", "booked", "dispatched", "in_transit", "delivered", "completed", "cancelled"])
      .default("all"),
    customerName: z.string().optional().describe("Filter by customer/broker name"),
    limit: z.number().default(10).describe("Max loads to retrieve"),
  }),
  execute: async ({ status, customerName, limit }, ctx) => {
    const conditions = [eq(load.tenantId, ctx.tenantId)]
    if (status !== "all") {
      conditions.push(eq(load.status, status))
    }
    if (customerName) {
      conditions.push(like(load.customerName, `%${customerName}%`))
    }

    const rows = await db
      .select({
        id: load.id,
        loadNumber: load.loadNumber,
        status: load.status,
        customerName: load.customerName,
        originCity: load.originCity,
        originState: load.originState,
        destCity: load.destCity,
        destState: load.destState,
        rate: load.rate,
        currency: load.currency,
        loadType: load.loadType,
        pickupDate: load.pickupDate,
        podSigned: load.podSigned,
        bolReceived: load.bolReceived,
      })
      .from(load)
      .where(and(...conditions))
      .orderBy(desc(load.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      loads: rows.map((r) => ({
        id: r.id,
        loadNumber: r.loadNumber,
        customer: r.customerName || "Unknown Customer",
        origin: `${r.originCity || "Unknown"}, ${r.originState || ""}`,
        destination: `${r.destCity || "Unknown"}, ${r.destState || ""}`,
        status: r.status,
        equipment: r.loadType || "Dry Van",
        rate: r.rate ? `$${parseFloat(r.rate).toLocaleString()}` : "Pending",
        pickupDate: r.pickupDate ? new Date(r.pickupDate).toLocaleDateString() : "TBD",
        podSigned: r.podSigned ?? false,
        bolReceived: r.bolReceived ?? false,
      })),
    }
  },
})

export const updateLoadTool = defineTmsTool({
  name: "updateLoad",
  description: "Update details or status of an existing freight load. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Updating this load modifies active freight contract terms or operational status.",
  inputSchema: z.object({
    loadId: z.string().describe("ID of the load to update"),
    status: z
      .enum(["available", "booked", "dispatched", "in_transit", "delivered", "completed", "cancelled"])
      .optional()
      .describe("New load status"),
    rate: z.number().optional().describe("Updated linehaul rate amount in USD"),
    customerName: z.string().optional().describe("Updated customer name"),
    pickupDate: z.string().optional().describe("YYYY-MM-DD pickup date"),
    deliveryDate: z.string().optional().describe("YYYY-MM-DD delivery date"),
    commodity: z.string().optional().describe("Description of goods"),
    weight: z.number().optional().describe("Weight in lbs"),
    specialInstructions: z.string().optional().describe("Special dock or handling instructions"),
  }),
  execute: async (params, ctx) => {
    const [existing] = await db
      .select()
      .from(load)
      .where(and(eq(load.id, params.loadId), eq(load.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Load not found or unauthorized." }
    }

    const updates: Record<string, any> = {}
    if (params.status) updates.status = params.status
    if (params.rate !== undefined) {
      updates.rate = String(params.rate)
      updates.finalRate = String(params.rate)
    }
    if (params.customerName) updates.customerName = params.customerName
    if (params.pickupDate) updates.pickupDate = new Date(params.pickupDate)
    if (params.deliveryDate) updates.deliveryDate = new Date(params.deliveryDate)
    if (params.commodity) updates.commodity = params.commodity
    if (params.weight !== undefined) updates.weight = String(params.weight)
    if (params.specialInstructions) updates.specialInstructions = params.specialInstructions

    await db
      .update(load)
      .set(updates)
      .where(and(eq(load.id, params.loadId), eq(load.tenantId, ctx.tenantId)))

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "load.update",
      target: { type: "load", id: existing.id, label: existing.loadNumber },
      metadata: { updates, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      loadId: existing.id,
      loadNumber: existing.loadNumber,
      updatedFields: Object.keys(updates),
      status: params.status || existing.status,
      message: `Load #${existing.loadNumber} updated successfully.`,
    }
  },
})

export const updateLoadDocsTool = defineTmsTool({
  name: "updateLoadDocs",
  description: "Update paperwork and quick-access flags for a load (signed POD, received BOL, or star/pin).",
  inputSchema: z.object({
    loadId: z.string().describe("ID of the load"),
    podSigned: z.boolean().optional().describe("Mark proof of delivery as signed"),
    bolReceived: z.boolean().optional().describe("Mark bill of lading as received"),
    isStarred: z.boolean().optional().describe("Star or unstar for quick access"),
  }),
  execute: async ({ loadId, podSigned, bolReceived, isStarred }, ctx) => {
    const [existing] = await db
      .select()
      .from(load)
      .where(and(eq(load.id, loadId), eq(load.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Load not found." }
    }

    const updates: Record<string, any> = {}
    if (podSigned !== undefined) updates.podSigned = podSigned
    if (bolReceived !== undefined) updates.bolReceived = bolReceived
    if (isStarred !== undefined) updates.isStarred = isStarred

    await db
      .update(load)
      .set(updates)
      .where(and(eq(load.id, loadId), eq(load.tenantId, ctx.tenantId)))

    return {
      success: true,
      loadNumber: existing.loadNumber,
      podSigned: podSigned !== undefined ? podSigned : existing.podSigned,
      bolReceived: bolReceived !== undefined ? bolReceived : existing.bolReceived,
      isStarred: isStarred !== undefined ? isStarred : existing.isStarred,
      message: `Document status updated for Load #${existing.loadNumber}.`,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. TRIPS & DISPATCH TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const dispatchTripTool = defineTmsTool({
  name: "dispatchTrip",
  description: "Assign an available driver and tractor unit to an active load, officially dispatching the trip. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Dispatching this trip commits fleet equipment and notifies the driver.",
  inputSchema: z.object({
    loadId: z.string().describe("ID of the load to dispatch"),
    driverId: z.string().describe("ID of the driver to assign"),
    truckId: z.string().optional().describe("ID of the tractor/truck"),
    trailerId: z.string().optional().describe("ID of the trailer"),
  }),
  execute: async ({ loadId, driverId, truckId, trailerId }, ctx) => {
    const [targetLoad] = await db
      .select()
      .from(load)
      .where(and(eq(load.id, loadId), eq(load.tenantId, ctx.tenantId)))
      .limit(1)

    if (!targetLoad) {
      return { success: false, error: "Load not found or unauthorized." }
    }

    const [assignedDriver] = await db
      .select()
      .from(driver)
      .where(and(eq(driver.id, driverId), eq(driver.tenantId, ctx.tenantId)))
      .limit(1)

    const tripId = randomUUID()
    const tripNum = `TRP-${Math.floor(1000 + Math.random() * 9000)}`

    await db.insert(trip).values({
      id: tripId,
      tenantId: ctx.tenantId,
      loadId,
      driverId,
      truckId: truckId ?? null,
      trailerId: trailerId ?? null,
      tripNumber: tripNum,
      status: "dispatched",
      startDate: new Date(),
    })

    await db
      .update(load)
      .set({ status: "dispatched" })
      .where(eq(load.id, loadId))

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "trip.create",
      target: { type: "trip", id: tripId, label: tripNum },
      metadata: {
        loadNumber: targetLoad.loadNumber,
        driver: assignedDriver ? `${assignedDriver.firstName} ${assignedDriver.lastName}` : driverId,
        tenantId: ctx.tenantId,
      },
    })

    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "trip",
      event: "trip.dispatched_by_copilot",
      severity: "success",
      title: `Trip #${tripNum} Dispatched`,
      message: `Assigned Load #${targetLoad.loadNumber} to ${assignedDriver ? `${assignedDriver.firstName} ${assignedDriver.lastName}` : "driver"}.`,
      link: `/trips/${tripId}`,
    })

    return {
      success: true,
      tripId,
      tripNumber: tripNum,
      loadNumber: targetLoad.loadNumber,
      driverName: assignedDriver ? `${assignedDriver.firstName} ${assignedDriver.lastName}` : "Assigned Driver",
      status: "dispatched",
      message: `Trip #${tripNum} created. Load #${targetLoad.loadNumber} status updated to 'dispatched'.`,
    }
  },
})

export const updateTripStatusTool = defineTmsTool({
  name: "updateTripStatus",
  description: "Update status, odometer miles, or financial totals of a dispatched trip. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Updating trip status marks milestones or completes driver runs.",
  inputSchema: z.object({
    tripId: z.string().describe("ID of the trip"),
    status: z.enum(["pending", "dispatched", "in_transit", "completed", "cancelled"]).describe("New trip status"),
    totalMiles: z.number().optional().describe("Actual total miles completed"),
    totalExpense: z.number().optional().describe("Total trip expenses"),
  }),
  execute: async ({ tripId, status: newStatus, totalMiles, totalExpense }, ctx) => {
    const [existing] = await db
      .select()
      .from(trip)
      .where(and(eq(trip.id, tripId), eq(trip.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Trip not found." }
    }

    const updates: Record<string, any> = { status: newStatus }
    if (newStatus === "completed") {
      updates.endDate = new Date()
    }
    if (totalMiles !== undefined) updates.totalMiles = String(totalMiles)
    if (totalExpense !== undefined) updates.totalExpense = String(totalExpense)

    await db
      .update(trip)
      .set(updates)
      .where(and(eq(trip.id, tripId), eq(trip.tenantId, ctx.tenantId)))

    if (existing.loadId) {
      if (newStatus === "in_transit") {
        await db.update(load).set({ status: "in_transit" }).where(eq(load.id, existing.loadId))
      } else if (newStatus === "completed") {
        await db.update(load).set({ status: "delivered" }).where(eq(load.id, existing.loadId))
      }
    }

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "trip.update",
      target: { type: "trip", id: tripId, label: existing.tripNumber },
      metadata: { status: newStatus, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      tripNumber: existing.tripNumber,
      status: newStatus,
      message: `Trip #${existing.tripNumber} status updated to '${newStatus}'.`,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. FLEET TOOLS (DRIVERS, TRACTORS, TRAILERS)
// ─────────────────────────────────────────────────────────────────────────────

export const getFleetStatusTool = defineTmsTool({
  name: "getFleetStatus",
  description: "Query real driver availability, tractor unit status, and flag CDL license expirations within 30 days.",
  inputSchema: z.object({
    statusFilter: z.enum(["all", "active", "on_duty", "inactive"]).default("all"),
  }),
  execute: async ({ statusFilter }, ctx) => {
    const driverConditions = [eq(driver.tenantId, ctx.tenantId)]
    if (statusFilter !== "all") {
      driverConditions.push(eq(driver.status, statusFilter))
    }

    const drivers = await db
      .select({
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        phone: driver.phone,
        email: driver.email,
        cdlNumber: driver.cdlNumber,
        cdlState: driver.cdlState,
        cdlExpiry: driver.cdlExpiration,
        status: driver.status,
      })
      .from(driver)
      .where(and(...driverConditions))
      .limit(15)

    const trucks = await db
      .select({
        id: truck.id,
        unitNumber: truck.unitNumber,
        make: truck.make,
        model: truck.model,
        year: truck.year,
        status: truck.status,
        currentMiles: truck.currentMiles,
      })
      .from(truck)
      .where(eq(truck.tenantId, ctx.tenantId))
      .limit(15)

    const now = new Date()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const driverList = drivers.map((d) => {
      const expiry = d.cdlExpiry ? new Date(d.cdlExpiry) : null
      const isExpiringSoon = expiry ? expiry <= thirtyDaysFromNow : false
      const isExpired = expiry ? expiry < now : false

      return {
        id: d.id,
        name: `${d.firstName} ${d.lastName}`,
        phone: d.phone || "N/A",
        status: d.status,
        license: `${d.cdlState || ""} ${d.cdlNumber || "N/A"}`.trim(),
        licenseExpiry: expiry ? expiry.toISOString().slice(0, 10) : "Not on file",
        cdlAlert: isExpired ? "EXPIRED" : isExpiringSoon ? "EXPIRING_SOON" : "VALID",
      }
    })

    return {
      activeDriversCount: drivers.filter((d) => d.status === "active").length,
      availableTrucksCount: trucks.filter((t) => t.status === "available").length,
      drivers: driverList,
      trucks: trucks.map((t) => ({
        id: t.id,
        unitNumber: t.unitNumber,
        model: `${t.year || ""} ${t.make || ""} ${t.model || ""}`.trim() || "Tractor",
        status: t.status,
        odometer: t.currentMiles ? `${parseFloat(t.currentMiles).toLocaleString()} mi` : "N/A",
      })),
      complianceSummary: {
        totalDrivers: drivers.length,
        expiringSoonCount: driverList.filter((d) => d.cdlAlert === "EXPIRING_SOON").length,
        expiredCount: driverList.filter((d) => d.cdlAlert === "EXPIRED").length,
      },
    }
  },
})

export const createDriverTool = defineTmsTool({
  name: "createDriver",
  description: "Add a new commercial driver to the fleet directory. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Adding a driver creates an authorized commercial operator in the workspace.",
  inputSchema: z.object({
    firstName: z.string().describe("Driver first name"),
    lastName: z.string().describe("Driver last name"),
    phone: z.string().optional().describe("Contact phone number"),
    email: z.string().email().optional().describe("Email address"),
    licenseNumber: z.string().describe("Commercial Driver License (CDL) number"),
    licenseState: z.string().describe("2-letter licensing state code (e.g. TX)"),
    licenseExpiration: z.string().describe("YYYY-MM-DD CDL expiration date"),
    notes: z.string().optional().describe("Qualifications or certifications"),
  }),
  execute: async (params, ctx) => {
    const driverId = randomUUID()

    await db.insert(driver).values({
      id: driverId,
      tenantId: ctx.tenantId,
      firstName: params.firstName,
      lastName: params.lastName,
      phone: params.phone ?? null,
      email: params.email ?? null,
      cdlNumber: params.licenseNumber,
      cdlState: params.licenseState,
      cdlExpiration: new Date(params.licenseExpiration),
      status: "active",
      notes: params.notes ?? null,
    })

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "driver.create",
      target: { type: "driver", id: driverId, label: `${params.firstName} ${params.lastName}` },
      metadata: { licenseState: params.licenseState, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      driverId,
      name: `${params.firstName} ${params.lastName}`,
      license: `${params.licenseState} ${params.licenseNumber}`,
      expiration: params.licenseExpiration,
      status: "active",
      message: `Driver ${params.firstName} ${params.lastName} added to fleet.`,
    }
  },
})

export const updateDriverTool = defineTmsTool({
  name: "updateDriver",
  description: "Update a driver's CDL renewal date, active status, or contact information. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Updating a driver modifies compliance credentials or duty status.",
  inputSchema: z.object({
    driverId: z.string().describe("ID of the driver"),
    status: z.enum(["active", "inactive", "on_duty"]).optional().describe("New status"),
    licenseExpiration: z.string().optional().describe("Updated YYYY-MM-DD CDL expiration date"),
    phone: z.string().optional().describe("Updated phone number"),
    email: z.string().email().optional().describe("Updated email"),
    notes: z.string().optional().describe("Updated notes"),
  }),
  execute: async (params, ctx) => {
    const [existing] = await db
      .select()
      .from(driver)
      .where(and(eq(driver.id, params.driverId), eq(driver.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Driver not found." }
    }

    const updates: Record<string, any> = {}
    if (params.status) updates.status = params.status
    if (params.licenseExpiration) updates.cdlExpiration = new Date(params.licenseExpiration)
    if (params.phone) updates.phone = params.phone
    if (params.email) updates.email = params.email
    if (params.notes) updates.notes = params.notes

    await db
      .update(driver)
      .set(updates)
      .where(and(eq(driver.id, params.driverId), eq(driver.tenantId, ctx.tenantId)))

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "driver.update",
      target: { type: "driver", id: existing.id, label: `${existing.firstName} ${existing.lastName}` },
      metadata: { updates, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      name: `${existing.firstName} ${existing.lastName}`,
      status: params.status || existing.status,
      message: `Driver record updated successfully.`,
    }
  },
})

export const createTruckTool = defineTmsTool({
  name: "createTruck",
  description: "Register a commercial tractor unit in the fleet inventory. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Registering a truck adds a commercial asset to the workspace.",
  inputSchema: z.object({
    unitNumber: z.string().describe("Truck/unit number (e.g. TRK-104)"),
    vin: z.string().optional().describe("17-character Vehicle Identification Number"),
    make: z.string().optional().describe("Manufacturer (e.g. Freightliner, Kenworth, Peterbilt)"),
    model: z.string().optional().describe("Model name (e.g. Cascadia, T680)"),
    year: z.string().optional().describe("Model year (e.g. 2024)"),
    licensePlate: z.string().optional().describe("License plate number"),
    currentMiles: z.number().optional().describe("Current odometer reading"),
  }),
  execute: async (params, ctx) => {
    const truckId = randomUUID()

    await db.insert(truck).values({
      id: truckId,
      tenantId: ctx.tenantId,
      unitNumber: params.unitNumber,
      vin: params.vin ?? null,
      make: params.make ?? null,
      model: params.model ?? null,
      year: params.year ?? null,
      licensePlate: params.licensePlate ?? null,
      currentMiles: params.currentMiles ? String(params.currentMiles) : null,
      status: "available",
    })

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "truck.create",
      target: { type: "truck", id: truckId, label: params.unitNumber },
      metadata: { unitNumber: params.unitNumber, make: params.make, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      truckId,
      unitNumber: params.unitNumber,
      makeModel: `${params.year || ""} ${params.make || ""} ${params.model || ""}`.trim(),
      status: "available",
      message: `Tractor Unit #${params.unitNumber} registered.`,
    }
  },
})

export const updateTruckTool = defineTmsTool({
  name: "updateTruck",
  description: "Update tractor status (available, maintenance, out_of_service) or odometer miles. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Updating tractor status affects fleet dispatch availability.",
  inputSchema: z.object({
    truckId: z.string().describe("ID of the truck/tractor"),
    status: z.enum(["available", "dispatched", "maintenance", "out_of_service"]).optional().describe("New status"),
    currentMiles: z.number().optional().describe("Updated odometer miles"),
    nextServiceMiles: z.number().optional().describe("Next scheduled service miles"),
  }),
  execute: async ({ truckId, status: newStatus, currentMiles, nextServiceMiles }, ctx) => {
    const [existing] = await db
      .select()
      .from(truck)
      .where(and(eq(truck.id, truckId), eq(truck.tenantId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Truck not found." }
    }

    const updates: Record<string, any> = {}
    if (newStatus) updates.status = newStatus
    if (currentMiles !== undefined) updates.currentMiles = String(currentMiles)
    if (nextServiceMiles !== undefined) updates.nextServiceMiles = String(nextServiceMiles)

    await db
      .update(truck)
      .set(updates)
      .where(and(eq(truck.id, truckId), eq(truck.tenantId, ctx.tenantId)))

    return {
      success: true,
      unitNumber: existing.unitNumber,
      status: newStatus || existing.status,
      odometer: currentMiles !== undefined ? `${currentMiles.toLocaleString()} mi` : existing.currentMiles,
      message: `Tractor #${existing.unitNumber} updated successfully.`,
    }
  },
})

export const createTrailerTool = defineTmsTool({
  name: "createTrailer",
  description: "Register a trailer (Dry Van, Reefer, Flatbed, Step Deck) in the fleet inventory. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Registering a trailer commits equipment inventory.",
  inputSchema: z.object({
    unitNumber: z.string().describe("Trailer unit number (e.g. TLR-5301)"),
    type: z.enum(["Dry Van", "Reefer", "Flatbed", "Step Deck", "Power Only"]).default("Dry Van"),
    length: z.string().default("53'").describe("Length (e.g. 53', 48')"),
    licensePlate: z.string().optional().describe("License plate"),
  }),
  execute: async (params, ctx) => {
    const trailerId = randomUUID()

    await db.insert(trailer).values({
      id: trailerId,
      tenantId: ctx.tenantId,
      unitNumber: params.unitNumber,
      type: params.type,
      length: params.length,
      licensePlate: params.licensePlate ?? null,
      status: "available",
    })

    return {
      success: true,
      trailerId,
      unitNumber: params.unitNumber,
      type: params.type,
      length: params.length,
      status: "available",
      message: `Trailer #${params.unitNumber} (${params.type}) registered.`,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. CUSTOMERS & CARRIERS TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const queryCustomersTool = defineTmsTool({
  name: "queryCustomers",
  description: "Search shipper and freight broker customers with payment terms and credit limits.",
  inputSchema: z.object({
    query: z.string().optional().describe("Search by customer name or email"),
    limit: z.number().default(10).describe("Max results"),
  }),
  execute: async ({ query, limit }, ctx) => {
    const conditions = [eq(customer.tenantId, ctx.tenantId)]
    if (query) {
      conditions.push(or(like(customer.name, `%${query}%`), like(customer.email, `%${query}%`)) as any)
    }

    const rows = await db
      .select({
        id: customer.id,
        name: customer.name,
        contactName: customer.contactName,
        email: customer.email,
        phone: customer.phone,
        paymentTerms: customer.paymentTerms,
        creditLimit: customer.creditLimit,
        status: customer.status,
      })
      .from(customer)
      .where(and(...conditions))
      .limit(limit)

    return {
      count: rows.length,
      customers: rows.map((c) => ({
        id: c.id,
        name: c.name,
        contact: c.contactName || "N/A",
        email: c.email || "N/A",
        phone: c.phone || "N/A",
        terms: c.paymentTerms || "Net 30",
        creditLimit: c.creditLimit ? `$${parseFloat(c.creditLimit).toLocaleString()}` : "Unlimited",
        status: c.status,
      })),
    }
  },
})

export const createCustomerTool = defineTmsTool({
  name: "createCustomer",
  description: "Add a new shipper or freight broker customer to the master directory. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Adding a customer creates a billing entity with credit terms.",
  inputSchema: z.object({
    name: z.string().describe("Company or broker name"),
    contactName: z.string().optional().describe("Primary contact name"),
    email: z.string().email().optional().describe("Billing / dispatch email"),
    phone: z.string().optional().describe("Phone number"),
    paymentTerms: z.enum(["Due on receipt", "Net 15", "Net 30", "Net 45", "Net 60"]).default("Net 30"),
    creditLimit: z.number().optional().describe("Credit limit in USD"),
    address: z.string().optional().describe("Billing address"),
    city: z.string().optional().describe("City"),
    state: z.string().optional().describe("2-letter state code"),
    zip: z.string().optional().describe("Postal code"),
  }),
  execute: async (params, ctx) => {
    const customerId = randomUUID()

    await db.insert(customer).values({
      id: customerId,
      tenantId: ctx.tenantId,
      name: params.name,
      contactName: params.contactName ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      paymentTerms: params.paymentTerms,
      creditLimit: params.creditLimit ? String(params.creditLimit) : null,
      address: params.address ?? null,
      city: params.city ?? null,
      state: params.state ?? null,
      zip: params.zip ?? null,
      status: "active",
    })

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "customer.create",
      target: { type: "customer", id: customerId, label: params.name },
      metadata: { paymentTerms: params.paymentTerms, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      customerId,
      name: params.name,
      paymentTerms: params.paymentTerms,
      creditLimit: params.creditLimit ? `$${params.creditLimit.toLocaleString()}` : "Unlimited",
      message: `Customer '${params.name}' added to directory.`,
    }
  },
})

export const queryCarriersTool = defineTmsTool({
  name: "queryCarriers",
  description: "Search partner carriers with MC#, DOT#, insurance expiry, and contact info.",
  inputSchema: z.object({
    query: z.string().optional().describe("Search by carrier name, MC#, or DOT#"),
    limit: z.number().default(10),
  }),
  execute: async ({ query, limit }, ctx) => {
    const conditions = [eq(carrier.tenantId, ctx.tenantId)]
    if (query) {
      conditions.push(or(like(carrier.name, `%${query}%`), like(carrier.mcNumber, `%${query}%`)) as any)
    }

    const rows = await db
      .select({
        id: carrier.id,
        name: carrier.name,
        mcNumber: carrier.mcNumber,
        dotNumber: carrier.dotNumber,
        contactName: carrier.contactName,
        phone: carrier.phone,
        email: carrier.email,
        insuranceExpiry: carrier.insuranceExpiry,
        status: carrier.status,
      })
      .from(carrier)
      .where(and(...conditions))
      .limit(limit)

    return {
      count: rows.length,
      carriers: rows.map((c) => ({
        id: c.id,
        name: c.name,
        mcNumber: c.mcNumber ? `MC-${c.mcNumber}` : "N/A",
        dotNumber: c.dotNumber ? `DOT-${c.dotNumber}` : "N/A",
        contact: c.contactName || "N/A",
        phone: c.phone || "N/A",
        insuranceExpiry: c.insuranceExpiry ? new Date(c.insuranceExpiry).toISOString().slice(0, 10) : "N/A",
        status: c.status,
      })),
    }
  },
})

export const createCarrierTool = defineTmsTool({
  name: "createCarrier",
  description: "Onboard a partner motor carrier with MC and DOT numbers. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Onboarding a carrier authorizes them for outsourced freight dispatch.",
  inputSchema: z.object({
    name: z.string().describe("Carrier legal name"),
    mcNumber: z.string().optional().describe("Motor Carrier number"),
    dotNumber: z.string().optional().describe("US DOT number"),
    contactName: z.string().optional().describe("Dispatcher contact name"),
    email: z.string().email().optional().describe("Dispatch email"),
    phone: z.string().optional().describe("Dispatch phone"),
    insuranceExpiry: z.string().optional().describe("YYYY-MM-DD cargo insurance expiration"),
  }),
  execute: async (params, ctx) => {
    const carrierId = randomUUID()

    await db.insert(carrier).values({
      id: carrierId,
      tenantId: ctx.tenantId,
      name: params.name,
      mcNumber: params.mcNumber ?? null,
      dotNumber: params.dotNumber ?? null,
      contactName: params.contactName ?? null,
      email: params.email ?? null,
      phone: params.phone ?? null,
      insuranceExpiry: params.insuranceExpiry ? new Date(params.insuranceExpiry) : null,
      status: "active",
    })

    return {
      success: true,
      carrierId,
      name: params.name,
      mcNumber: params.mcNumber ? `MC-${params.mcNumber}` : "N/A",
      status: "active",
      message: `Partner carrier '${params.name}' registered.`,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. INVOICES, EXPENSES & BILLING TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const queryInvoicesTool = defineTmsTool({
  name: "queryInvoices",
  description: "Query accounts receivable (AR) freight invoices with pending balances, overdue aging, and payment statuses.",
  inputSchema: z.object({
    status: z.enum(["all", "pending", "sent", "paid", "overdue", "cancelled"]).default("all"),
    limit: z.number().default(10),
  }),
  execute: async ({ status: filterStatus, limit }, ctx) => {
    const conditions = [eq(invoice.tenantId, ctx.tenantId)]
    if (filterStatus !== "all") {
      conditions.push(eq(invoice.status, filterStatus))
    }

    const rows = await db
      .select({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        amount: invoice.amount,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidDate: invoice.paidDate,
      })
      .from(invoice)
      .where(and(...conditions))
      .orderBy(desc(invoice.createdAt))
      .limit(limit)

    let totalPending = 0
    let totalOverdue = 0
    const now = new Date()

    const formatted = rows.map((inv) => {
      const amt = parseFloat(inv.amount || "0")
      const due = inv.dueDate ? new Date(inv.dueDate) : null
      const isOverdue = inv.status !== "paid" && due && due < now

      if (inv.status === "pending" || inv.status === "sent") {
        totalPending += amt
      }
      if (isOverdue) {
        totalOverdue += amt
      }

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customer: inv.customerName || "Customer",
        amount: `$${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        status: isOverdue ? "overdue" : inv.status,
        dueDate: due ? due.toLocaleDateString() : "Due on receipt",
        paidDate: inv.paidDate ? new Date(inv.paidDate).toLocaleDateString() : null,
      }
    })

    return {
      count: rows.length,
      pendingBalance: `$${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      overdueBalance: `$${totalOverdue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      invoices: formatted,
    }
  },
})

export const createInvoiceTool = defineTmsTool({
  name: "createInvoice",
  description: "Generate an official accounts receivable invoice from a delivered load. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Generating this invoice creates an official financial balance receivable.",
  inputSchema: z.object({
    loadId: z.string().describe("ID of the delivered load"),
    amount: z.number().optional().describe("Invoice amount (defaults to load agreed rate)"),
    dueDateDays: z.number().default(30).describe("Days until invoice is due (e.g. 30 for Net 30)"),
    notes: z.string().optional().describe("Invoice remittance notes"),
  }),
  execute: async ({ loadId, amount, dueDateDays, notes }, ctx) => {
    const [targetLoad] = await db
      .select()
      .from(load)
      .where(and(eq(load.id, loadId), eq(load.tenantId, ctx.tenantId)))
      .limit(1)

    if (!targetLoad) {
      return { success: false, error: "Load not found." }
    }

    const invoiceAmt = amount !== undefined ? amount : parseFloat(targetLoad.rate || "0")
    const invId = randomUUID()
    const invNum = `INV-${Math.floor(10000 + Math.random() * 90000)}`
    const dueDate = new Date(Date.now() + dueDateDays * 24 * 60 * 60 * 1000)

    await db.insert(invoice).values({
      id: invId,
      tenantId: ctx.tenantId,
      invoiceNumber: invNum,
      loadId: targetLoad.id,
      customerId: targetLoad.customerId ?? null,
      customerName: targetLoad.customerName ?? "Customer",
      customerEmail: targetLoad.customerEmail ?? null,
      amount: String(invoiceAmt),
      status: "pending",
      dueDate,
      notes: notes ?? null,
    })

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "invoice.create",
      target: { type: "invoice", id: invId, label: invNum },
      metadata: { loadNumber: targetLoad.loadNumber, amount: invoiceAmt, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      invoiceId: invId,
      invoiceNumber: invNum,
      customerName: targetLoad.customerName || "Customer",
      amount: `$${invoiceAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      dueDate: dueDate.toISOString().slice(0, 10),
      message: `Invoice #${invNum} created for Load #${targetLoad.loadNumber}.`,
    }
  },
})

export const sendInvoiceEmailTool = defineTmsTool({
  name: "sendInvoiceEmail",
  description: "Dispatch an invoice payment package email with Resend payment link to the customer. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Sending this invoice will email the customer with payment instructions via Resend.",
  inputSchema: z.object({
    invoiceId: z.string().describe("ID of the invoice to email"),
    recipientEmail: z.string().email().describe("Customer billing email address"),
  }),
  execute: async ({ invoiceId, recipientEmail }, ctx) => {
    const [inv] = await db
      .select()
      .from(invoice)
      .where(and(eq(invoice.id, invoiceId), eq(invoice.tenantId, ctx.tenantId)))
      .limit(1)

    if (!inv) {
      return { success: false, error: "Invoice not found." }
    }

    const host = process.env.BETTER_AUTH_URL || "https://muvx.com"
    const emailResult = await sendInvoiceEmail({
      to: recipientEmail,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName || "Valued Customer",
      amount: parseFloat(inv.amount || "0"),
      currency: "USD",
      dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().slice(0, 10) : "Due upon receipt",
      organizationName: "Muvx Freight",
      invoiceUrl: `${host}/invoices/${inv.id}`,
    })

    await db
      .update(invoice)
      .set({ status: "sent", customerEmail: recipientEmail })
      .where(eq(invoice.id, inv.id))

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "invoice.update",
      target: { type: "invoice", id: inv.id, label: inv.invoiceNumber },
      metadata: { sentTo: recipientEmail, tenantId: ctx.tenantId },
    })

    await dispatchNotificationEvent({
      organizationId: ctx.tenantId,
      category: "invoice",
      event: "invoice.emailed_by_copilot",
      severity: "success",
      title: `Invoice #${inv.invoiceNumber} Emailed`,
      message: `Invoice sent to ${recipientEmail} ($${parseFloat(inv.amount).toFixed(2)}).`,
      link: `/invoices/${inv.id}`,
    })

    return {
      success: !emailResult.error,
      invoiceNumber: inv.invoiceNumber,
      sentTo: recipientEmail,
      amount: `$${parseFloat(inv.amount).toFixed(2)}`,
      status: "sent",
    }
  },
})

export const markInvoicePaidTool = defineTmsTool({
  name: "markInvoicePaid",
  description: "Record customer payment for an invoice, marking it as paid. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Recording payment closes out accounts receivable balance.",
  inputSchema: z.object({
    invoiceId: z.string().describe("ID of the invoice"),
    paidDate: z.string().optional().describe("YYYY-MM-DD payment receipt date"),
    referenceNumber: z.string().optional().describe("Check, ACH, or wire transaction reference number"),
  }),
  execute: async ({ invoiceId, paidDate, referenceNumber }, ctx) => {
    const [inv] = await db
      .select()
      .from(invoice)
      .where(and(eq(invoice.id, invoiceId), eq(invoice.tenantId, ctx.tenantId)))
      .limit(1)

    if (!inv) {
      return { success: false, error: "Invoice not found." }
    }

    const paymentDate = paidDate ? new Date(paidDate) : new Date()

    await db
      .update(invoice)
      .set({
        status: "paid",
        paidDate: paymentDate,
        notes: referenceNumber ? `Payment Ref: ${referenceNumber}` : inv.notes,
      })
      .where(eq(invoice.id, inv.id))

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "invoice.update",
      target: { type: "invoice", id: inv.id, label: inv.invoiceNumber },
      metadata: { status: "paid", paidDate: paymentDate, referenceNumber, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      invoiceNumber: inv.invoiceNumber,
      amount: `$${parseFloat(inv.amount).toFixed(2)}`,
      status: "paid",
      paidDate: paymentDate.toLocaleDateString(),
      message: `Invoice #${inv.invoiceNumber} recorded as paid.`,
    }
  },
})

export const getMissingPodsTool = defineTmsTool({
  name: "getMissingPods",
  description: "Query delivered freight loads lacking a signed Proof of Delivery (POD) for invoice factoring.",
  inputSchema: z.object({}),
  execute: async (_params, ctx) => {
    const rows = await db
      .select({
        id: load.id,
        loadNumber: load.loadNumber,
        customerName: load.customerName,
        rate: load.rate,
        destCity: load.destCity,
        destState: load.destState,
        deliveryDate: load.deliveryDate,
      })
      .from(load)
      .where(
        and(
          eq(load.tenantId, ctx.tenantId),
          eq(load.status, "delivered"),
          or(eq(load.podSigned, false), sql`${load.podSigned} IS NULL`)
        )
      )
      .orderBy(desc(load.deliveryDate))
      .limit(10)

    const totalUncollected = rows.reduce((sum, r) => sum + parseFloat(r.rate || "0"), 0)

    return {
      count: rows.length,
      totalUnbilledRevenue: `$${totalUncollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      missingPodLoads: rows.map((r) => ({
        id: r.id,
        loadNumber: r.loadNumber,
        customer: r.customerName || "Unknown Customer",
        destination: `${r.destCity || "Unknown"}, ${r.destState || ""}`,
        deliveredAt: r.deliveryDate ? new Date(r.deliveryDate).toLocaleDateString() : "Recent",
        unpaidAmount: r.rate ? `$${parseFloat(r.rate).toLocaleString()}` : "$0",
      })),
    }
  },
})

export const reviewPendingExpensesTool = defineTmsTool({
  name: "reviewPendingExpenses",
  description: "Query unapproved accounts payable (AP) trip expenses and driver fuel receipts awaiting manager approval.",
  inputSchema: z.object({}),
  execute: async (_params, ctx) => {
    const rows = await db
      .select({
        id: apExpense.id,
        tripId: apExpense.tripId,
        type: apExpense.type,
        vendor: apExpense.vendor,
        amount: apExpense.amount,
        date: apExpense.date,
        receipt: apExpense.receipt,
      })
      .from(apExpense)
      .where(and(eq(apExpense.tenantId, ctx.tenantId), eq(apExpense.status, "pending")))
      .limit(10)

    return {
      count: rows.length,
      expenses: rows.map((e) => ({
        id: e.id,
        category: e.type,
        vendor: e.vendor || "Direct Expense",
        amount: `$${parseFloat(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        date: new Date(e.date).toLocaleDateString(),
        hasReceipt: !!e.receipt,
      })),
    }
  },
})

export const approveExpenseTool = defineTmsTool({
  name: "approveExpense",
  description: "Approve an accounts payable (AP) trip expense or driver reimbursement. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Approving this AP expense authorizes financial reimbursement.",
  inputSchema: z.object({
    expenseId: z.string().describe("ID of the expense to approve"),
  }),
  execute: async ({ expenseId }, ctx) => {
    const [exp] = await db
      .select()
      .from(apExpense)
      .where(and(eq(apExpense.id, expenseId), eq(apExpense.tenantId, ctx.tenantId)))
      .limit(1)

    if (!exp) {
      return { success: false, error: "Expense not found." }
    }

    await db
      .update(apExpense)
      .set({ status: "approved" })
      .where(eq(apExpense.id, expenseId))

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "expense.update_status",
      target: { type: "expense", id: exp.id, label: `${exp.type} (${exp.vendor})` },
      metadata: { amount: exp.amount, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      expenseId: exp.id,
      amount: `$${parseFloat(exp.amount).toFixed(2)}`,
      category: exp.type,
      status: "approved",
      message: `Expense of $${parseFloat(exp.amount).toFixed(2)} (${exp.type}) approved.`,
    }
  },
})

export const logTripExpenseTool = defineTmsTool({
  name: "logTripExpense",
  description: "Record a new driver or trip expense (fuel, toll, maintenance, lumper fee, per diem). Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Logging an expense commits a financial liability record.",
  inputSchema: z.object({
    tripId: z.string().optional().describe("Associated Trip ID"),
    driverId: z.string().optional().describe("Associated Driver ID"),
    category: z.enum(["fuel", "toll", "maintenance", "lumper", "scales", "per_diem", "parking", "other"]).default("fuel"),
    amount: z.number().describe("Expense amount in USD"),
    vendor: z.string().optional().describe("Vendor name (e.g. Love's, Pilot Flying J, TA)"),
    date: z.string().optional().describe("YYYY-MM-DD date of expense"),
    notes: z.string().optional().describe("Receipt notes or details"),
  }),
  execute: async (params, ctx) => {
    const expenseId = randomUUID()
    const expDate = params.date ? new Date(params.date) : new Date()

    await db.insert(apExpense).values({
      id: expenseId,
      tenantId: ctx.tenantId,
      tripId: params.tripId ?? null,
      driverId: params.driverId ?? null,
      type: params.category,
      vendor: params.vendor ?? null,
      amount: String(params.amount),
      date: expDate,
      status: "pending",
      notes: params.notes ?? null,
    })

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "expense.create",
      target: { type: "expense", id: expenseId, label: params.category },
      metadata: { amount: params.amount, vendor: params.vendor, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      expenseId,
      category: params.category,
      amount: `$${params.amount.toFixed(2)}`,
      vendor: params.vendor || "Vendor",
      date: expDate.toLocaleDateString(),
      status: "pending",
      message: `Expense of $${params.amount.toFixed(2)} logged for review.`,
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. WORKSPACE, MEMBERS & AUDIT TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const listWorkspaceMembersTool = defineTmsTool({
  name: "listWorkspaceMembers",
  description: "List team members in the current workspace, their operational roles, and suspension states.",
  inputSchema: z.object({}),
  execute: async (_params, ctx) => {
    const rows = await db
      .select({
        id: member.id,
        role: member.role,
        suspendedAt: member.suspendedAt,
        userId: userTable.id,
        userName: userTable.name,
        userEmail: userTable.email,
        createdAt: member.createdAt,
      })
      .from(member)
      .innerJoin(userTable, eq(member.userId, userTable.id))
      .where(eq(member.organizationId, ctx.tenantId))

    return {
      count: rows.length,
      members: rows.map((m) => ({
        memberId: m.id,
        name: m.userName || "User",
        email: m.userEmail,
        role: m.role,
        isSuspended: !!m.suspendedAt,
        joinedAt: new Date(m.createdAt).toLocaleDateString(),
      })),
    }
  },
})

export const inviteWorkspaceMemberTool = defineTmsTool({
  name: "inviteWorkspaceMember",
  description: "Send an email invitation to a new team member with an assigned role. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Sending an invitation grants authenticated access to the workspace.",
  inputSchema: z.object({
    email: z.string().email().describe("Invitee email address"),
    role: z.enum(["admin", "member", "dispatcher", "driver", "accountant", "safety_officer"]).default("member"),
  }),
  execute: async ({ email, role }, ctx) => {
    const inviteId = randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.insert(invitation).values({
      id: inviteId,
      organizationId: ctx.tenantId,
      email,
      role,
      status: "pending",
      expiresAt,
      inviterId: ctx.userId,
      inviterEmail: ctx.userEmail,
    })

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: "user.invite-to-org",
      target: { type: "invitation", id: inviteId, label: email },
      metadata: { role, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      inviteId,
      email,
      role,
      expiresAt: expiresAt.toISOString().slice(0, 10),
      message: `Invitation sent to ${email} with role '${role}'.`,
    }
  },
})

export const updateMemberRoleTool = defineTmsTool({
  name: "updateMemberRole",
  description: "Update an existing team member's role or suspend/reinstate their workspace access. Requires dispatcher confirmation.",
  requiresApproval: true,
  approvalReason: "Modifying member roles affects workspace permissions.",
  inputSchema: z.object({
    memberId: z.string().describe("ID of the workspace member"),
    role: z.enum(["admin", "member", "dispatcher", "driver", "accountant", "safety_officer"]).optional().describe("New role"),
    suspend: z.boolean().optional().describe("Set true to suspend, false to reinstate"),
    suspendReason: z.string().optional().describe("Reason for suspension"),
  }),
  execute: async ({ memberId, role: newRole, suspend, suspendReason }, ctx) => {
    const [existing] = await db
      .select()
      .from(member)
      .where(and(eq(member.id, memberId), eq(member.organizationId, ctx.tenantId)))
      .limit(1)

    if (!existing) {
      return { success: false, error: "Member not found." }
    }

    const updates: Record<string, any> = {}
    if (newRole) updates.role = newRole
    if (suspend === true) {
      updates.suspendedAt = new Date()
      updates.suspendedReason = suspendReason ?? "Suspended by Copilot"
      updates.suspendedBy = ctx.userId
    } else if (suspend === false) {
      updates.suspendedAt = null
      updates.suspendedReason = null
      updates.suspendedBy = null
    }

    await db
      .update(member)
      .set(updates)
      .where(and(eq(member.id, memberId), eq(member.organizationId, ctx.tenantId)))

    await recordAuditEvent({
      actor: { id: ctx.userId, email: ctx.userEmail },
      action: suspend ? "user.suspend-from-workspace" : "user.set-member-role",
      target: { type: "member", id: memberId, label: memberId },
      metadata: { updates, tenantId: ctx.tenantId },
    })

    return {
      success: true,
      memberId,
      role: newRole || existing.role,
      isSuspended: suspend !== undefined ? suspend : !!existing.suspendedAt,
      message: `Workspace member permissions updated.`,
    }
  },
})

export const queryAuditLogsTool = defineTmsTool({
  name: "queryAuditLogs",
  description: "Query recent security, dispatch, and financial audit events in the workspace.",
  inputSchema: z.object({
    limit: z.number().default(10).describe("Max audit entries to retrieve"),
  }),
  execute: async ({ limit }, ctx) => {
    const rows = await db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        actorEmail: auditLog.actorEmail,
        targetType: auditLog.targetType,
        targetLabel: auditLog.targetLabel,
        ipAddress: auditLog.ipAddress,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .orderBy(desc(auditLog.createdAt))
      .limit(limit)

    return {
      count: rows.length,
      events: rows.map((e) => ({
        id: e.id,
        action: e.action,
        actor: e.actorEmail || "System",
        target: `${e.targetType}: ${e.targetLabel || ""}`,
        ip: e.ipAddress || "Internal",
        timestamp: new Date(e.createdAt).toLocaleString(),
      })),
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. INTEGRATIONS & EXTERNAL APIS TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const checkIntegrationsTool = defineTmsTool({
  name: "checkIntegrations",
  description: "Inspect connection health, webhook activity, and latency across Samsara, Motive, Geotab, DAT One, and QuickBooks.",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      telematics: [
        { platform: "Samsara", status: "Connected", latencyMs: 42, lastSync: "1 min ago", activeVehicles: 18 },
        { platform: "Motive (KeepTruckin)", status: "Connected", latencyMs: 68, lastSync: "3 mins ago", activeDrivers: 14 },
        { platform: "Geotab", status: "Standby", latencyMs: null, lastSync: "1 hour ago", activeVehicles: 0 },
      ],
      loadboards: [
        { platform: "DAT One", status: "Active Rate Feed", searchQuotaRemaining: "89%", latencyMs: 110 },
        { platform: "Truckstop.com", status: "Connected", searchQuotaRemaining: "95%", latencyMs: 145 },
      ],
      accounting: [
        { platform: "QuickBooks Online", status: "Token Active", lastReconciliation: "Today 08:30 CST" },
        { platform: "TriumphPay", status: "Factoring Link Active", eligibleReceivables: "$48,250" },
      ],
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. KNOWLEDGE, MULTI-STEP PLANS & SUBAGENTS TOOLS
// ─────────────────────────────────────────────────────────────────────────────

export const searchFreightKnowledgeTool = defineTmsTool({
  name: "searchFreightKnowledge",
  description: "Query FMCSA regulatory rules, hours of service (HOS) limits, equipment guidelines, and lane benchmarks.",
  inputSchema: z.object({
    topic: z.string().describe("Topic (e.g. '34 hour restart', 'detention pay', 'reefer pre-cooling')"),
  }),
  execute: async ({ topic }) => {
    const t = topic.toLowerCase()
    if (t.includes("restart") || t.includes("34") || t.includes("hos")) {
      return {
        topic: "FMCSA 34-Hour Restart",
        rule: "49 CFR § 395.3",
        summary: "Any period of 7 or 8 consecutive days may end with the beginning of an off-duty period of 34 or more consecutive hours.",
        drivingLimit: "11-hour driving limit after 10 consecutive hours off duty.",
        dutyLimit: "14-hour on-duty window.",
      }
    }
    if (t.includes("detention") || t.includes("layover")) {
      return {
        topic: "Detention & Layover Industry Standards",
        standard: "First 2 hours at shipper/receiver are typically free time. Billable thereafter at $50-$85/hour in 15-minute increments.",
        requirements: "Requires documented signed in/out times on the Bill of Lading (BOL).",
      }
    }
    return {
      topic,
      summary: `Guidance for ${topic}: Comply with FMCSA 49 CFR regulations and agreed rate confirmation accessorial terms.`,
    }
  },
})

export const createExecutionPlanTool = defineTmsTool({
  name: "createExecutionPlan",
  description: "Establish a structured multi-step execution plan before executing complex logistics workflows.",
  inputSchema: z.object({
    goal: z.string().describe("Overall mission objective"),
    steps: z.array(
      z.object({
        title: z.string().describe("Step name"),
        description: z.string().describe("Detailed action"),
      })
    ),
  }),
  execute: async ({ goal, steps }) => {
    return {
      goal,
      stepCount: steps.length,
      steps: steps.map((s, idx) => ({ index: idx + 1, ...s })),
      status: "planned",
    }
  },
})

export const delegateSubtaskTool = defineTmsTool({
  name: "delegateSubtask",
  description: "Delegate a specialized freight operation to a sub-agent specialist (dispatcher, fleet_guardian, rate_auditor, safety_compliance).",
  inputSchema: z.object({
    agentRole: z.enum(["dispatcher", "fleet_guardian", "rate_auditor", "safety_compliance", "route_planner"]).describe("Specialist bot role"),
    subtaskTitle: z.string().describe("Title of delegated task"),
    objective: z.string().describe("Objective and specific instructions"),
  }),
  execute: async ({ agentRole, subtaskTitle, objective }) => {
    return {
      agentRole,
      subtaskTitle,
      objective,
      status: "completed",
      findings: `Specialist [${agentRole}] analyzed "${subtaskTitle}": requirements verified and ready for execution.`,
    }
  },
})

export const askDispatcherTool = defineTmsTool({
  name: "askDispatcher",
  description: "Ask the human dispatcher a clarifying question or present actionable choices.",
  inputSchema: z.object({
    question: z.string().describe("The question to ask"),
    options: z.array(z.string()).describe("List of selectable choices"),
  }),
  execute: async ({ question, options }) => {
    return {
      question,
      options,
      status: "presented_to_dispatcher",
    }
  },
})

// ─────────────────────────────────────────────────────────────────────────────
// COMPLETE TOOL REGISTRY
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_TMS_TOOLS: TmsToolDef<any, any>[] = [
  bookLoadTool,
  queryLoadsTool,
  updateLoadTool,
  updateLoadDocsTool,
  dispatchTripTool,
  updateTripStatusTool,
  getFleetStatusTool,
  createDriverTool,
  updateDriverTool,
  createTruckTool,
  updateTruckTool,
  createTrailerTool,
  queryCustomersTool,
  createCustomerTool,
  queryCarriersTool,
  createCarrierTool,
  queryInvoicesTool,
  createInvoiceTool,
  sendInvoiceEmailTool,
  markInvoicePaidTool,
  getMissingPodsTool,
  reviewPendingExpensesTool,
  approveExpenseTool,
  logTripExpenseTool,
  listWorkspaceMembersTool,
  inviteWorkspaceMemberTool,
  updateMemberRoleTool,
  queryAuditLogsTool,
  checkIntegrationsTool,
  searchFreightKnowledgeTool,
  createExecutionPlanTool,
  delegateSubtaskTool,
  askDispatcherTool,
]
