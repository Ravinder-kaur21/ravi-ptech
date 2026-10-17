"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, CheckCircle2, X, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { updateCarrierPaymentStatusAction } from "@/app/actions/tms-carrier"
import { ConfirmCarrierPaymentDialog } from "@/components/tms/confirm-carrier-payment-dialog"

interface PaymentActionProps {
  payment: {
    id: string
    carrierName?: string | null
    amount: string
    netAmount?: string | null
    currency?: string | null
    status: string
    invoiceNumber?: string | null
    paymentMethod?: string | null
    referenceNumber?: string | null
    paymentDate?: Date | null
  }
}

export function CarrierStatusActions({ payment }: PaymentActionProps) {
  const router = useRouter()
  const [isPending, startTransition] = React.useTransition()

  const handleUpdate = (status: "approved" | "void") => {
    startTransition(async () => {
      const res = await updateCarrierPaymentStatusAction({
        paymentId: payment.id,
        status,
      })

      if (res.success) {
        toast.success(`Settlement marked as ${status}`)
        router.refresh()
      } else {
        toast.error(res.error || `Failed to update settlement`)
      }
    })
  }

  if (payment.status === "paid") {
    return (
      <div className="flex flex-col items-end text-xs">
        <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Paid via {payment.paymentMethod || "Remittance"}
        </span>
        {payment.referenceNumber && (
          <span className="text-[11px] text-muted-foreground font-mono">
            Ref: {payment.referenceNumber}
          </span>
        )}
      </div>
    )
  }

  if (payment.status === "void") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground line-through">
        <X className="h-3 w-3" />
        Voided
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {payment.status === "pending" && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50"
          onClick={() => handleUpdate("approved")}
          disabled={isPending}
        >
          {isPending ? <Spinner className="h-3 w-3 mr-1" /> : <Check className="h-3 w-3 mr-1" />}
          Approve
        </Button>
      )}

      {payment.status === "approved" && (
        <ConfirmCarrierPaymentDialog
          payment={payment}
          trigger={
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
              disabled={isPending}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pay Carrier
            </Button>
          }
        />
      )}

      <Button
        size="sm"
        variant="ghost"
        className="h-7 text-xs text-muted-foreground hover:text-destructive"
        onClick={() => handleUpdate("void")}
        disabled={isPending}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
