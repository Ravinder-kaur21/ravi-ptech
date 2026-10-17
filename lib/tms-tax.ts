export type SalesTaxType = "none" | "gst" | "hst" | "pst" | "qst" | "custom"

export const SALES_TAX_CONFIG: Record<
  SalesTaxType,
  { label: string; defaultRate: number; description: string }
> = {
  none: {
    label: "No Tax (0%)",
    defaultRate: 0,
    description: "Standard US interstate / zero-rated freight",
  },
  gst: {
    label: "GST (5%)",
    defaultRate: 5,
    description: "Canadian Federal Goods and Services Tax",
  },
  hst: {
    label: "HST (13%)",
    defaultRate: 13,
    description: "Harmonized Sales Tax (Ontario / Atlantic)",
  },
  pst: {
    label: "PST + GST (12%)",
    defaultRate: 12,
    description: "Provincial Sales Tax (e.g. BC 7% + 5% GST)",
  },
  qst: {
    label: "QST + GST (14.975%)",
    defaultRate: 14.975,
    description: "Quebec Sales Tax (9.975% + 5% GST)",
  },
  custom: {
    label: "Custom %",
    defaultRate: 0,
    description: "Manual percentage override",
  },
}

export interface LoadStop {
  id: string
  type: "pickup" | "delivery"
  facilityName: string
  address: string
  city: string
  state: string
  country?: string
  zip: string
  contactName?: string
  contactPhone?: string
  appointmentDate?: string
  appointmentTime?: string
  appointmentType?: "strict" | "window" | "first_come" | "tba"
  notes?: string
}

export function computeTaxAndFinalRate(
  baseRateNum: number,
  taxType: SalesTaxType,
  customRateNum?: number
): {
  taxRate: number
  taxAmount: number
  finalRate: number
} {
  const rate = isNaN(baseRateNum) || baseRateNum < 0 ? 0 : baseRateNum
  const taxRate =
    taxType === "custom"
      ? isNaN(customRateNum ?? 0)
        ? 0
        : (customRateNum ?? 0)
      : SALES_TAX_CONFIG[taxType]?.defaultRate ?? 0
  const taxAmount = Math.round(rate * (taxRate / 100) * 100) / 100
  const finalRate = Math.round((rate + taxAmount) * 100) / 100
  return {
    taxRate,
    taxAmount,
    finalRate,
  }
}
