import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/lib/auth";

// Server-only session helpers. Deliberately NOT a "use server" module, so none
// of these are exposed as callable server-action endpoints.

export const getSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Musisz być zalogowany");
  }
  return session;
}

// Authoritative admin check — reads role straight from the DB by user id.
export const getIsAdmin = cache(async (): Promise<boolean> => {
  const session = await getSession();
  if (!session?.user) return false;

  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { role: true },
  });
  return row?.role === "admin";
});

export async function requireAdmin() {
  const session = await requireAuth();
  if (!(await getIsAdmin())) {
    throw new Error("Brak uprawnień administratora");
  }
  return session;
}

/**
 * Page-level admin guard. Every admin page calls it itself: layouts and pages
 * render independently, so a layout-only check doesn't protect the page's data.
 */
export async function ensureAdminPage(): Promise<void> {
  if (!(await getIsAdmin())) {
    redirect("/today");
  }
}
