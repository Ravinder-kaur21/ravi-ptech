"use client"

import * as React from "react"
import Link from "next/link"
import {
  Banknote,
  Search,
  User,
  Phone,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Loader2,
  FileText,
} from "lucide-react"
import { toast } from "sonner"
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
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { markPayStubPaidAction } from "@/app/actions/tms-payroll"
import { formatWorkspaceDate } from "@/lib/timezone"

export interface PayStubRecord {
  id: string
  driverId: string
  payPeriodStart: Date | string
  payPeriodEnd: Date | string
  totalMiles?: string | null
  payRate?: string | null
  grossPay: string
  deductions?: string | null
  netPay: string
  status: string
  paidDate?: Date | string | null
  notes?: string | null
  createdAt: Date | string
  driverFirstName?: string | null
  driverLastName?: string | null
  driverEmail?: string | null
  driverPhone?: string | null
  driverPayType?: string | null
  driverPayRate?: string | null
}

interface PayrollTableViewProps {
  payStubs: PayStubRecord[]
  timeZone?: string | null
}

export function PayrollTableView({ payStubs, timeZone }: PayrollTableViewProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "pending" | "paid">("all")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [loadingId, setLoadingId] = React.useState<string | null>(null)

  const pendingCount = React.useMemo(() => {
    return payStubs.filter((p) => p.status === "pending").length
  }, [payStubs])

  const paidCount = React.useMemo(() => {
    return payStubs.filter((p) => p.status === "paid").length
  }, [payStubs])

  const filteredStubs = React.useMemo(() => {
    return payStubs.filter((p) => {
      // Tab filter
      if (activeTab === "pending" && p.status !== "pending") {
        return false
      }
      if (activeTab === "paid" && p.status !== "paid") {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchDriver = `${p.driverFirstName || ""} ${p.driverLastName || ""}`.toLowerCase().includes(q)
        const matchEmail = (p.driverEmail || "").toLowerCase().includes(q)
        const matchPhone = (p.driverPhone || "").toLowerCase().includes(q)
        const matchNotes = (p.notes || "").toLowerCase().includes(q)
        const matchPayType = (p.driverPayType || "").toLowerCase().includes(q)

        return matchDriver || matchEmail || matchPhone || matchNotes || matchPayType
      }

      return true
    })
  }, [payStubs, activeTab, searchQuery])

  const handleMarkPaid = async (payStubId: string) => {
    setLoadingId(payStubId)
    try {
      const res = await markPayStubPaidAction({
        payStubId,
        paidDate: new Date().toISOString(),
      })
      if (res.ok) {
        toast.success("Settlement marked as paid & disbursed")
      } else {
        toast.error(res.error || "Failed to update settlement status")
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to mark paid")
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Search & Tab Filters Toolbar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "all" | "pending" | "paid")}
          className="w-full sm:w-auto"
        >
          <TabsList className="bg-[#f2eee6] dark:bg-zinc-900 border border-[#e4ddd3] dark:border-zinc-800 p-0.5 h-8.5 rounded-lg">
            <TabsTrigger
              value="all"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              All Settlements
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {payStubs.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Pending Disbursal
              <span className="font-mono text-[10px] text-[#d9622b] font-semibold px-1 bg-[#fff0e6] dark:bg-orange-950/40 rounded-full">
                {pendingCount}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Disbursed / Paid
              <span className="font-mono text-[10px] text-emerald-600 font-semibold px-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
                {paidCount}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search driver, phone, pay model..."
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
                Commercial Driver
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Pay Period
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Pay Model / Miles
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                Gross Pay
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                Deductions
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4 text-right">
                Net Pay
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
            {filteredStubs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center text-xs text-[#8a8b8f]">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Banknote className="size-5 text-[#8a8b8f]/60" />
                    <p className="font-medium text-[#16181d] dark:text-zinc-200">
                      No driver settlements in this view
                    </p>
                    <p className="text-[11px] text-[#8a8b8f]">
                      {searchQuery
                        ? "Try clearing your search criteria"
                        : "Generate your first driver settlement using the button above"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredStubs.map((p) => {
                const gross = parseFloat(p.grossPay || "0")
                const ded = parseFloat(p.deductions || "0")
                const net = parseFloat(p.netPay || "0")
                const isLoading = loadingId === p.id

                return (
                  <TableRow
                    key={p.id}
                    className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                  >
                    {/* Driver */}
                    <TableCell className="px-4 py-3 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="flex size-7 items-center justify-center rounded-full bg-[#f2eee6] dark:bg-zinc-800 text-[#16181d] dark:text-zinc-200 font-medium text-[11px] shrink-0">
                          {p.driverFirstName?.[0] || "D"}{p.driverLastName?.[0] || ""}
                        </div>
                        <div>
                          <p className="font-medium text-[#16181d] dark:text-zinc-100">
                            {p.driverFirstName} {p.driverLastName}
                          </p>
                          {p.driverPhone && (
                            <p className="text-[10px] text-[#8a8b8f] font-mono">{p.driverPhone}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Pay Period */}
                    <TableCell className="px-4 py-3 text-xs font-mono text-[#16181d] dark:text-zinc-200">
                      <div className="flex items-center gap-1">
                        <Calendar className="size-3 text-[#8a8b8f] shrink-0" />
                        <span>
                          {formatWorkspaceDate(p.payPeriodStart, timeZone, undefined, { mode: "date" })}
                        </span>
                        <span className="text-[#8a8b8f]">→</span>
                        <span>
                          {formatWorkspaceDate(p.payPeriodEnd, timeZone, undefined, { mode: "date" })}
                        </span>
                      </div>
                    </TableCell>

                    {/* Pay Model / Miles */}
                    <TableCell className="px-4 py-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="font-mono text-[11px] font-semibold text-[#16181d] dark:text-zinc-200">
                          {p.totalMiles ? `${p.totalMiles} mi` : "Flat Run"}
                        </span>
                        {p.payRate && (
                          <p className="text-[10px] text-[#8a8b8f] font-mono">Rate: {p.payRate}</p>
                        )}
                      </div>
                    </TableCell>

                    {/* Gross Pay */}
                    <TableCell className="px-4 py-3 text-right font-mono text-xs text-[#16181d] dark:text-zinc-200">
                      ${gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Deductions */}
                    <TableCell className="px-4 py-3 text-right font-mono text-xs text-red-600 dark:text-red-400">
                      {ded > 0 ? `-$${ded.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
                    </TableCell>

                    {/* Net Pay */}
                    <TableCell className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      ${net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>

                    {/* Status */}
                    <TableCell className="px-4 py-3">
                      {p.status === "paid" ? (
                        <Badge
                          variant="outline"
                          className="bg-emerald-50 text-emerald-700 border-emerald-500/20 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]"
                        >
                          Disbursed
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 text-[10px]"
                        >
                          Pending
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="px-4 py-3 text-right">
                      {p.status !== "paid" ? (
                        <Button
                          size="sm"
                          disabled={isLoading}
                          onClick={() => handleMarkPaid(p.id)}
                          className="h-7 px-3 text-[11px] rounded-4xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          {isLoading ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <CheckCircle2 className="size-3" />
                          )}
                          Disburse
                        </Button>
                      ) : (
                        <span className="text-[11px] font-medium text-emerald-600 inline-flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          Paid
                        </span>
                      )}
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
