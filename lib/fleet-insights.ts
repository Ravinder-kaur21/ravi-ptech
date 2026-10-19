import { generateText } from "ai"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { db } from "@/lib/db"
import { getModel } from "@/lib/ai-providers"
import { load, trip, truck } from "@/lib/schema"

export type FleetInsightRows = {
  trucks: Array<{
    id: string
    unitNumber: string
    status: string
    currentMiles: string | null
    nextServiceMiles: string | null
    nextServiceDate: Date | null
  }>
  trips: Array<{
    id: string
    tripNumber: string
    truckId: string | null
    loadId: string | null
    status: string
    totalMiles: string | null
    totalRevenue: string | null
    totalExpense: string | null
  }>
  loads: Array<{
    id: string
    loadNumber: string
    status: string
    actualProfit: string | null
    miles: string | null
    deadhead: string | null
    pickupDate: Date | null
    deliveryDate: Date | null
    originAppointment: Date | null
    destAppointment: Date | null
  }>
}

export type FleetInsightSummary = {
  trucks: number
  trips: number
  loads: number
  serviceSchedulesEvaluated: number
  serviceSchedulesIncomplete: number
  serviceDue: number
  activeFleet: number
  trucksOnActiveTrips: number
  availableTrucks: number
  profitRecordsEvaluated: number
  totalProfit: number | null
  nonPositiveProfitRecords: number
  deadheadLoadsEvaluated: number
  deadheadMilesRecorded: number
  routeMilesRecorded: number
  deliveryActualsAvailable: false
}

type FleetInsightSource = {
  trucks(tenantId: string): Promise<FleetInsightRows["trucks"]>
  trips(tenantId: string): Promise<FleetInsightRows["trips"]>
  loads(tenantId: string): Promise<FleetInsightRows["loads"]>
}

const tenantSource: FleetInsightSource = {
  trucks: (tenantId) =>
    db
      .select({
        id: truck.id,
        unitNumber: truck.unitNumber,
        status: truck.status,
        currentMiles: truck.currentMiles,
        nextServiceMiles: truck.nextServiceMiles,
        nextServiceDate: truck.nextServiceDate,
      })
      .from(truck)
      .where(eq(truck.tenantId, tenantId)),
  trips: (tenantId) =>
    db
      .select({
        id: trip.id,
        tripNumber: trip.tripNumber,
        truckId: trip.truckId,
        loadId: trip.loadId,
        status: trip.status,
        totalMiles: trip.totalMiles,
        totalRevenue: trip.totalRevenue,
        totalExpense: trip.totalExpense,
      })
      .from(trip)
      .where(eq(trip.tenantId, tenantId)),
  loads: (tenantId) =>
    db
      .select({
        id: load.id,
        loadNumber: load.loadNumber,
        status: load.status,
        actualProfit: load.actualProfit,
        miles: load.miles,
        deadhead: load.deadhead,
        pickupDate: load.pickupDate,
        deliveryDate: load.deliveryDate,
        originAppointment: load.originAppointment,
        destAppointment: load.destAppointment,
      })
      .from(load)
      .where(eq(load.tenantId, tenantId)),
}

function parseStoredNumber(value: string | null | undefined): number | null {
  if (value == null) return null
  const normalized = value.trim().replace(/[$,\s]/g, "")
  if (!/^-?(?:\d+\.?\d*|\.\d+)$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function utcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function activeTripStatus(status: string): boolean {
  return ["active", "dispatched", "in_progress", "in_transit"].includes(
    status.trim().toLowerCase(),
  )
}

export function calculateFleetInsights(
  rows: FleetInsightRows,
  asOf = new Date(),
): FleetInsightSummary {
  const today = utcDateKey(asOf)
  let serviceSchedulesEvaluated = 0
  let serviceSchedulesIncomplete = 0
  let serviceDue = 0

  for (const vehicle of rows.trucks) {
    const nextMiles = parseStoredNumber(vehicle.nextServiceMiles)
    const currentMiles = parseStoredNumber(vehicle.currentMiles)
    const dueDate = vehicle.nextServiceDate
      ? utcDateKey(vehicle.nextServiceDate)
      : null
    const mileageKnown = nextMiles !== null && currentMiles !== null
    const dateKnown = dueDate !== null
    if (nextMiles !== null && currentMiles === null) {
      serviceSchedulesIncomplete += 1
    }
    if (!mileageKnown && !dateKnown) {
      if (nextMiles === null && !vehicle.nextServiceDate) {
        serviceSchedulesIncomplete += 1
      }
      continue
    }
    serviceSchedulesEvaluated += 1

    const mileageOverdue =
      mileageKnown && currentMiles !== null && currentMiles > nextMiles
    const mileageDue =
      mileageKnown && currentMiles !== null && currentMiles === nextMiles
    const dateOverdue = dateKnown && dueDate < today
    const dateDue = dateKnown && dueDate === today
    const due = mileageOverdue || mileageDue || dateOverdue || dateDue
    if (!due) continue
    serviceDue += 1

  }

  const truckById = new Map(rows.trucks.map((vehicle) => [vehicle.id, vehicle]))
  const assignedActiveTruckIds = new Set(
    rows.trips
      .filter((row) => activeTripStatus(row.status) && row.truckId)
      .map((row) => row.truckId!)
      .filter((truckId) => truckById.has(truckId)),
  )
  const activeFleet = rows.trucks.filter(
    (vehicle) =>
      !["maintenance", "out_of_service", "retired"].includes(
        vehicle.status.trim().toLowerCase(),
      ),
  )
  const trucksOnActiveTrips = activeFleet.filter((vehicle) =>
    assignedActiveTruckIds.has(vehicle.id),
  ).length
  const availableTrucks = activeFleet.length - trucksOnActiveTrips

  const profitRecords: Array<{
    id: string
    entity: string
    href: string
    profit: number
    source: "trip" | "load"
  }> = []
  const completeTripLoadIds = new Set<string>()

  for (const tripRow of rows.trips) {
    const revenue = parseStoredNumber(tripRow.totalRevenue)
    const expense = parseStoredNumber(tripRow.totalExpense)
    if (revenue === null || expense === null) continue
    if (tripRow.loadId) completeTripLoadIds.add(tripRow.loadId)
    profitRecords.push({
      id: `trip-profit-${tripRow.id}`,
      entity: `Trip ${tripRow.tripNumber}`,
      href: "/trips",
      profit: revenue - expense,
      source: "trip",
    })
  }
  for (const loadRow of rows.loads) {
    if (completeTripLoadIds.has(loadRow.id)) continue
    const actualProfit = parseStoredNumber(loadRow.actualProfit)
    if (actualProfit === null) continue
    profitRecords.push({
      id: `load-profit-${loadRow.id}`,
      entity: `Load ${loadRow.loadNumber}`,
      href: `/loads/${encodeURIComponent(loadRow.id)}`,
      profit: actualProfit,
      source: "load",
    })
  }

  const nonPositiveProfits = profitRecords.filter((record) => record.profit <= 0)
  const totalProfit =
    profitRecords.length > 0
      ? profitRecords.reduce((total, record) => total + record.profit, 0)
      : null
  const deadheadRecords = rows.loads.flatMap((row) => {
    const deadhead = parseStoredNumber(row.deadhead)
    const miles = parseStoredNumber(row.miles)
    return deadhead !== null && miles !== null
      ? [{ deadhead, miles }]
      : []
  })
  const deadheadMilesRecorded = deadheadRecords.reduce(
    (total, row) => total + row.deadhead,
    0,
  )
  const routeMilesRecorded = deadheadRecords.reduce(
    (total, row) => total + row.miles,
    0,
  )

  return {
    trucks: rows.trucks.length,
    trips: rows.trips.length,
    loads: rows.loads.length,
    serviceSchedulesEvaluated,
    serviceSchedulesIncomplete,
    serviceDue,
    activeFleet: activeFleet.length,
    trucksOnActiveTrips,
    availableTrucks,
    profitRecordsEvaluated: profitRecords.length,
    totalProfit,
    nonPositiveProfitRecords: nonPositiveProfits.length,
    deadheadLoadsEvaluated: deadheadRecords.length,
    deadheadMilesRecorded,
    routeMilesRecorded,
    deliveryActualsAvailable: false,
  }
}

const explanationSchema = z.string().trim().min(6).max(180)
const NIM_FLEET_INSIGHTS_MODEL = "meta/llama-3.1-8b-instruct"

export async function explainFleetInsights(summary: FleetInsightSummary) {
  if (!process.env.NIM_API_KEY) {
    return {
      explanation: null,
      aiStatus: "not_configured" as const,
    }
  }

  try {
    const { text } = await generateText({
      model: getModel("nim", NIM_FLEET_INSIGHTS_MODEL),
      system:
        "Write one short, factual fleet summary using only the supplied aggregate metrics. Do not add recommendations, invent metrics, or imply delivery performance is available.",
      prompt: JSON.stringify({
        trucks: summary.trucks,
        trips: summary.trips,
        loads: summary.loads,
        serviceSchedulesEvaluated: summary.serviceSchedulesEvaluated,
        serviceSchedulesIncomplete: summary.serviceSchedulesIncomplete,
        serviceDue: summary.serviceDue,
        activeFleet: summary.activeFleet,
        trucksOnActiveTrips: summary.trucksOnActiveTrips,
        availableTrucks: summary.availableTrucks,
        profitRecordsEvaluated: summary.profitRecordsEvaluated,
        totalProfit: summary.totalProfit,
        nonPositiveProfitRecords: summary.nonPositiveProfitRecords,
        deadheadLoadsEvaluated: summary.deadheadLoadsEvaluated,
        deadheadMilesRecorded: summary.deadheadMilesRecorded,
        routeMilesRecorded: summary.routeMilesRecorded,
        deliveryActualsAvailable: summary.deliveryActualsAvailable,
      }),
      temperature: 0.2,
      maxOutputTokens: 60,
      abortSignal: AbortSignal.timeout(4_000),
    })
    const validated = explanationSchema.safeParse(text)
    if (!validated.success) {
      return { explanation: null, aiStatus: "unavailable" as const }
    }
    return { explanation: validated.data, aiStatus: "available" as const }
  } catch (error) {
    console.error("[FLEET-INSIGHTS] NVIDIA NIM explanation unavailable", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    return { explanation: null, aiStatus: "unavailable" as const }
  }
}

export async function getFleetInsights(
  tenantId: string,
  source: FleetInsightSource = tenantSource,
): Promise<FleetInsightSummary> {
  const [trucks, trips, loads] = await Promise.all([
    source.trucks(tenantId),
    source.trips(tenantId),
    source.loads(tenantId),
  ])
  return calculateFleetInsights({ trucks, trips, loads })
}
