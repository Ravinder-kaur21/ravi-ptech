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
    <div className="space-y-4">
      {/* ─── Search & Tab Filters Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "all" | "pending" | "approved" | "reimbursed")}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 p-0.5 h-8.5 rounded-lg">
            <TabsTrigger
              value="all"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              All Receipts
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {expenses.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Pending Review
              <span className="font-mono text-[10px] text-amber-700 font-semibold px-1 bg-amber-100/60 dark:bg-amber-950/40 rounded-full">
                {pendingCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="approved"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Approved
              <span className="font-mono text-[10px] text-blue-600 font-semibold px-1 bg-blue-50 dark:bg-blue-950/40 rounded-full">
                {approvedCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="reimbursed"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Settled
              <span className="font-mono text-[10px] text-emerald-600 font-semibold px-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
                {reimbursedCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor, category, driver, trip..."
            className="h-8.5 pl-8.5 text-xs bg-[#fdfbf7] dark:bg-zinc-950 border-[#e4ddd3] dark:border-zinc-800 rounded-lg placeholder:text-[#8a8b8f]"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8a8b8f] hover:text-[#16181d] dark:hover:text-zinc-100"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Shadcn Table ─── */}
      <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl">
        <Table>
          <TableHeader className="bg-[#f7f3ec]/80 dark:bg-zinc-900/60 border-b border-[#e4ddd3] dark:border-zinc-800">
            <TableRow className="hover:bg-transparent border-[#e4ddd3] dark:border-zinc-800">
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Date
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Category
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Vendor / Merchant
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Trip & Load
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Driver / Payee
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Receipt Ref
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                Amount
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Status
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-[#e4ddd3] dark:divide-zinc-800/80">
            {filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center text-xs text-[#8a8b8f]">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Receipt className="size-5 text-[#8a8b8f]/60" />
                    <p className="font-medium text-[#16181d] dark:text-zinc-200">
                      No matching expenses found
                    </p>
                    <p className="text-[11px] text-[#8a8b8f]">
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
                    className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                  >
                    {/* Date */}
                    <TableCell className="px-4 py-3 font-mono text-[11px] text-[#8a8b8f]">
                      {formatWorkspaceDate(e.date, timeZone, undefined, { mode: "date" })}
                    </TableCell>

                    {/* Category */}
                    <TableCell className="px-4 py-3">
                      <CategoryBadge type={e.type} />
                    </TableCell>

                    {/* Vendor / Merchant */}
                    <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-100">
                      <p className="font-medium">{e.vendor || "—"}</p>
                      {e.notes && (
                        <p className="text-[10px] text-[#8a8b8f] line-clamp-1">{e.notes}</p>
                      )}
                    </TableCell>

                    {/* Trip & Load */}
                    <TableCell className="px-4 py-3 text-xs">
                      {e.tripNumber ? (
                        <Link
                          href="/trips"
                          className="inline-flex items-center gap-1 font-mono text-[#d9622b] hover:underline"
                        >
                          <Truck className="size-3 shrink-0" />
                          <span>{e.tripNumber}</span>
                          {e.loadNumber && (
                            <span className="text-[#8a8b8f] font-normal">
                              ({e.loadNumber})
                            </span>
                          )}
                        </Link>
                      ) : (
                        <span className="text-[#8a8b8f] text-xs">—</span>
                      )}
                    </TableCell>

                    {/* Driver / Payee */}
                    <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-200">
                      {e.driverFirstName ? (
                        <span className="font-medium">
                          {e.driverFirstName} {e.driverLastName}
                        </span>
                      ) : (
                        <span className="text-[#8a8b8f]">—</span>
                      )}
                    </TableCell>

                    {/* Receipt Ref */}
                    <TableCell className="px-4 py-3 font-mono text-[11px] text-[#16181d] dark:text-zinc-200">
                      {e.receipt ? (
                        <span className="inline-flex items-center gap-1">
                          <FileText className="size-3 text-[#8a8b8f] shrink-0" />
                          {e.receipt}
                        </span>
                      ) : (
                        <span className="text-[#8a8b8f]">—</span>
                      )}
                    </TableCell>

                    {/* Amount */}
                    <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                      ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-3">
                      <ExpenseStatusBadge status={e.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3 text-right">
                      <ExpenseStatusActions
                        expenseId={e.id}
                        currentStatus={e.status}
                      />
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
    <Badge variant="outline" className="text-[10px] border-[#e4ddd3] text-[#16181d] dark:text-zinc-200">
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
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]"
        >
          Pending Review
        </Badge>
      )
  }
}
