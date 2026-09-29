import { and, count, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  ingredients,
  mealIngredients,
  meals,
  shoppingListItems,
} from "@/db/schema";
import { deleteUnreferencedBlobs } from "@/lib/services/blob-cleanup";
import { assertOwned, stripProtected } from "@/lib/services/ownership";
import { containsPattern, generateId } from "@/lib/utils";
import type { Ingredient, NewIngredient } from "@/types";
import { UserError } from "@/lib/action-result";

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
  limit = 20,
): Promise<Ingredient[]> {
  const trimmed = query.trim().slice(0, 100);
  return db.query.ingredients.findMany({
    where: and(
      eq(ingredients.userId, userId),
      trimmed ? ilike(ingredients.name, containsPattern(trimmed)) : undefined,
    ),
    orderBy: sql`${ingredients.name} collate "pl-x-icu"`,
    limit: Math.min(Math.max(limit, 1), 50),
  });
}

export async function createIngredient(
  userId: string,
  data: Omit<NewIngredient, "id" | "userId" | "createdAt">,
): Promise<Ingredient> {
  const [ingredient] = await db
    .insert(ingredients)
    .values({
      ...stripProtected(data),
      id: generateId(),
      userId,
    })
    .returning();

  return ingredient;
}

export async function updateIngredient(
  ingredientId: string,
  userId: string,
  data: Partial<Omit<NewIngredient, "id" | "userId" | "createdAt">>,
): Promise<Ingredient> {
  const previous =
    data.image !== undefined
      ? await getIngredientById(ingredientId, userId)
      : undefined;

  const [ingredient] = await db
    .update(ingredients)
    .set(stripProtected(data))
    .where(
      and(eq(ingredients.id, ingredientId), eq(ingredients.userId, userId)),
    )
    .returning();

  if (!ingredient) {
    throw new UserError("Składnik nie został znaleziony");
  }
  if (previous?.image && previous.image !== ingredient.image) {
    await deleteUnreferencedBlobs([previous.image]);
  }

  return ingredient;
}

export async function deleteIngredient(
  ingredientId: string,
  userId: string,
): Promise<void> {
  // Deleting would silently drop the ingredient from recipes (FK cascade)
  // without recomputing their macros, so refuse while an active meal uses it.
  const [{ usedIn }] = await db
    .select({ usedIn: count() })
    .from(mealIngredients)
    .innerJoin(meals, eq(meals.id, mealIngredients.mealId))
    .where(
      and(
        eq(mealIngredients.ingredientId, ingredientId),
        eq(meals.userId, userId),
        isNull(meals.deletedAt),
      ),
    );
  if (usedIn > 0) {
    throw new UserError(
      `Składnik jest używany w ${usedIn} ${usedIn === 1 ? "daniu" : "daniach"}. Usuń go najpierw z przepisów albo scal z innym składnikiem.`,
    );
  }

  const deleted = await db
    .delete(ingredients)
    .where(
      and(eq(ingredients.id, ingredientId), eq(ingredients.userId, userId)),
    )
    .returning({ image: ingredients.image });
  await deleteUnreferencedBlobs(deleted.map((i) => i.image));
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
    throw new UserError("Docelowy składnik nie został znaleziony");
  }
  if (sourceIds.includes(targetId)) {
    throw new UserError("Składnik nie może zostać scalony sam ze sobą");
  }
  // Sources must be the user's too — the re-point updates below aren't scoped
  // by user, so a foreign id would rewrite another user's recipes.
  await assertOwned("ingredients", userId, sourceIds);

  // Re-point recipes and shopping items to the target, then delete the
  // sources — in one batch (transaction), so a failure can't leave recipes
  // pointing at a half-merged state.
  const [, , deleted] = await db.batch([
    db
      .update(mealIngredients)
      .set({ ingredientId: targetId })
      .where(inArray(mealIngredients.ingredientId, sourceIds)),
    db
      .update(shoppingListItems)
      .set({ ingredientId: targetId })
      .where(inArray(shoppingListItems.ingredientId, sourceIds)),
    db
      .delete(ingredients)
      .where(
        and(
          inArray(ingredients.id, sourceIds),
          eq(ingredients.userId, userId),
        ),
      )
      .returning({ image: ingredients.image }),
  ]);
  await deleteUnreferencedBlobs(deleted.map((i) => i.image));
}
