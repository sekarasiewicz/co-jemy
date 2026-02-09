import { and, eq, ilike, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ingredients, mealIngredients, shoppingListItems } from "@/db/schema";
import { generateId } from "@/lib/utils";
import type { Ingredient, NewIngredient } from "@/types";

export async function getIngredientsByUserId(
  userId: string,
): Promise<Ingredient[]> {
  return db.query.ingredients.findMany({
    where: eq(ingredients.userId, userId),
    orderBy: ingredients.name,
  });
}

export async function getIngredientById(
  ingredientId: string,
  userId: string,
): Promise<Ingredient | undefined> {
  return db.query.ingredients.findFirst({
    where: and(
      eq(ingredients.id, ingredientId),
      eq(ingredients.userId, userId),
    ),
  });
}

export async function searchIngredients(
  userId: string,
  query: string,
): Promise<Ingredient[]> {
  return db.query.ingredients.findMany({
    where: and(
      eq(ingredients.userId, userId),
      ilike(ingredients.name, `%${query}%`),
    ),
    orderBy: ingredients.name,
    limit: 10,
  });
}

export async function createIngredient(
  userId: string,
  data: Omit<NewIngredient, "id" | "userId" | "createdAt">,
): Promise<Ingredient> {
  const [ingredient] = await db
    .insert(ingredients)
    .values({
      id: generateId(),
      userId,
      ...data,
    })
    .returning();

  return ingredient;
}

export async function updateIngredient(
  ingredientId: string,
  userId: string,
  data: Partial<Omit<NewIngredient, "id" | "userId" | "createdAt">>,
): Promise<Ingredient> {
  const [ingredient] = await db
    .update(ingredients)
    .set(data)
    .where(
      and(eq(ingredients.id, ingredientId), eq(ingredients.userId, userId)),
    )
    .returning();

  if (!ingredient) {
    throw new Error("Składnik nie został znaleziony");
  }

  return ingredient;
}

export async function deleteIngredient(
  ingredientId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(ingredients)
    .where(
      and(eq(ingredients.id, ingredientId), eq(ingredients.userId, userId)),
    );
}

export async function getIngredientsByCategory(
  userId: string,
  category: string,
): Promise<Ingredient[]> {
  return db.query.ingredients.findMany({
    where: and(
      eq(ingredients.userId, userId),
      eq(ingredients.category, category),
    ),
    orderBy: ingredients.name,
  });
}

export async function mergeIngredients(
  userId: string,
  sourceIds: string[],
  targetId: string,
): Promise<void> {
  // Verify target belongs to user
  const target = await db.query.ingredients.findFirst({
    where: and(eq(ingredients.id, targetId), eq(ingredients.userId, userId)),
  });
  if (!target) {
    throw new Error("Docelowy składnik nie został znaleziony");
  }

  // Re-point mealIngredients from source → target
  await db
    .update(mealIngredients)
    .set({ ingredientId: targetId })
    .where(inArray(mealIngredients.ingredientId, sourceIds));

  // Re-point shoppingListItems from source → target
  await db
    .update(shoppingListItems)
    .set({ ingredientId: targetId })
    .where(inArray(shoppingListItems.ingredientId, sourceIds));

  // Delete source ingredients
  await db
    .delete(ingredients)
    .where(
      and(
        inArray(ingredients.id, sourceIds),
        eq(ingredients.userId, userId),
      ),
    );
}
