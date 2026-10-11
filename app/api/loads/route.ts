import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/lib/db"
import { load } from "@/lib/schema"
import { withTenant } from "@/lib/dal"
import { randomUUID } from "crypto"

const createLoadSchema = z.object({
  loadNumber: z.string().min(1).max(50),
  customerName: z.string().max(255).optional().nullable(),
  originCity: z.string().max(100).optional().nullable(),
  originState: z.string().max(50).optional().nullable(),
  destCity: z.string().max(100).optional().nullable(),
  destState: z.string().max(50).optional().nullable(),
  rate: z.string().max(50).optional().nullable(),
  commodity: z.string().max(255).optional().nullable(),
  weight: z.string().max(50).optional().nullable(),
  pickupDate: z.string().optional().nullable(),
  deliveryDate: z.string().optional().nullable(),
})

// [API/LOADS] Create a load. tenantId comes from the session via
// withTenant() — never from the request body.
export const POST = withTenant(async (req: Request, { tenantId }) => {
  const body = await req.json().catch(() => null)
  const parsed = createLoadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 }
    )
  }
  const data = parsed.data
  console.log("[API/LOADS] creating load:", data.loadNumber, "for tenant:", tenantId)

  const id = randomUUID()
  try {
    await db.insert(load).values({
      id,
      tenantId,
      loadNumber: data.loadNumber,
      status: "available",
      customerName: data.customerName ?? null,
      originCity: data.originCity ?? null,
      originState: data.originState ?? null,
      destCity: data.destCity ?? null,
      destState: data.destState ?? null,
      rate: data.rate ?? null,
      commodity: data.commodity ?? null,
      weight: data.weight ?? null,
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : null,
      isStarred: false,
    })
  } catch (err) {
    console.error("[API/LOADS] insert failed:", err)
    return NextResponse.json({ error: "Failed to create load" }, { status: 500 })
  }

  return NextResponse.json({ id, loadNumber: data.loadNumber }, { status: 201 })
})