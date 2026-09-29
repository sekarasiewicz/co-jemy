import {
  and,
  eq,
  exists,
  ilike,
  inArray,
  isNull,
  or,
  type SQL,
  sql,
} from "drizzle-orm";
import { db } from "@/db";
import {
  ingredients,
  mealIngredients,
  mealMealTypes,
  meals,
  mealTags,
  tags,
} from "@/db/schema";
import { deleteUnreferencedBlobs } from "@/lib/services/blob-cleanup";
import {
  MEAL_FLAGS,
  MEAL_LIST_PAGE_SIZE,
  type MealListQuery,
} from "@/lib/meal-list-query";
import { filterMeals, pickMealsForDay } from "@/lib/meal-picker";
import { assertOwned, stripProtected } from "@/lib/services/ownership";
import { containsPattern, generateId, getRandomItem } from "@/lib/utils";
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
    where: and(eq(meals.userId, userId), isNull(meals.deletedAt)),
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

function mealListWhere(userId: string, query: MealListQuery): SQL | undefined {
  const conditions: (SQL | undefined)[] = [
    eq(meals.userId, userId),
    isNull(meals.deletedAt),
  ];

  if (query.q) {
    const pattern = containsPattern(query.q);
    conditions.push(
      or(
        ilike(meals.name, pattern),
        ilike(meals.description, pattern),
        exists(
          db
            .select({ one: mealTags.mealId })
            .from(mealTags)
            .innerJoin(tags, eq(tags.id, mealTags.tagId))
            .where(and(eq(mealTags.mealId, meals.id), ilike(tags.name, pattern))),
        ),
        exists(
          db
            .select({ one: mealIngredients.mealId })
            .from(mealIngredients)
            .innerJoin(ingredients, eq(ingredients.id, mealIngredients.ingredientId))
            .where(
              and(
                eq(mealIngredients.mealId, meals.id),
                ilike(ingredients.name, pattern),
              ),
            ),
        ),
      ),
    );
  }

  if (query.mealTypeIds.length > 0) {
    conditions.push(
      exists(
        db
          .select({ one: mealMealTypes.mealId })
          .from(mealMealTypes)
          .where(
            and(
              eq(mealMealTypes.mealId, meals.id),
              inArray(mealMealTypes.mealTypeId, query.mealTypeIds),
            ),
          ),
      ),
    );
  }

  if (query.tagIds.length > 0) {
    conditions.push(
      exists(
        db
          .select({ one: mealTags.mealId })
          .from(mealTags)
          .where(
            and(
              eq(mealTags.mealId, meals.id),
              inArray(mealTags.tagId, query.tagIds),
            ),
          ),
      ),
    );
  }

  for (const flag of query.flags) {
    conditions.push(eq(meals[MEAL_FLAGS[flag].column], true));
  }

  return and(...conditions);
}

export interface MealListPage {
  meals: MealWithRelations[];
  // Meals matching the filters, and all active meals of the account.
  total: number;
  totalAll: number;
  page: number;
  pageCount: number;
}

// One page of the /meals list, filtered and sorted by name in SQL.
export async function listMeals(
  userId: string,
  query: MealListQuery,
): Promise<MealListPage> {
  const where = mealListWhere(userId, query);
  const [total, totalAll] = await Promise.all([
    db.$count(meals, where),
    db.$count(meals, and(eq(meals.userId, userId), isNull(meals.deletedAt))),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / MEAL_LIST_PAGE_SIZE));
  const page = Math.min(query.page, pageCount);
  if (total === 0) {
    return { meals: [], total, totalAll, page, pageCount };
  }

  const pageRows = await db.query.meals.findMany({
    where,
    with: {
      mealTags: { with: { tag: true } },
      mealMealTypes: { with: { mealType: true } },
      mealIngredients: { with: { ingredient: true } },
    },
    orderBy: [sql`lower(${meals.name})`, meals.id],
    limit: MEAL_LIST_PAGE_SIZE,
    offset: (page - 1) * MEAL_LIST_PAGE_SIZE,
  });

  return {
    meals: pageRows.map((meal) => ({
      ...meal,
      tags: meal.mealTags.map((mt) => mt.tag),
      mealTypes: meal.mealMealTypes.map((mmt) => mmt.mealType),
      ingredients: meal.mealIngredients,
    })),
    total,
    totalAll,
    page,
    pageCount,
  };
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
        isNull(meals.deletedAt),
        eq(mealMealTypes.mealTypeId, mealTypeId),
        trimmed ? ilike(meals.name, containsPattern(trimmed)) : undefined,
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

// Statements that (re)write a meal's tags, types and ingredients. With
// `replace`, lists that were passed replace the existing links.
function linkStatements(
  mealId: string,
  links: Pick<CreateMealData, "tagIds" | "mealTypeIds" | "ingredientsList">,
  replace: boolean,
) {
  const statements = [];
  if (links.tagIds !== undefined) {
    if (replace) {
      statements.push(db.delete(mealTags).where(eq(mealTags.mealId, mealId)));
    }
    if (links.tagIds.length > 0) {
      statements.push(
        db
          .insert(mealTags)
          .values(links.tagIds.map((tagId) => ({ mealId, tagId }))),
      );
    }
  }
  if (links.mealTypeIds !== undefined) {
    if (replace) {
      statements.push(
        db.delete(mealMealTypes).where(eq(mealMealTypes.mealId, mealId)),
      );
    }
    if (links.mealTypeIds.length > 0) {
      statements.push(
        db
          .insert(mealMealTypes)
          .values(
            links.mealTypeIds.map((mealTypeId) => ({ mealId, mealTypeId })),
          ),
      );
    }
  }
  if (links.ingredientsList !== undefined) {
    if (replace) {
      statements.push(
        db.delete(mealIngredients).where(eq(mealIngredients.mealId, mealId)),
      );
    }
    if (links.ingredientsList.length > 0) {
      statements.push(
        db.insert(mealIngredients).values(
          links.ingredientsList.map((ing) => ({
            id: generateId(),
            mealId,
            ingredientId: ing.ingredientId,
            amount: ing.amount,
            unit: ing.unit,
          })),
        ),
      );
    }
  }
  return statements;
}

export async function createMeal(
  userId: string,
  data: CreateMealData,
): Promise<Meal> {
  const { tagIds, mealTypeIds, ingredientsList, ...mealData } = data;
  assertImageUrl(data.imageUrl);
  await assertLinkedOwned(userId, data);
  const mealId = generateId();

  // One batch = one transaction: no half-built meal if a link insert fails.
  const [[meal]] = await db.batch([
    db
      .insert(meals)
      .values({ ...stripProtected(mealData), id: mealId, userId })
      .returning(),
    ...linkStatements(mealId, { tagIds, mealTypeIds, ingredientsList }, false),
  ]);

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

  // Ownership check first: the link statements below are scoped by meal id.
  const previous = await db.query.meals.findFirst({
    where: and(
      eq(meals.id, mealId),
      eq(meals.userId, userId),
      isNull(meals.deletedAt),
    ),
    columns: { imageUrl: true },
  });
  if (!previous) {
    throw new UserError("Danie nie zostało znalezione");
  }

  // One batch = one transaction: a failed insert can't leave the meal
  // stripped of its tags or ingredients.
  const [[meal]] = await db.batch([
    db
      .update(meals)
      .set({ ...stripProtected(mealData), updatedAt: new Date() })
      .where(and(eq(meals.id, mealId), eq(meals.userId, userId)))
      .returning(),
    ...linkStatements(mealId, { tagIds, mealTypeIds, ingredientsList }, true),
  ]);

  if (previous.imageUrl && previous.imageUrl !== meal.imageUrl) {
    await deleteUnreferencedBlobs([previous.imageUrl]);
  }

  return meal;
}

export async function deleteMeal(
  mealId: string,
  userId: string,
): Promise<void> {
  // Soft delete: plans that used the meal keep showing it. The row still
  // references its image, so the Blob file stays too.
  await db
    .update(meals)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(meals.id, mealId),
        eq(meals.userId, userId),
        isNull(meals.deletedAt),
      ),
    );
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
