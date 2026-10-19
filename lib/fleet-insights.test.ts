import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  calculateFleetInsights,
  getFleetInsights,
  type FleetInsightRows,
} from "@/lib/fleet-insights"

const emptyRows: FleetInsightRows = { trucks: [], trips: [], loads: [] }

describe("calculateFleetInsights", () => {
  it("flags service due by date or odometer and does not flag future schedules", () => {
    const result = calculateFleetInsights(
      {
        ...emptyRows,
        trucks: [
          {
            id: "due",
            unitNumber: "T-1",
            status: "available",
            currentMiles: "120000",
            nextServiceMiles: "120000",
            nextServiceDate: null,
          },
          {
            id: "future",
            unitNumber: "T-2",
            status: "available",
            currentMiles: "10000",
            nextServiceMiles: "20000",
            nextServiceDate: new Date("2026-11-01T00:00:00.000Z"),
          },
        ],
      },
      new Date("2026-10-20T12:00:00.000Z"),
    )

    assert.equal(result.serviceDue, 1)
  })

  it("calculates negative trip profit and uses stored load actual profit", () => {
    const result = calculateFleetInsights({
      ...emptyRows,
      trips: [
        {
          id: "trip-1",
          tripNumber: "TR-1",
          truckId: null,
          loadId: "load-1",
          status: "completed",
          totalMiles: "500",
          totalRevenue: "900",
          totalExpense: "950",
        },
      ],
      loads: [
        {
          id: "load-1",
          loadNumber: "LD-1",
          status: "completed",
          actualProfit: "100",
          miles: "400",
          deadhead: "50",
          pickupDate: null,
          deliveryDate: null,
          originAppointment: null,
          destAppointment: null,
        },
        {
          id: "load-2",
          loadNumber: "LD-2",
          status: "completed",
          actualProfit: "-20",
          miles: "600",
          deadhead: "80",
          pickupDate: null,
          deliveryDate: null,
          originAppointment: null,
          destAppointment: null,
        },
      ],
    })

    assert.equal(result.profitRecordsEvaluated, 2)
    assert.equal(result.nonPositiveProfitRecords, 2)
    assert.equal(result.totalProfit, -70)
    assert.equal(result.deadheadMilesRecorded, 130)
    assert.equal(result.routeMilesRecorded, 1000)
  })

  it("reports missing service, financial, and actual-delivery data explicitly", () => {
    const result = calculateFleetInsights({
      ...emptyRows,
      trucks: [
        {
          id: "truck-1",
          unitNumber: "T-1",
          status: "available",
          currentMiles: null,
          nextServiceMiles: "10000",
          nextServiceDate: null,
        },
      ],
    })

    assert.equal(result.serviceSchedulesIncomplete, 1)
    assert.equal(result.profitRecordsEvaluated, 0)
    assert.equal(result.totalProfit, null)
  })

  it("counts only same-workspace truck assignments and passes the tenant to each data query", async () => {
    const tenantCalls: string[] = []
    const result = await getFleetInsights("workspace-a", {
      trucks: async (tenantId) => {
        tenantCalls.push(`trucks:${tenantId}`)
        return [
          {
            id: "tenant-a-truck",
            unitNumber: "A-1",
            status: "available",
            currentMiles: null,
            nextServiceMiles: null,
            nextServiceDate: null,
          },
        ]
      },
      trips: async (tenantId) => {
        tenantCalls.push(`trips:${tenantId}`)
        return [
          {
            id: "tenant-a-trip",
            tripNumber: "A-TRIP",
            truckId: "tenant-b-truck",
            loadId: null,
            status: "in_transit",
            totalMiles: null,
            totalRevenue: null,
            totalExpense: null,
          },
        ]
      },
      loads: async (tenantId) => {
        tenantCalls.push(`loads:${tenantId}`)
        return []
      },
    })

    assert.deepEqual(
      tenantCalls.sort(),
      ["loads:workspace-a", "trips:workspace-a", "trucks:workspace-a"],
    )
    assert.equal(result.trucksOnActiveTrips, 0)
    assert.equal(result.activeFleet, 1)
    assert.equal(result.availableTrucks, 1)
  })
})
