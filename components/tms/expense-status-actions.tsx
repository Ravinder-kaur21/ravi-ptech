"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, X, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { updateExpenseStatusAction } from "@/app/actions/tms-ap"

export function ExpenseStatusActions({
  expenseId,
  currentStatus,
}: {
  expenseId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const handleUpdate = (status: "approved" | "reimbursed" | "rejected" | "pending") => {
    startTransition(async () => {
      const res = await updateExpenseStatusAction({
        expenseId,
        status,
      })

      if (res.success) {
        toast.success(`Expense marked as ${status}`)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to update status")
      }
    })
  }

  if (isPending) {
    return <Spinner className="size-3.5" />
  }

  return (
    <div className="flex items-center gap-1.5">
      {currentStatus === "pending" && (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleUpdate("approved")}
            className="h-6 px-2 text-[10px] text-emerald-700 hover:bg-emerald-50 border-emerald-200 dark:hover:bg-emerald-950/40 cursor-pointer"
            title="Approve Expense"
          >
            <Check className="size-3 mr-1" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleUpdate("rejected")}
            className="h-6 px-2 text-[10px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer"
            title="Reject Expense"
          >
            <X className="size-3 mr-1" />
            Reject
          </Button>
        </>
      )}

      {currentStatus === "approved" && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleUpdate("reimbursed")}
          className="h-6 px-2 text-[10px] text-blue-700 hover:bg-blue-50 border-blue-200 dark:hover:bg-blue-950/40 cursor-pointer"
          title="Mark Reimbursed / Settled"
        >
          <Check className="size-3 mr-1" />
          Mark Reimbursed
        </Button>
      )}

      {(currentStatus === "reimbursed" || currentStatus === "rejected") && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleUpdate("pending")}
          className="h-6 px-1.5 text-[10px] text-brand-muted-soft hover:text-brand-ink cursor-pointer"
          title="Reset to Pending"
        >
          <RotateCcw className="size-2.5 mr-1" />
          Reset
        </Button>
      )}
    </div>
  )
}
