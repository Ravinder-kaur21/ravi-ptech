"use client"

import * as React from "react"
import { Printer } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PrintDocumentButton({ label = "Print Document" }: { label?: string }) {
  return (
    <Button
      variant="outline"
      onClick={() => window.print()}
      className="h-9 gap-1.5 rounded-full border-brand-rule px-4 text-xs font-medium text-brand-ink hover:bg-brand-cream-soft print:hidden"
    >
      <Printer className="size-3.5" />
      {label}
    </Button>
  )
}
