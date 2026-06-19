"use server";

import { revalidatePath } from "next/cache";
import {
  deleteIngredientAsAdmin,
  deleteMealAsAdmin,
  deleteUserById,
  setUserRole,
} from "@/lib/services/admin";
import { requireAdmin } from "./auth";

export async function setUserRoleAction(
  userId: string,
  role: "user" | "admin",
): Promise<void> {
  const session = await requireAdmin();
  // Prevent locking yourself out by demoting your own account.
  if (userId === session.user.id && role !== "admin") {
    throw new Error("Nie możesz odebrać uprawnień samemu sobie");
  }
  await setUserRole(userId, role);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function deleteUserAction(userId: string): Promise<void> {
  const session = await requireAdmin();
  if (userId === session.user.id) {
    throw new Error("Nie możesz usunąć własnego konta tutaj");
  }
  await deleteUserById(userId);
  revalidatePath("/admin/users");
  revalidatePath("/admin");
}

export async function adminDeleteMealAction(mealId: string): Promise<void> {
  await requireAdmin();
  await deleteMealAsAdmin(mealId);
  revalidatePath("/admin/content");
}

export async function adminDeleteIngredientAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteIngredientAsAdmin(id);
  revalidatePath("/admin/content");
}
