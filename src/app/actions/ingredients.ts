"use server";

import { revalidatePath } from "next/cache";
import {
  createIngredient,
  deleteIngredient,
  getIngredientById,
  getIngredientsByUserId,
  searchIngredients,
  updateIngredient,
} from "@/lib/services/ingredients";
import type { Ingredient } from "@/types";
import { requireAuth } from "./auth";

export async function getIngredientsAction(): Promise<Ingredient[]> {
  const session = await requireAuth();
  return getIngredientsByUserId(session.user.id);
}

export async function getIngredientAction(
  ingredientId: string,
): Promise<Ingredient | undefined> {
  const session = await requireAuth();
  return getIngredientById(ingredientId, session.user.id);
}

export async function searchIngredientsAction(
  query: string,
): Promise<Ingredient[]> {
  const session = await requireAuth();
  return searchIngredients(session.user.id, query);
}

export async function createIngredientAction(data: {
  name: string;
  category: string;
  defaultUnit?: string;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  carbsPer100g?: number;
  fatPer100g?: number;
}): Promise<Ingredient> {
  const session = await requireAuth();
  const ingredient = await createIngredient(session.user.id, data);
  revalidatePath("/ingredients");
  return ingredient;
}

export async function updateIngredientAction(
  ingredientId: string,
  data: {
    name?: string;
    category?: string;
    defaultUnit?: string;
    caloriesPer100g?: number;
    proteinPer100g?: number;
    carbsPer100g?: number;
    fatPer100g?: number;
  },
): Promise<Ingredient> {
  const session = await requireAuth();
  const ingredient = await updateIngredient(
    ingredientId,
    session.user.id,
    data,
  );
  revalidatePath("/ingredients");
  return ingredient;
}

export async function deleteIngredientAction(
  ingredientId: string,
): Promise<void> {
  const session = await requireAuth();
  await deleteIngredient(ingredientId, session.user.id);
  revalidatePath("/ingredients");
}
