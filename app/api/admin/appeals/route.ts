import { NextResponse } from "next/server"
import { requireAdmin, listOpenAppealsForAdmin } from "@/lib/dal"

/** Admin-only appeals inbox JSON. Powers the /admin/appeals sheet. */
export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 })
  }
  const appeals = await listOpenAppealsForAdmin()
  return NextResponse.json({ appeals })
}