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
