"use server";

import { revalidatePath } from "next/cache";
import { clearUserData, deleteUserAccount } from "@/lib/services/account";
import { requireAuth } from "./auth";

export async function clearAllDataAction(): Promise<void> {
  const session = await requireAuth();
  await clearUserData(session.user.id);
  revalidatePath("/", "layout");
}

export async function deleteAccountAction(): Promise<void> {
  const session = await requireAuth();
  await deleteUserAccount(session.user.id);
}
