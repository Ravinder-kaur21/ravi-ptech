"use client"

import * as React from "react"
import Link from "next/link"
import {
  Receipt,
  Search,
  Truck,
  FileText,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Fuel,
  ArrowUpRight,
} from "lucide-react"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ExpenseStatusActions } from "@/components/tms/expense-status-actions"
import { formatWorkspaceDate } from "@/lib/timezone"

export interface ExpenseRecord {
  id: string
  tripId?: string | null
  driverId?: string | null
  type: string
  amount: string
  currency?: string | null
  vendor?: string | null
  date: Date | string
  receipt?: string | null
  status: string
  notes?: string | null
  tripNumber?: string | null
  loadNumber?: string | null
  driverFirstName?: string | null
  driverLastName?: string | null
}

interface AccountsPayableTableViewProps {
  expenses: ExpenseRecord[]
  timeZone?: string | null
}

export function AccountsPayableTableView({
  expenses,
  timeZone,
}: AccountsPayableTableViewProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "pending" | "approved" | "reimbursed">("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  const pendingCount = React.useMemo(() => {
    return expenses.filter((e) => e.status === "pending").length
  }, [expenses])

  const approvedCount = React.useMemo(() => {
    return expenses.filter((e) => e.status === "approved").length
  }, [expenses])

  const reimbursedCount = React.useMemo(() => {
    return expenses.filter((e) => e.status === "reimbursed").length
  }, [expenses])

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      // Tab filter
      if (activeTab === "pending" && e.status !== "pending") {
        return false
      }
      if (activeTab === "approved" && e.status !== "approved") {
        return false
      }
      if (activeTab === "reimbursed" && e.status !== "reimbursed") {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchVendor = (e.vendor || "").toLowerCase().includes(q)
        const matchType = (e.type || "").toLowerCase().includes(q)
        const matchTrip = (e.tripNumber || "").toLowerCase().includes(q)
        const matchLoad = (e.loadNumber || "").toLowerCase().includes(q)
        const matchDriver = `${e.driverFirstName || ""} ${e.driverLastName || ""}`.toLowerCase().includes(q)
        const matchReceipt = (e.receipt || "").toLowerCase().includes(q)
        const matchNotes = (e.notes || "").toLowerCase().includes(q)

        return (
          matchVendor ||
          matchType ||
          matchTrip ||
          matchLoad ||
          matchDriver ||
          matchReceipt ||
          matchNotes
        )
      }

      return true
    })
  }, [expenses, activeTab, searchQuery])

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* ─── Search & Tab Filters Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "all" | "pending" | "approved" | "reimbursed")}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-brand-rule dark:border-zinc-800 p-0.5 h-8.5 rounded-lg">
            <TabsTrigger
              value="all"
              className="text-xs px-3 data-[state=active]:bg-brand-card dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-brand-ink dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              All Receipts
              <span className="font-mono text-[10px] text-brand-muted-soft px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {expenses.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="text-xs px-3 data-[state=active]:bg-brand-card dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-brand-ink dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Pending Review
              <span className="font-mono text-[10px] text-brand-accent font-semibold px-1.5 py-0.5 bg-brand-accent-tint dark:bg-orange-950/40 rounded-full">
                {pendingCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="text-xs px-3 data-[state=active]:bg-brand-card dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-brand-ink dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Approved
              <span className="font-mono text-[10px] text-blue-600 font-semibold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded-full">
                {approvedCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="reimbursed"
              className="text-xs px-3 data-[state=active]:bg-brand-card dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-brand-ink dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Settled
              <span className="font-mono text-[10px] text-emerald-600 font-semibold px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
                {reimbursedCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-brand-muted-soft" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, category, driver, trip..."
            className="h-8.5 pl-8.5 text-xs bg-brand-card dark:bg-zinc-950 border-brand-rule dark:border-zinc-800 rounded-lg placeholder:text-brand-muted-soft text-brand-ink"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-brand-muted-soft hover:text-brand-ink dark:hover:text-zinc-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Compact, Balanced Shadcn Table (7 Columns) ─── */}
      <Card className="border-brand-rule dark:border-zinc-800 bg-brand-card dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl w-full min-w-0">
        <Table className="w-full">
          <TableHeader className="bg-brand-cream-soft/60 dark:bg-zinc-900/60 border-b border-brand-rule dark:border-zinc-800">
            <TableRow className="hover:bg-transparent border-brand-rule dark:border-zinc-800">
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-3.5 w-24">
                Date
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-3.5 min-w-[130px] max-w-[200px]">
                Vendor & Notes
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-3.5 min-w-[120px]">
                Category / Ref
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-3.5 min-w-[130px]">
                Trip & Driver
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-3.5 text-right w-24">
                Amount
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-3.5 w-28">
                Status
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-brand-muted-soft h-9 px-3.5 text-right w-36">
                Action
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-brand-rule dark:divide-zinc-800/80">
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-brand-muted-soft">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <div className="size-8 rounded-full bg-brand-accent-tint flex items-center justify-center mb-1">
                      <Receipt className="size-4 text-brand-accent" />
                    </div>
                    <p className="font-medium text-brand-ink">
                      No matching expenses found
                    </p>
                    <p className="text-[11px] text-brand-muted-soft">
                      {searchQuery
                        ? "Try clearing your search criteria"
                        : "No expenses logged in this status tab"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((e) => {
                const amt = parseFloat(e.amount || "0")
                return (
                  <TableRow
                    key={e.id}
                    className="hover:bg-brand-cream-soft/40 dark:hover:bg-zinc-900/50 transition-colors border-brand-rule dark:border-zinc-800/80"
                  >
                    {/* Date */}
                    <TableCell className="px-3.5 py-3 font-mono text-[11px] text-brand-muted-soft whitespace-nowrap">
                      {formatWorkspaceDate(e.date, timeZone, undefined, { mode: "date" })}
                    </TableCell>

                    {/* Vendor & Notes */}
                    <TableCell className="px-3.5 py-3 text-xs text-brand-ink max-w-[200px]">
                      <p className="font-medium truncate">{e.vendor || "—"}</p>
                      {e.notes && (
                        <p className="text-[10px] text-brand-muted-soft truncate">{e.notes}</p>
                      )}
                    </TableCell>

                    {/* Category & Receipt */}
                    <TableCell className="px-3.5 py-3">
                      <div className="space-y-1">
                        <CategoryBadge type={e.type} />
                        {e.receipt && (
                          <p className="text-[10px] text-brand-muted-soft font-mono flex items-center gap-1 truncate max-w-[140px]">
                            <FileText className="size-2.5 shrink-0" />
                            <span className="truncate">{e.receipt}</span>
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Trip & Driver */}
                    <TableCell className="px-3.5 py-3 text-xs">
                      <div className="space-y-0.5">
                        {e.tripNumber ? (
                          <Link
                            href="/trips"
                            className="inline-flex items-center gap-1 font-mono text-xs text-brand-accent hover:underline font-semibold"
                          >
                            <Truck className="size-3 shrink-0" />
                            <span>{e.tripNumber}</span>
                            {e.loadNumber && (
                              <span className="text-brand-muted-soft font-normal text-[10px]">
                                ({e.loadNumber})
                              </span>
                            )}
                          </Link>
                        ) : (
                          <span className="text-brand-muted-soft text-xs font-mono">—</span>
                        )}
                        {e.driverFirstName && (
                          <p className="text-[10px] text-brand-muted-soft truncate flex items-center gap-1">
                            <User className="size-2.5 shrink-0 text-brand-muted-soft" />
                            <span>{e.driverFirstName} {e.driverLastName}</span>
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="px-3.5 py-3 text-right font-mono text-xs font-bold text-brand-ink whitespace-nowrap">
                      ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-3.5 py-3 whitespace-nowrap">
                      <ExpenseStatusBadge status={e.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-3.5 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end">
                        <ExpenseStatusActions
                          expenseId={e.id}
                          currentStatus={e.status}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function CategoryBadge({ type }: { type: string }) {
  const lower = (type || "").toLowerCase()
  if (lower.includes("fuel") || lower.includes("def")) {
    return (
      <Badge
        variant="outline"
        className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 text-[10px]"
      >
        {type}
      </Badge>
    )
  }
  if (lower.includes("toll")) {
    return (
      <Badge
        variant="outline"
        className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-[10px]"
      >
        {type}
      </Badge>
    )
  }
  if (lower.includes("scale") || lower.includes("cat")) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]"
      >
        {type}
      </Badge>
    )
  }
  if (lower.includes("lumper")) {
    return (
      <Badge
        variant="outline"
        className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"
      >
        {type}
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="text-[10px] border-brand-rule text-brand-ink">
      {type}
    </Badge>
  )
}

function ExpenseStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "approved":
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-[10px]"
        >
          Approved
        </Badge>
      )
    case "reimbursed":
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"
        >
          Reimbursed
        </Badge>
      )
    case "rejected":
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 text-[10px]"
        >
          Rejected
        </Badge>
      )
    case "pending":
    default:
      return (
        <Badge
          variant="outline"
          className="bg-brand-accent-tint text-brand-accent border-brand-accent/20 dark:bg-orange-950/40 dark:text-orange-400 text-[10px]"
        >
          Pending Review
        </Badge>
      )
  }
}
