"use client"

import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowUpRight,
  CircleAlert,
  CircleDollarSign,
  Clock3,
  Gauge,
  RefreshCw,
  Truck,
  Wrench,
} from "lucide-react"
import { Card } from "@/components/ui/card"

type FleetInsightsResponse = {
  summary: {
    trucks: number
    trips: number
    loads: number
    serviceSchedulesIncomplete: number
    serviceDue: number
    activeFleet: number
    availableTrucks: number
    profitRecordsEvaluated: number
    totalProfit: number | null
  }
  aiAvailable: boolean
}

type FleetExplanationResponse = {
  explanation: string | null
  aiStatus: "available" | "unavailable" | "not_configured"
}

type InsightCardData = {
  title: string
  value: string
  detail: string
  href: string
  tone: "neutral" | "positive" | "warning" | "muted"
  icon: typeof Truck
}

const toneStyles = {
  neutral: "bg-brand-accent-tint text-brand-accent",
  positive: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  muted: "bg-brand-cream-soft text-brand-muted-soft",
}

async function fetchFleetInsights(): Promise<FleetInsightsResponse> {
  const response = await fetch("/api/fleet/insights", { cache: "no-store" })
  if (!response.ok) throw new Error("Insights could not be loaded.")
  return response.json() as Promise<FleetInsightsResponse>
}

async function fetchFleetExplanation(): Promise<FleetExplanationResponse> {
  const response = await fetch("/api/fleet/insights?explain=1", {
    cache: "no-store",
  })
  if (!response.ok) throw new Error("AI summary unavailable.")
  return response.json() as Promise<FleetExplanationResponse>
}

function formatCurrency(value: number | null): string {
  if (value === null) return "Not enough data"
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

function getCards(summary: FleetInsightsResponse["summary"]): InsightCardData[] {
  const utilization =
    summary.activeFleet > 0
      ? {
          value: `${summary.availableTrucks} available`,
          detail: `${summary.activeFleet} operational`,
          tone: summary.availableTrucks > 0 ? "positive" as const : "warning" as const,
        }
      : {
          value: summary.trucks > 0 ? "0 available" : "No trucks",
          detail: summary.trucks > 0 ? "No operational trucks" : "Add trucks to track use",
          tone: "muted" as const,
        }

  const maintenance =
    summary.serviceDue > 0
      ? {
          value: `${summary.serviceDue} service${summary.serviceDue === 1 ? "" : "s"} due`,
          detail: summary.serviceSchedulesIncomplete
            ? `${summary.serviceSchedulesIncomplete} schedule${summary.serviceSchedulesIncomplete === 1 ? "" : "s"} incomplete`
            : "Schedule service",
          tone: "warning" as const,
        }
      : summary.serviceSchedulesIncomplete > 0 || summary.trucks === 0
        ? {
            value: "Not enough data",
            detail: "Add service dates or mileage",
            tone: "muted" as const,
          }
        : {
            value: "No services due",
            detail: "Based on recorded schedules",
            tone: "positive" as const,
          }

  const profitability =
    summary.totalProfit === null
      ? {
          value: "Not enough data",
          detail: "Record trip revenue and expenses",
          tone: "muted" as const,
        }
      : {
          value: formatCurrency(summary.totalProfit),
          detail: `From ${summary.profitRecordsEvaluated} recorded item${summary.profitRecordsEvaluated === 1 ? "" : "s"}`,
          tone:
            summary.totalProfit < 0
              ? "warning" as const
              : summary.totalProfit === 0
                ? "neutral" as const
                : "positive" as const,
        }

  return [
    {
      title: "Fleet utilization",
      ...utilization,
      href: "/trips",
      icon: Gauge,
    },
    {
      title: "Maintenance alerts",
      ...maintenance,
      href: "/fleet",
      icon: Wrench,
    },
    {
      title: "Profitability",
      ...profitability,
      href: "/reports",
      icon: CircleDollarSign,
    },
    {
      title: "Delivery performance",
      value: "Not tracked",
      detail: "Actual delivery times not recorded",
      href: "/loads",
      tone: "muted",
      icon: Clock3,
    },
  ]
}

export function FleetInsights() {
  const { data, error, isPending, refetch, isFetching } = useQuery({
    queryKey: ["fleet-insights"],
    queryFn: fetchFleetInsights,
    staleTime: 60_000,
    retry: 1,
  })
  const explanation = useQuery({
    queryKey: ["fleet-insights-explanation"],
    queryFn: fetchFleetExplanation,
    enabled: Boolean(data?.aiAvailable),
    staleTime: 5 * 60_000,
    retry: false,
  })

  return (
    <section aria-labelledby="fleet-insights-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="fleet-insights-title"
            className="font-serif text-xl tracking-tight text-brand-ink"
          >
            AI Fleet Insights
          </h2>
          {explanation.data?.explanation ? (
            <p className="mt-0.5 max-w-2xl truncate text-xs text-brand-muted-soft">
              {explanation.data.explanation}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          aria-label="Refresh fleet insights"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-brand-rule bg-brand-card text-brand-ink transition-colors hover:bg-brand-cream-soft disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
        </button>
      </div>

      {error ? (
        <Card
          role="alert"
          className="flex items-center justify-between gap-3 border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm text-red-800">Insights unavailable. Try again.</p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="shrink-0 text-sm font-medium text-red-900 underline"
          >
            Retry
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isPending
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  className="h-28 animate-pulse border-brand-rule bg-brand-card p-4"
                >
                  <div className="h-3 w-28 rounded bg-brand-rule/70" />
                  <div className="mt-4 h-5 w-32 rounded bg-brand-rule/50" />
                  <div className="mt-2 h-3 w-24 rounded bg-brand-rule/50" />
                </Card>
              ))
            : data
              ? getCards(data.summary).map((insight) => (
                  <Link
                    key={insight.title}
                    href={insight.href}
                    className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
                    aria-label={`${insight.title}: ${insight.value}. ${insight.detail}`}
                  >
                    <Card className="h-full min-h-28 border-brand-rule bg-brand-card p-4 transition-colors group-hover:border-brand-accent/40 group-hover:bg-brand-cream-soft/40">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-brand-muted-soft">
                          {insight.title}
                        </p>
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${toneStyles[insight.tone]}`}
                        >
                          <insight.icon className="size-4" />
                        </span>
                      </div>
                      <p className="mt-3 truncate font-serif text-xl tracking-tight text-brand-ink">
                        {insight.value}
                      </p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="truncate text-[11px] text-brand-muted-soft">
                          {insight.detail}
                        </p>
                        <ArrowUpRight className="size-3.5 shrink-0 text-brand-muted-soft transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </div>
                    </Card>
                  </Link>
                ))
              : (
                  <Card className="col-span-full flex items-center gap-2 border-brand-rule bg-brand-card p-4 text-sm text-brand-muted-soft">
                    <CircleAlert className="size-4" />
                    Insights are not available right now.
                  </Card>
                )}
        </div>
      )}
    </section>
  )
}
