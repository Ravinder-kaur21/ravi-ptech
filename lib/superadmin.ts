import "server-only"
import { db } from "@/lib/db"
import { eq } from "drizzle-orm"
import { user } from "@/lib/schema"

/**
 * Admin gating for the /admin console.
 *
 * Admin status comes from the database (`user.role === "admin"`) — set
 * either by an existing admin via the /admin/users → Set role action,
 * or by running an UPDATE in psql during initial bootstrap:
 *
 *   UPDATE "user" SET role = 'admin' WHERE email = 'you@example.com';
 *
 * No environment variable is consulted. To revoke admin access, set
 * `role = 'user'` from the admin UI (or directly in the DB).
 */

/** Returns true if the user row exists and has `role = 'admin'`. */
export async function isAdminById(userId: string): Promise<boolean> {
  const rows = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return rows[0]?.role === "admin"
}