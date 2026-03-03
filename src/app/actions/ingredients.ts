"use server";

import { revalidatePath } from "next/cache";
import {
  createIngredient,
  deleteIngredient,
  getIngredientById,
  getIngredientsByUserId,
  mergeIngredients,
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
  weightPerUnit?: number | null;
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
    weightPerUnit?: number | null;
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

export async function mergeIngredientsAction(
  sourceIds: string[],
  targetId: string,
): Promise<void> {
  const session = await requireAuth();
  await mergeIngredients(session.user.id, sourceIds, targetId);
  revalidatePath("/ingredients");
  revalidatePath("/meals");
}

export async function enrichByNameAction(
  name: string,
  currentUnit?: string,
): Promise<{
  category: string;
  defaultUnit: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  weightPerUnit: number | null;
}> {
  await requireAuth();
  const { enrichSingleIngredient } = await import("@/lib/services/ai");
  return enrichSingleIngredient(name, currentUnit);
}

export async function enrichIngredientAction(
  ingredientId: string,
): Promise<Ingredient> {
  const session = await requireAuth();
  const ingredient = await getIngredientById(ingredientId, session.user.id);
  if (!ingredient) {
    throw new Error("Składnik nie został znaleziony");
  }

  const { enrichSingleIngredient } = await import("@/lib/services/ai");
  const enriched = await enrichSingleIngredient(ingredient.name);

  const updated = await updateIngredient(ingredientId, session.user.id, {
    category: enriched.category,
    defaultUnit: enriched.defaultUnit,
    caloriesPer100g: enriched.caloriesPer100g,
    proteinPer100g: enriched.proteinPer100g,
    carbsPer100g: enriched.carbsPer100g,
    fatPer100g: enriched.fatPer100g,
    weightPerUnit: enriched.weightPerUnit,
  });

  revalidatePath("/ingredients");
  return updated;
}
