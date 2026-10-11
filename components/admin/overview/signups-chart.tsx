"use client"

/**
 * SignupsChart — signups + active sessions over time.
 *
 * Server-fetched once on the parent server component (admin page).
 * Range toggle (90d/30d/7d) re-fetches via /api/admin/signups.
 */
import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { Spinner } from "@/components/ui/spinner"

type Point = { date: string; signups: number; sessions: number }

const chartConfig = {
  signups: {
    label: "New signups",
    color: "var(--chart-1)",
  },
  sessions: {
    label: "Active sessions",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

export function SignupsChart() {
  const isMobile = useIsMobile()
  const [range, setRange] = React.useState<"90d" | "30d" | "7d">("90d")
  const [data, setData] = React.useState<Point[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isMobile) setRange("7d")
  }, [isMobile])

  React.useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    console.log(`[OVERVIEW/CHART] fetching range=${range}`)
    fetch(`/api/admin/signups?range=${range}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!cancelled) {
          setData(d.points ?? [])
          const totalSignups = (d.points ?? []).reduce(
            (s: number, p: Point) => s + p.signups,
            0
          )
          console.log(
            `[OVERVIEW/CHART] ✅ ${d.points?.length ?? 0} points, total signups=${totalSignups}`
          )
        }
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(`[OVERVIEW/CHART] fetch failed:`, e)
          setError(e instanceof Error ? e.message : "Failed to load")
          setData([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  const total = React.useMemo(
    () => (data ?? []).reduce((sum: number, d: Point) => sum + d.signups, 0),
    [data]
  )

  return (
    <Card className="@container/card border-brand-rule bg-brand-card">
      <CardHeader>
        <CardTitle className="font-serif text-xl tracking-tight text-brand-ink">
          Signups
        </CardTitle>
        <CardDescription className="font-mono text-[10px] uppercase tracking-[0.04em] text-brand-muted-soft">
          <span className="hidden @[540px]/card:inline">
            {total.toLocaleString()} new accounts in the last{" "}
            {range === "90d" ? "3 months" : range === "30d" ? "30 days" : "7 days"}
          </span>
          <span className="@[540px]/card:hidden">
            Last {range === "90d" ? "3 months" : range === "30d" ? "30 days" : "7 days"}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            value={[range]}
            onValueChange={(v: string[]) => {
              const next = v[0] as typeof range | undefined
              if (next) setRange(next)
            }}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-3! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select
            value={range}
            onValueChange={(v: string | null) => {
              if (v) setRange(v as typeof range)
            }}
          >
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a range"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {loading ? (
          <div className="flex h-[250px] items-center justify-center text-brand-muted-soft">
            <Spinner className="size-4" />
          </div>
        ) : error ? (
          <div className="flex h-[250px] items-center justify-center text-[12.5px] text-brand-accent">
            {error}
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className="aspect-auto h-[250px] w-full"
          >
            <AreaChart data={data ?? []}>
              <defs>
                <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-signups)" stopOpacity={1.0} />
                  <stop offset="95%" stopColor="var(--color-signups)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillSessions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-sessions)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-sessions)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--brand-rule)" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })
                }}
                tick={{ fill: "var(--brand-muted-soft)", fontSize: 11 }}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    }
                    indicator="dot"
                  />
                }
              />
              <Area
                dataKey="sessions"
                type="natural"
                fill="url(#fillSessions)"
                stroke="var(--color-sessions)"
                stackId="a"
              />
              <Area
                dataKey="signups"
                type="natural"
                fill="url(#fillSignups)"
                stroke="var(--color-signups)"
                stackId="a"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
