"use client"

import * as React from "react"
import Link from "next/link"
import {
  Search,
  FileText,
  DollarSign,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Download,
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
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { ApplyPaymentDialog } from "@/components/tms/apply-payment-dialog"
import { formatWorkspaceDate } from "@/lib/timezone"

export interface InvoiceRecord {
  id: string
  invoiceNumber: string
  customerName?: string | null
  customerEmail?: string | null
  loadId?: string | null
  loadNumber?: string | null
  amount: string
  status: string
  createdAt: Date | string
  dueDate?: Date | string | null
}

interface InvoicesTableViewProps {
  invoices: InvoiceRecord[]
  canApplyPayment: boolean
  timeZone?: string | null
}

export function InvoicesTableView({
  invoices,
  canApplyPayment,
  timeZone,
}: InvoicesTableViewProps) {
  const [activeTab, setActiveTab] = React.useState<"all" | "pending" | "paid">("all")
  const [searchQuery, setSearchQuery] = React.useState("")

  const pendingInvoices = React.useMemo(() => {
    return invoices.filter((i) => i.status === "pending" || i.status === "overdue")
  }, [invoices])

  const paidInvoices = React.useMemo(() => {
    return invoices.filter((i) => i.status === "paid")
  }, [invoices])

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter((inv) => {
      // Tab filter
      if (activeTab === "pending" && inv.status !== "pending" && inv.status !== "overdue") {
        return false
      }
      if (activeTab === "paid" && inv.status !== "paid") {
        return false
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchInvoice = inv.invoiceNumber.toLowerCase().includes(q)
        const matchCustomer = (inv.customerName || "").toLowerCase().includes(q)
        const matchEmail = (inv.customerEmail || "").toLowerCase().includes(q)
        const matchLoad = (inv.loadNumber || "").toLowerCase().includes(q)

        return matchInvoice || matchCustomer || matchEmail || matchLoad
      }

      return true
    })
  }, [invoices, activeTab, searchQuery])

  const exportCsv = () => {
    const headers = ["Invoice #", "Customer", "Email", "Order / Load", "Amount", "Status", "Due Date", "Created Date"]
    const rows = filteredInvoices.map((i) => [
      `"${(i.invoiceNumber || "").replace(/"/g, '""')}"`,
      `"${(i.customerName || "").replace(/"/g, '""')}"`,
      `"${(i.customerEmail || "").replace(/"/g, '""')}"`,
      `"${(i.loadNumber || "").replace(/"/g, '""')}"`,
      `"${i.amount || "0"}"`,
      `"${(i.status || "").replace(/"/g, '""')}"`,
      `"${i.dueDate ? new Date(i.dueDate).toISOString().slice(0, 10) : ""}"`,
      `"${i.createdAt ? new Date(i.createdAt).toISOString().slice(0, 10) : ""}"`,
    ])
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `customer_invoices_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Helper to determine aging bucket for pending invoices
  const getAgingBadge = (inv: InvoiceRecord) => {
    if (inv.status === "paid") {
      return (
        <Badge
          variant="outline"
          className="border-emerald-500/20 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-mono"
        >
          Paid
        </Badge>
      )
    }

    if (!inv.dueDate) {
      return (
        <Badge
          variant="outline"
          className="border-brand-rule text-brand-muted-soft text-[10px] font-mono"
        >
          Net 30
        </Badge>
      )
    }

    const due = new Date(inv.dueDate).getTime()
    const now = Date.now()
    const diffDays = Math.floor((now - due) / (1000 * 60 * 60 * 24))

    if (diffDays <= 0) {
      return (
        <Badge
          variant="outline"
          className="border-blue-500/20 bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 text-[10px] font-mono"
        >
          Current
        </Badge>
      )
    } else if (diffDays <= 30) {
      return (
        <Badge
          variant="outline"
          className="border-amber-500/30 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 text-[10px] font-mono"
        >
          1-30d Overdue
        </Badge>
      )
    } else if (diffDays <= 60) {
      return (
        <Badge
          variant="outline"
          className="border-orange-500/30 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 text-[10px] font-mono"
        >
          31-60d Overdue
        </Badge>
      )
    } else {
      return (
        <Badge
          variant="outline"
          className="border-red-500/30 bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 text-[10px] font-mono"
        >
          60+d Overdue
        </Badge>
      )
    }
  }

  return (
    <div className="space-y-4">
      {/* ─── Tabs & Search Filter ─── */}
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
              All Invoices
              <span className="font-mono text-[10px] text-[#8a8b8f] px-1 bg-black/5 dark:bg-white/10 rounded-full">
                {invoices.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="pending"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Outstanding AR
              <span className="font-mono text-[10px] text-[#d9622b] font-semibold px-1 bg-[#fff0e6] dark:bg-orange-950/40 rounded-full">
                {pendingInvoices.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="paid"
              className="text-xs px-3 data-[state=active]:bg-[#fdfbf7] dark:data-[state=active]:bg-zinc-950 data-[state=active]:text-[#16181d] dark:data-[state=active]:text-zinc-100 rounded-md gap-1.5 transition-all"
            >
              Reconciled & Paid
              <span className="font-mono text-[10px] text-emerald-600 font-semibold px-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-full">
                {paidInvoices.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-[#8a8b8f]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, customer, load..."
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

          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            className="h-8.5 px-3 text-xs border-[#e4ddd3] dark:border-zinc-800 text-[#16181d] dark:text-zinc-200 hover:bg-[#f7f3ec] dark:hover:bg-zinc-900 rounded-lg gap-1.5 shrink-0"
          >
            <Download className="size-3.5 text-[#8a8b8f]" />
            Export
          </Button>
        </div>
      </div>

      {/* ─── Shadcn Table ─── */}
      <Card className="border-[#e4ddd3] dark:border-zinc-800 bg-[#fdfbf7] dark:bg-zinc-950 overflow-hidden shadow-xs rounded-xl">
        <Table>
          <TableHeader className="bg-[#f7f3ec]/80 dark:bg-zinc-900/60 border-b border-[#e4ddd3] dark:border-zinc-800">
            <TableRow className="hover:bg-transparent border-[#e4ddd3] dark:border-zinc-800">
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Invoice #
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Customer / Broker
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Linked Load
              </TableHead>
              <TableHead className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#8a8b8f] h-9 px-4">
                Aging / Terms
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
            {filteredInvoices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-xs text-[#8a8b8f]">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <FileText className="size-5 text-[#8a8b8f]/60" />
                    <p className="font-medium text-[#16181d] dark:text-zinc-200">
                      No invoices match this view
                    </p>
                    <p className="text-[11px] text-[#8a8b8f]">
                      {searchQuery
                        ? "Try clearing your search query"
                        : "No invoices in this status category"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredInvoices.map((inv) => (
                <TableRow
                  key={inv.id}
                  className="hover:bg-[#f7f3ec]/60 dark:hover:bg-zinc-900/50 transition-colors border-[#e4ddd3] dark:border-zinc-800/80"
                >
                  {/* Invoice # */}
                  <TableCell className="px-4 py-3 font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                    <Link
                      href={`/invoices/${inv.id}`}
                      className="text-[#d9622b] hover:underline inline-flex items-center gap-1"
                    >
                      {inv.invoiceNumber}
                      <ArrowUpRight className="size-3" />
                    </Link>
                  </TableCell>

                  {/* Customer / Broker */}
                  <TableCell className="px-4 py-3 text-xs text-[#16181d] dark:text-zinc-100">
                    <div className="font-medium">{inv.customerName || "—"}</div>
                    {inv.customerEmail && (
                      <div className="text-[11px] text-[#8a8b8f] font-mono">{inv.customerEmail}</div>
                    )}
                  </TableCell>

                  {/* Linked Load */}
                  <TableCell className="px-4 py-3 text-xs">
                    {inv.loadId ? (
                      <Link
                        href={`/loads/${inv.loadId}`}
                        className="font-mono text-xs text-[#16181d] dark:text-zinc-200 hover:text-[#d9622b] underline inline-flex items-center gap-1"
                      >
                        {inv.loadNumber || "Load"}
                      </Link>
                    ) : (
                      <span className="text-[#8a8b8f] font-mono text-xs">Standalone</span>
                    )}
                  </TableCell>

                  {/* Aging / Terms */}
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getAgingBadge(inv)}
                      {inv.dueDate && (
                        <span className="text-[11px] text-[#8a8b8f] font-mono">
                          Due {formatWorkspaceDate(inv.dueDate, timeZone, undefined, { mode: "date" })}
                        </span>
                      )}
                    </div>
                  </TableCell>

                  {/* Amount */}
                  <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold text-[#16181d] dark:text-zinc-100">
                    ${parseFloat(inv.amount || "0").toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>

                  {/* Status */}
                  <TableCell className="px-4 py-3">
                    <StatusBadge status={inv.status} />
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="px-4 py-3 text-right">
                    {inv.status !== "paid" && canApplyPayment ? (
                      <ApplyPaymentDialog
                        invoiceId={inv.id}
                        invoiceNumber={inv.invoiceNumber}
                        totalAmount={inv.amount}
                        customerName={inv.customerName}
                      />
                    ) : (
                      <span className="text-[11px] font-medium text-emerald-600 inline-flex items-center gap-1 justify-end">
                        <CheckCircle2 className="size-3" />
                        Reconciled
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
