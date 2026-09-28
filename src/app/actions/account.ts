"use server";

import { revalidatePath } from "next/cache";
import { clearUserData, deleteUserAccount } from "@/lib/services/account";
import { requireAuth } from "@/lib/session";
import { type ActionResult, toActionResult } from "@/lib/action-result";

export async function clearAllDataAction(): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const session = await requireAuth();
    await clearUserData(session.user.id);
    revalidatePath("/", "layout");
  });
}

export async function deleteAccountAction(): Promise<ActionResult<void>> {
  return toActionResult(async () => {
    const session = await requireAuth();
    await deleteUserAccount(session.user.id);
  });
}
