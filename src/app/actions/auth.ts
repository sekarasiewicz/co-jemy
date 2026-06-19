"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export async function validateInviteCode(code: string) {
  const inviteCode = process.env.INVITE_CODE;
  if (!inviteCode) {
    return { valid: false };
  }
  return { valid: code === inviteCode };
}

export async function requireAuth() {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Musisz być zalogowany");
  }
  return session;
}

// Authoritative admin check — reads role straight from the DB by user id.
export async function getIsAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session?.user) return false;

  const { eq } = await import("drizzle-orm");
  const { db } = await import("@/db");
  const { users } = await import("@/db/schema");
  const row = await db.query.users.findFirst({
    where: eq(users.id, session.user.id),
    columns: { role: true },
  });
  return row?.role === "admin";
}

export async function requireAdmin() {
  const session = await requireAuth();
  const isAdmin = await getIsAdmin();
  if (!isAdmin) {
    throw new Error("Brak uprawnień administratora");
  }
  return session;
}
