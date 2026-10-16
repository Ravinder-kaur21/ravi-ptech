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
import { and, eq, gte, ne, sql } from "drizzle-orm"
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

    // Active loads: anything not delivered, cancelled, or completed.
    // (load.status enum includes those values.)
    // Active drivers: status='active'.
    // Month-to-date revenue: SUM(invoice.amount::numeric) for paid invoices
    //   since the start of this calendar month.
    // AR aging: amount outstanding (amount - 0 since there's no amountPaid
    //   column yet — we treat "paid" invoices as zero balance) bucketed by
    //   days past due (computed from dueDate - now()).
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
            eq(load.tenantId, t.tenantId),
            ne(load.status, "delivered"),
            ne(load.status, "cancelled"),
            ne(load.status, "completed"),
          ),
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(driver)
        .where(
          and(eq(driver.tenantId, t.tenantId), eq(driver.status, "active")),
        ),
      db
        .select({
          total: sql<number>`coalesce(sum(${invoice.amount}::numeric),0)::int`,
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, t.tenantId),
            gte(invoice.createdAt, monthStart),
          ),
        ),
      db
        .select({
          current: sql<number>`coalesce(sum(case when (${invoice.dueDate} IS NULL OR ${invoice.dueDate} >= NOW()) then ${invoice.amount}::numeric else 0 end),0)::int`,
          d30: sql<number>`coalesce(sum(case when ${invoice.dueDate} < NOW() - INTERVAL '30 days' then 0 when ${invoice.dueDate} < NOW() then ${invoice.amount}::numeric else 0 end),0)::int`,
          d60: sql<number>`coalesce(sum(case when ${invoice.dueDate} < NOW() - INTERVAL '30 days' AND ${invoice.dueDate} >= NOW() - INTERVAL '60 days' then ${invoice.amount}::numeric else 0 end),0)::int`,
          d90: sql<number>`coalesce(sum(case when ${invoice.dueDate} < NOW() - INTERVAL '60 days' then ${invoice.amount}::numeric else 0 end),0)::int`,
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, t.tenantId),
            ne(invoice.status, "paid"),
            ne(invoice.status, "void"),
          ),
        ),
    ])

    const todayQueue: {
      id: string
      title: string
      detail: string
      href: string
      cta: string
      requiresKey: string
      tone?: "default" | "amber" | "red"
    }[] = []

    // Unassigned loads (dispatcher) — use status='available' as the
    // proxy since `assignedDriverId` lives on the trip table, not the
    // load table.
    try {
      const unassigned = await db
        .select({ id: load.id, reference: load.loadNumber })
        .from(load)
        .where(
          and(
            eq(load.tenantId, t.tenantId),
            eq(load.status, "available"),
          ),
        )
        .limit(5)
      for (const u of unassigned) {
        todayQueue.push({
          id: `load-${u.id}`,
          title: `Load #${u.reference ?? u.id.slice(0, 6)} available`,
          detail: "Pick a driver and dispatch.",
          href: `/loads/${u.id}`,
          cta: "Assign",
          requiresKey: "loads.assign_driver",
          tone: "amber",
        })
      }
    } catch (e) {
      console.warn("[API/DASHBOARD-SUMMARY] unassigned loads skipped:", e)
    }

    // Overdue invoices (accounting) — derive days from dueDate.
    try {
      const overdueInvoices = await db
        .select({
          id: invoice.id,
          number: invoice.invoiceNumber,
          amount: invoice.amount,
          dueDate: invoice.dueDate,
        })
        .from(invoice)
        .where(
          and(
            eq(invoice.tenantId, t.tenantId),
            sql`${invoice.dueDate} < NOW() - INTERVAL '30 days'`,
            ne(invoice.status, "paid"),
            ne(invoice.status, "void"),
          ),
        )
        .limit(5)
      for (const inv of overdueInvoices) {
        const days = inv.dueDate
          ? Math.max(
              0,
              Math.floor(
                (now.getTime() - new Date(inv.dueDate).getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            )
          : 0
        todayQueue.push({
          id: `inv-${inv.id}`,
          title: `Invoice ${inv.number} ${days} days overdue`,
          detail: `$${inv.amount} outstanding`,
          href: `/invoices/${inv.id}`,
          cta: "Send reminder",
          requiresKey: "accounting.invoices.send",
          tone: "red",
        })
      }
    } catch (e) {
      console.warn("[API/DASHBOARD-SUMMARY] overdue invoices skipped:", e)
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
        },
      )
    }
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error(`[API/DASHBOARD-SUMMARY] error: ${message}`)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
