import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  ingredients,
  mealIngredients,
  mealMealTypes,
  meals,
  mealTags,
  mealTypes,
  tags,
} from "@/db/schema";
import { generateId, getRandomItem } from "@/lib/utils";
import type {
  Ingredient,
  Meal,
  MealIngredient,
  MealType,
  MealWithRelations,
  NewMeal,
  RandomizerFilters,
  Tag,
} from "@/types";

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

export async function createMeal(
  userId: string,
  data: CreateMealData,
): Promise<Meal> {
  const { tagIds, mealTypeIds, ingredientsList, ...mealData } = data;
  const mealId = generateId();

  const [meal] = await db
    .insert(meals)
    .values({
      id: mealId,
      userId,
      ...mealData,
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

  const [meal] = await db
    .update(meals)
    .set({ ...mealData, updatedAt: new Date() })
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
    .returning();

  if (!meal) {
    throw new Error("Danie nie zostało znalezione");
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
  await db
    .delete(meals)
    .where(and(eq(meals.id, mealId), eq(meals.userId, userId)));
}

export async function getFilteredMeals(
  userId: string,
  filters: RandomizerFilters,
): Promise<MealWithRelations[]> {
  const allMeals = await getMealsByUserId(userId);

  return allMeals.filter((meal) => {
    if (
      filters.mealTypeId &&
      !meal.mealTypes.some((mt) => mt.id === filters.mealTypeId)
    ) {
      return false;
    }

    if (
      filters.maxPrepTime &&
      meal.prepTimeMinutes &&
      meal.prepTimeMinutes > filters.maxPrepTime
    ) {
      return false;
    }

    if (
      filters.maxCookTime &&
      meal.cookTimeMinutes &&
      meal.cookTimeMinutes > filters.maxCookTime
    ) {
      return false;
    }

    if (
      filters.maxCalories &&
      meal.calories &&
      meal.calories > filters.maxCalories
    ) {
      return false;
    }

    if (
      filters.minProtein &&
      meal.protein &&
      meal.protein < filters.minProtein
    ) {
      return false;
    }

    if (filters.isVegetarian && !meal.isVegetarian) return false;
    if (filters.isVegan && !meal.isVegan) return false;
    if (filters.isGlutenFree && !meal.isGlutenFree) return false;
    if (filters.isLactoseFree && !meal.isLactoseFree) return false;
    if (filters.isQuick && !meal.isQuick) return false;
    if (filters.isChildFriendly && !meal.isChildFriendly) return false;

    if (filters.tagIds && filters.tagIds.length > 0) {
      const mealTagIds = meal.tags.map((t) => t.id);
      if (!filters.tagIds.some((tagId) => mealTagIds.includes(tagId))) {
        return false;
      }
    }

    if (filters.excludeMealIds && filters.excludeMealIds.includes(meal.id)) {
      return false;
    }

    return true;
  });
}

export async function randomizeSingleMeal(
  userId: string,
  filters: RandomizerFilters,
): Promise<MealWithRelations | undefined> {
  const filteredMeals = await getFilteredMeals(userId, filters);
  return getRandomItem(filteredMeals);
}
