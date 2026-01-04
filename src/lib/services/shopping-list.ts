import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyPlanMeals,
  dailyPlans,
  type ingredients,
  mealIngredients,
  shoppingListItems,
  shoppingLists,
} from "@/db/schema";
import { aggregateIngredients, generateId } from "@/lib/utils";
import type {
  NewShoppingList,
  ShoppingList,
  ShoppingListItem,
  ShoppingListWithItems,
} from "@/types";

export async function getShoppingListsByUserId(
  userId: string,
): Promise<ShoppingList[]> {
  return db.query.shoppingLists.findMany({
    where: eq(shoppingLists.userId, userId),
    orderBy: shoppingLists.createdAt,
  });
}

export async function getShoppingListById(
  listId: string,
  userId: string,
): Promise<ShoppingListWithItems | undefined> {
  const list = await db.query.shoppingLists.findFirst({
    where: and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)),
    with: {
      items: {
        with: {
          ingredient: true,
        },
      },
    },
  });

  return list;
}

export async function generateShoppingListFromDateRange(
  userId: string,
  profileIds: string[],
  dateFrom: Date,
  dateTo: Date,
  name: string,
): Promise<ShoppingListWithItems> {
  // Get all daily plans for selected profiles in date range
  const plans = await db.query.dailyPlans.findMany({
    where: and(
      eq(dailyPlans.userId, userId),
      inArray(dailyPlans.profileId, profileIds),
      gte(dailyPlans.date, dateFrom),
      lte(dailyPlans.date, dateTo),
    ),
    with: {
      dailyPlanMeals: {
        with: {
          meal: {
            with: {
              mealIngredients: {
                with: {
                  ingredient: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Collect all ingredients from all meals
  const allIngredients: {
    ingredient: typeof ingredients.$inferSelect;
    amount: number;
    unit: string;
    servings: number;
  }[] = [];

  for (const plan of plans) {
    for (const planMeal of plan.dailyPlanMeals) {
      for (const mealIng of planMeal.meal.mealIngredients) {
        allIngredients.push({
          ingredient: mealIng.ingredient,
          amount: mealIng.amount,
          unit: mealIng.unit,
          servings: planMeal.servings,
        });
      }
    }
  }

  // Create shopping list
  const listId = generateId();
  const [list] = await db
    .insert(shoppingLists)
    .values({
      id: listId,
      userId,
      profileIds,
      name,
      dateFrom,
      dateTo,
    })
    .returning();

  // Aggregate and insert items
  const aggregatedMap = new Map<
    string,
    {
      ingredient: typeof ingredients.$inferSelect;
      totalAmount: number;
      unit: string;
    }
  >();

  for (const item of allIngredients) {
    const key = `${item.ingredient.id}-${item.unit}`;
    const existing = aggregatedMap.get(key);
    const scaledAmount = item.amount * item.servings;

    if (existing) {
      existing.totalAmount += scaledAmount;
    } else {
      aggregatedMap.set(key, {
        ingredient: item.ingredient,
        totalAmount: scaledAmount,
        unit: item.unit,
      });
    }
  }

  const itemsToInsert = Array.from(aggregatedMap.values()).map((item) => ({
    id: generateId(),
    shoppingListId: listId,
    ingredientId: item.ingredient.id,
    amount: item.totalAmount,
    unit: item.unit,
    category: item.ingredient.category,
  }));

  if (itemsToInsert.length > 0) {
    await db.insert(shoppingListItems).values(itemsToInsert);
  }

  return getShoppingListById(listId, userId) as Promise<ShoppingListWithItems>;
}

export async function addItemToShoppingList(
  listId: string,
  data: {
    ingredientId?: string;
    customName?: string;
    amount?: number;
    unit?: string;
    category: string;
  },
): Promise<ShoppingListItem> {
  const [item] = await db
    .insert(shoppingListItems)
    .values({
      id: generateId(),
      shoppingListId: listId,
      ...data,
    })
    .returning();

  return item;
}

export async function toggleShoppingListItem(
  itemId: string,
  field: "checked" | "inPantry",
): Promise<ShoppingListItem> {
  const item = await db.query.shoppingListItems.findFirst({
    where: eq(shoppingListItems.id, itemId),
  });

  if (!item) {
    throw new Error("Pozycja nie została znaleziona");
  }

  const [updated] = await db
    .update(shoppingListItems)
    .set({ [field]: !item[field] })
    .where(eq(shoppingListItems.id, itemId))
    .returning();

  return updated;
}

export async function deleteShoppingListItem(itemId: string): Promise<void> {
  await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));
}

export async function deleteShoppingList(
  listId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(shoppingLists)
    .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)));
}

export async function updateShoppingListName(
  listId: string,
  userId: string,
  name: string,
): Promise<ShoppingList> {
  const [list] = await db
    .update(shoppingLists)
    .set({ name })
    .where(and(eq(shoppingLists.id, listId), eq(shoppingLists.userId, userId)))
    .returning();

  return list;
}
