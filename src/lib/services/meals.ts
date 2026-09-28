import { and, eq, ilike, } from "drizzle-orm";
import { db } from "@/db";
import {
  mealIngredients,
  mealMealTypes,
  meals,
  mealTags,
} from "@/db/schema";
import { deleteUnreferencedBlobs } from "@/lib/services/blob-cleanup";
import { filterMeals, pickMealsForDay } from "@/lib/meal-picker";
import { assertOwned, stripProtected } from "@/lib/services/ownership";
import { generateId, getRandomItem } from "@/lib/utils";
import type {
  Meal,
  MealWithRelations,
  NewMeal,
  RandomizerFilters,
} from "@/types";
import { UserError } from "@/lib/action-result";

export async function getMealsByUserId(
  userId: string,
): Promise<MealWithRelations[]> {
  const mealsData = await db.query.meals.findMany({
    where: eq(meals.userId, userId),
    with: {
      mealTags: {
        with: { tag: true },
      },
      mealMealTypes: {
        with: { mealType: true },
      },
      mealIngredients: {
        with: { ingredient: true },
      },
    },
    orderBy: meals.name,
  });

  return mealsData.map((meal) => ({
    ...meal,
    tags: meal.mealTags.map((mt) => mt.tag),
    mealTypes: meal.mealMealTypes.map((mmt) => mmt.mealType),
    ingredients: meal.mealIngredients,
  }));
}

export type MealSummary = {
  id: string;
  name: string;
  calories: number | null;
  isVegetarian: boolean;
  isChildFriendly: boolean;
};

/**
 * Paginated, server-side search of meals for a given meal type.
 * Lightweight summary (no relations) — used by the "add meal" picker.
 */
export async function searchMealsForType(
  userId: string,
  params: {
    mealTypeId: string;
    query?: string;
    limit?: number;
    offset?: number;
  },
): Promise<MealSummary[]> {
  const { mealTypeId, query, limit = 20, offset = 0 } = params;
  const trimmed = query?.trim();

  return db
    .select({
      id: meals.id,
      name: meals.name,
      calories: meals.calories,
      isVegetarian: meals.isVegetarian,
      isChildFriendly: meals.isChildFriendly,
    })
    .from(meals)
    .innerJoin(mealMealTypes, eq(mealMealTypes.mealId, meals.id))
    .where(
      and(
        eq(meals.userId, userId),
        eq(mealMealTypes.mealTypeId, mealTypeId),
        trimmed ? ilike(meals.name, `%${trimmed}%`) : undefined,
      ),
    )
    .orderBy(meals.name)
    .limit(limit)
    .offset(offset);
}

export async function getMealById(
  mealId: string,
  userId: string,
): Promise<MealWithRelations | undefined> {
  const meal = await db.query.meals.findFirst({
    where: and(eq(meals.id, mealId), eq(meals.userId, userId)),
    with: {
      mealTags: {
        with: { tag: true },
      },
      mealMealTypes: {
        with: { mealType: true },
      },
      mealIngredients: {
        with: { ingredient: true },
      },
    },
  });

  if (!meal) return undefined;

  return {
    ...meal,
    tags: meal.mealTags.map((mt) => mt.tag),
    mealTypes: meal.mealMealTypes.map((mmt) => mmt.mealType),
    ingredients: meal.mealIngredients,
  };
}

type CreateMealData = Omit<
  NewMeal,
  "id" | "userId" | "createdAt" | "updatedAt"
> & {
  tagIds?: string[];
  mealTypeIds?: string[];
  ingredientsList?: { ingredientId: string; amount: number; unit: string }[];
};

// Images are rendered through next/image, which only allows Vercel Blob.
function assertImageUrl(url: string | null | undefined): void {
  if (!url) return;
  let host = "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:") host = parsed.hostname;
  } catch {}
  if (!host.endsWith(".public.blob.vercel-storage.com")) {
    throw new UserError("Nieprawidłowy adres zdjęcia");
  }
}

async function assertLinkedOwned(
  userId: string,
  data: Partial<CreateMealData>,
): Promise<void> {
  await Promise.all([
    assertOwned("tags", userId, data.tagIds ?? []),
    assertOwned("mealTypes", userId, data.mealTypeIds ?? []),
    assertOwned(
      "ingredients",
      userId,
      (data.ingredientsList ?? []).map((i) => i.ingredientId),
    ),
  ]);
}

export async function createMeal(
  userId: string,
  data: CreateMealData,
): Promise<Meal> {
  const { tagIds, mealTypeIds, ingredientsList, ...mealData } = data;
  assertImageUrl(data.imageUrl);
  await assertLinkedOwned(userId, data);
  const mealId = generateId();

  const [meal] = await db
    .insert(meals)
    .values({
      ...stripProtected(mealData),
      id: mealId,
      userId,
    })
    .returning();

  if (tagIds && tagIds.length > 0) {
    await db.insert(mealTags).values(
      tagIds.map((tagId) => ({
        mealId,
        tagId,
      })),
    );
  }

  if (mealTypeIds && mealTypeIds.length > 0) {
    await db.insert(mealMealTypes).values(
      mealTypeIds.map((mealTypeId) => ({
        mealId,
        mealTypeId,
      })),
    );
  }

  if (ingredientsList && ingredientsList.length > 0) {
    await db.insert(mealIngredients).values(
      ingredientsList.map((ing) => ({
        id: generateId(),
        mealId,
        ingredientId: ing.ingredientId,
        amount: ing.amount,
        unit: ing.unit,
      })),
    );
  }

  return meal;
}

export async function updateMeal(
  mealId: string,
  userId: string,
  data: Partial<CreateMealData>,
): Promise<Meal> {
  const { tagIds, mealTypeIds, ingredientsList, ...mealData } = data;
  assertImageUrl(data.imageUrl);
  await assertLinkedOwned(userId, data);

  const previous =
    data.imageUrl !== undefined
      ? await db.query.meals.findFirst({
          where: and(eq(meals.id, mealId), eq(meals.userId, userId)),
          columns: { imageUrl: true },
        })
      : undefined;

  const [meal] = await db
    .update(meals)
    .set({ ...stripProtected(mealData), updatedAt: new Date() })
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .returning();

  if (!meal) {
    throw new UserError("Danie nie zostało znalezione");
  }
  if (previous?.imageUrl && previous.imageUrl !== meal.imageUrl) {
    await deleteUnreferencedBlobs([previous.imageUrl]);
  }

  if (tagIds !== undefined) {
    await db.delete(mealTags).where(eq(mealTags.mealId, mealId));
    if (tagIds.length > 0) {
      await db.insert(mealTags).values(
        tagIds.map((tagId) => ({
          mealId,
          tagId,
        })),
      );
    }
  }

  if (mealTypeIds !== undefined) {
    await db.delete(mealMealTypes).where(eq(mealMealTypes.mealId, mealId));
    if (mealTypeIds.length > 0) {
      await db.insert(mealMealTypes).values(
        mealTypeIds.map((mealTypeId) => ({
          mealId,
          mealTypeId,
        })),
      );
    }
  }

  if (ingredientsList !== undefined) {
    await db.delete(mealIngredients).where(eq(mealIngredients.mealId, mealId));
    if (ingredientsList.length > 0) {
      await db.insert(mealIngredients).values(
        ingredientsList.map((ing) => ({
          id: generateId(),
          mealId,
          ingredientId: ing.ingredientId,
          amount: ing.amount,
          unit: ing.unit,
        })),
      );
    }
  }

  return meal;
}

export async function deleteMeal(
  mealId: string,
  userId: string,
): Promise<void> {
  const deleted = await db
    .delete(meals)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .returning({ imageUrl: meals.imageUrl });
  await deleteUnreferencedBlobs(deleted.map((m) => m.imageUrl));
}

export async function getFilteredMeals(
  userId: string,
  filters: RandomizerFilters,
): Promise<MealWithRelations[]> {
  return filterMeals(await getMealsByUserId(userId), filters);
}

export async function randomizeSingleMeal(
  userId: string,
  filters: RandomizerFilters,
): Promise<MealWithRelations | undefined> {
  const filteredMeals = await getFilteredMeals(userId, filters);
  return getRandomItem(filteredMeals);
}

export async function randomizeDay(
  userId: string,
  mealTypeIds: string[],
  filters: Omit<RandomizerFilters, "mealTypeId" | "excludeMealIds">,
): Promise<{ mealTypeId: string; meal: MealWithRelations | null }[]> {
  return pickMealsForDay(await getMealsByUserId(userId), mealTypeIds, filters);
}
