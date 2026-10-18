"use client"

import * as React from "react"
import { Mail, Send, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { sendInvoiceEmailAction } from "@/app/actions/tms-billing"
import { sounds } from "@/lib/sound-effects"

interface SendInvoiceEmailDialogProps {
  invoiceId: string
  invoiceNumber: string
  customerName: string
  customerEmail?: string | null
  amount: string
  trigger?: React.ReactNode
}

export function SendInvoiceEmailDialog({
  invoiceId,
  invoiceNumber,
  customerName,
  customerEmail,
  amount,
  trigger,
}: SendInvoiceEmailDialogProps) {
  const [open, setOpen] = React.useState(false)
  const [recipient, setRecipient] = React.useState(customerEmail || "")
  const [customMessage, setCustomMessage] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    if (customerEmail && !recipient) {
      setRecipient(customerEmail)
    }
  }, [customerEmail, recipient])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!recipient.trim()) {
      toast.error("Please enter a recipient email address")
      return
    }

    setLoading(true)
    sounds.playTrackpadClick()

    try {
      const res = await sendInvoiceEmailAction({
        invoiceId,
        recipientEmail: recipient.trim(),
        customMessage: customMessage.trim() || undefined,
      })

      if (!res.ok) {
        throw new Error(res.error || "Failed to send invoice email")
      }

      sounds.playSuccess()
      toast.success(`Invoice #${invoiceNumber} emailed to ${recipient}!`)
      setOpen(false)
    } catch (err: any) {
      toast.error(err.message || "Failed to send invoice email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ? (
            (trigger as React.ReactElement)
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs border-brand-rule hover:border-brand-accent/40"
            >
              <Mail className="size-3.5 text-brand-muted-soft" />
              <span>Email Invoice</span>
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-md border-brand-rule bg-brand-card">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-brand-accent-tint text-brand-accent">
              <Mail className="size-4" />
            </div>
            <div>
              <DialogTitle className="font-serif text-lg text-brand-ink">
                Send Invoice #{invoiceNumber}
              </DialogTitle>
              <DialogDescription className="text-xs text-brand-muted-soft">
                Email invoice summary and online view link to customer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSend} className="space-y-4 py-2">
          <div className="rounded-lg bg-brand-cream/20 p-3 border border-brand-rule/60 text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-brand-muted-soft">Customer:</span>
              <span className="font-medium text-brand-ink">{customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-brand-muted-soft">Total Amount:</span>
              <span className="font-bold text-brand-accent">${amount}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recipientEmail" className="text-xs font-medium text-brand-ink">
              Recipient Email <span className="text-brand-accent">*</span>
            </Label>
            <Input
              id="recipientEmail"
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="billing@customer.com"
              required
              className="h-9 text-xs border-brand-rule focus-visible:ring-brand-accent"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="customMessage" className="text-xs font-medium text-brand-ink">
              Custom Note / Payment Instructions (Optional)
            </Label>
            <Textarea
              id="customMessage"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="e.g. Please note our updated bank wire instructions below..."
              rows={3}
              className="text-xs border-brand-rule focus-visible:ring-brand-accent resize-none"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="text-xs text-brand-muted-soft hover:text-brand-ink"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="gap-1.5 bg-brand-ink text-brand-cream hover:bg-brand-ink/90 text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Sending via Resend...</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Send Email</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
