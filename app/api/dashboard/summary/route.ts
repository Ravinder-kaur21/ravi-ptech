/**
 * GET /api/dashboard/summary
 *
 * Returns aggregated numbers and "today queue" items for the
 * dashboard. Every section is permission-gated on the client;
 * the server returns what the user is allowed to see.
 *
 * The action here is purely a data shaper — the permissions are
 * the runtime filter on the dashboard sections component.
 */
import { NextResponse } from "next/server"
import { and, eq, gte, isNull, ne, sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { load, driver, invoice } from "@/lib/schema"
import { requireTenant, TenantError } from "@/lib/dal"

export const instant = false
export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const t = await requireTenant()
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      [activeLoadsRow],
      [activeDriversRow],
      [revenueRow],
      [arAging],
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(load)
        .where(
          and(
            eq(load.organizationId, t.tenantId),
            ne(load.status, "delivered"),
            ne(load.status, "cancelled"),
            ne(load.status, "completed")
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(driver)
        .where(
          and(eq(driver.organizationId, t.tenantId), eq(driver.status, "active"))
        ),
      db
        .select({ total: sql<number>`coalesce(sum(${invoice.total}),0)::int` })
        .from(invoice)
        .where(
          and(
            eq(invoice.organizationId, t.tenantId),
            gte(invoice.createdAt, monthStart)
          )
        ),
      db
        .select({
          current: sql<number>`coalesce(sum(case when coalesce(${invoice.daysOverdue},0) <= 0 then ${invoice.total} - ${invoice.amountPaid} else 0 end),0)::int`,
          d30: sql<number>`coalesce(sum(case when coalesce(${invoice.daysOverdue},0) between 1 and 30 then ${invoice.total} - ${invoice.amountPaid} else 0 end),0)::int`,
          d60: sql<number>`coalesce(sum(case when coalesce(${invoice.daysOverdue},0) between 31 and 60 then ${invoice.total} - ${invoice.amountPaid} else 0 end),0)::int`,
          d90: sql<number>`coalesce(sum(case when coalesce(${invoice.daysOverdue},0) > 60 then ${invoice.total} - ${invoice.amountPaid} else 0 end),0)::int`,
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.organizationId, t.tenantId),
            sql`${invoice.amountPaid} < ${invoice.total}`,
            ne(invoice.status, "void")
          )
        ),
    ])

    // Today queue: read by category. The client filters by perm.
    const todayQueue: {
      id: string
      title: string
      detail: string
      href: string
      cta: string
      requiresKey: string
      tone?: "default" | "amber" | "red"
    }[] = []

    // Unassigned loads (dispatcher)
    try {
      const unassigned = await db
        .select({ id: load.id, reference: load.referenceNumber })
        .from(load)
        .where(
          and(
            eq(load.organizationId, t.tenantId),
            isNull(load.assignedDriverId),
            ne(load.status, "cancelled")
          )
        )
        .limit(5)
      for (const u of unassigned) {
        todayQueue.push({
          id: `load-${u.id}`,
          title: `Load #${u.reference ?? u.id.slice(0, 6)} unassigned`,
          detail: "Pick a driver and dispatch.",
          href: `/loads/${u.id}`,
          cta: "Assign",
          requiresKey: "loads.assign_driver",
          tone: "amber",
        })
      }
    } catch {
      // load may not have assignedDriverId column; skip.
    }

    // Invoices past 30 days (accounting)
    try {
      const overdueInvoices = await db
        .select({
          id: invoice.id,
          number: invoice.invoiceNumber,
          days: invoice.daysOverdue,
          total: invoice.total,
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.organizationId, t.tenantId),
            sql`coalesce(${invoice.daysOverdue},0) >= 30`,
            ne(invoice.status, "void"),
            ne(invoice.status, "paid")
          )
        )
        .limit(5)
      for (const inv of overdueInvoices) {
        todayQueue.push({
          id: `inv-${inv.id}`,
          title: `Invoice ${inv.number} ${inv.days} days overdue`,
          detail: `$${inv.total} outstanding`,
          href: `/invoices/${inv.id}`,
          cta: "Send reminder",
          requiresKey: "accounting.invoices.send",
          tone: "red",
        })
      }
    } catch {
      // skip if daysOverdue column doesn't exist
    }

    return NextResponse.json({
      kpis: {
        activeLoads: Number(activeLoadsRow?.count ?? 0),
        activeDrivers: Number(activeDriversRow?.count ?? 0),
        revenue: Number(revenueRow?.total ?? 0),
        onTime: null,
      },
      arAging: {
        current: Number(arAging?.current ?? 0),
        d30: Number(arAging?.d30 ?? 0),
        d60: Number(arAging?.d60 ?? 0),
        d90: Number(arAging?.d90 ?? 0),
      },
      safety: {
        dqGaps: 0,
        hosViolations: 0,
        openAccidents: 0,
      },
      todayQueue,
    })
  } catch (err) {
    if (err instanceof TenantError) {
      return NextResponse.json(
        { error: err.code },
        {
          status:
            err.code === "UNAUTHORIZED"
              ? 401
              : err.code === "FORBIDDEN"
                ? 403
                : 409,
        }
      )
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/DASHBOARD-SUMMARY] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
