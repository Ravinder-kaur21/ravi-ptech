import { NextResponse } from "next/server"
import { withTenant } from "@/lib/dal"
import { getCustomersForOrg, getFacilitiesForOrg } from "@/lib/dal"

export const GET = withTenant(async (_req: Request, { tenantId }) => {
  const [customers, facilities] = await Promise.all([
    getCustomersForOrg(tenantId),
    getFacilitiesForOrg(tenantId),
  ])

  return NextResponse.json({
    customers: customers.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      paymentTerms: c.paymentTerms,
      currency: c.currency,
      address: c.address,
      city: c.city,
      state: c.state,
      zip: c.zip,
      country: c.country,
    })),
    facilities: facilities.map((f) => ({
      id: f.id,
      name: f.name,
      facilityType: f.facilityType,
      address: f.address,
      city: f.city,
      state: f.state,
      zip: f.zip,
      country: f.country,
      contactName: f.contactName,
      contactPhone: f.contactPhone,
      operatingHours: f.operatingHours,
      checkInInstructions: f.checkInInstructions,
    })),
  })
})
