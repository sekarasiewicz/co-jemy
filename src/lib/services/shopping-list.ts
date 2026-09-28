import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyPlans,
  shoppingListItems,
  shoppingLists,
} from "@/db/schema";
import { assertOwned, userShoppingListIds } from "@/lib/services/ownership";
import type { DayKey } from "@/lib/day";
import { aggregateShoppingTotals } from "@/lib/shopping";
import { generateId } from "@/lib/utils";
import type {
  ShoppingList,
  ShoppingListItem,
  ShoppingListWithItems,
} from "@/types";
import { UserError } from "@/lib/action-result";

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
  dateFrom: DayKey,
  dateTo: DayKey,
  name: string,
): Promise<ShoppingListWithItems> {
  await assertOwned("profiles", userId, profileIds);

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

  const totals = aggregateShoppingTotals(
    plans.flatMap((plan) =>
      plan.dailyPlanMeals.map((planMeal) => ({
        portions: planMeal.servings,
        meal: planMeal.meal,
      })),
    ),
  );

  // Create shopping list
  const listId = generateId();
  const itemsToInsert = totals.map((item) => ({
    id: generateId(),
    shoppingListId: listId,
    ingredientId: item.ingredient.id,
    amount: item.amount,
    unit: item.unit,
    category: item.ingredient.category,
  }));

  // List and items in one batch, so a failure can't leave an empty list.
  const insertList = db.insert(shoppingLists).values({
    id: listId,
    userId,
    profileIds,
    name,
    dateFrom,
    dateTo,
  });
  if (itemsToInsert.length > 0) {
    await db.batch([
      insertList,
      db.insert(shoppingListItems).values(itemsToInsert),
    ]);
  } else {
    await insertList;
  }

  const list = await getShoppingListById(listId, userId);
  if (!list) {
    throw new UserError("Nie udało się utworzyć listy zakupów");
  }
  return list;
}

export async function addItemToShoppingList(
  userId: string,
  listId: string,
  data: {
    ingredientId?: string;
    customName?: string;
    amount?: number;
    unit?: string;
    category: string;
  },
): Promise<ShoppingListItem> {
  await Promise.all([
    assertOwned("shoppingLists", userId, [listId]),
    assertOwned("ingredients", userId, [data.ingredientId]),
  ]);

  const [item] = await db
    .insert(shoppingListItems)
    .values({
      ingredientId: data.ingredientId,
      customName: data.customName,
      amount: data.amount,
      unit: data.unit,
      category: data.category,
      id: generateId(),
      shoppingListId: listId,
    })
    .returning();

  return item;
}

function ownedItem(userId: string, itemId: string) {
  return and(
    eq(shoppingListItems.id, itemId),
    inArray(shoppingListItems.shoppingListId, userShoppingListIds(userId)),
  );
}

export async function toggleShoppingListItem(
  userId: string,
  itemId: string,
  field: "checked" | "inPantry",
): Promise<ShoppingListItem> {
  // Runtime whitelist: the union type isn't enforced for server-action callers.
  if (field !== "checked" && field !== "inPantry") {
    throw new UserError("Nieprawidłowe pole");
  }

  const item = await db.query.shoppingListItems.findFirst({
    where: ownedItem(userId, itemId),
  });

  if (!item) {
    throw new UserError("Pozycja nie została znaleziona");
  }

  const [updated] = await db
    .update(shoppingListItems)
    .set({ [field]: !item[field] })
    .where(ownedItem(userId, itemId))
    .returning();

  return updated;
}

export async function deleteShoppingListItem(
  userId: string,
  itemId: string,
): Promise<void> {
  await db.delete(shoppingListItems).where(ownedItem(userId, itemId));
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
