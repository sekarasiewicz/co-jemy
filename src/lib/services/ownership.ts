import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyPlans,
  ingredients,
  meals,
  mealTypes,
  profiles,
  shoppingLists,
  tags,
} from "@/db/schema";
import { UserError } from "@/lib/action-result";

const ownedTables = {
  profiles,
  meals,
  mealTypes,
  tags,
  ingredients,
  shoppingLists,
};

/**
 * Throws unless every id belongs to the user. Use before linking client-supplied
 * ids into the user's own rows, so foreign rows can't be attached (and then
 * read back through relations).
 */
export async function assertOwned(
  table: keyof typeof ownedTables,
  userId: string,
  ids: (string | null | undefined)[],
): Promise<void> {
  const unique = [...new Set(ids.filter((id): id is string => !!id))];
  if (unique.length === 0) return;

  const t = ownedTables[table];
  const rows = await db
    .select({ id: t.id })
    .from(t)
    .where(
      and(
        inArray(t.id, unique),
        eq(t.userId, userId),
        // Deleted meals can't be linked into new plans.
        table === "meals" ? isNull(meals.deletedAt) : undefined,
      ),
    );

  if (rows.length !== unique.length) {
    throw new UserError("Nie znaleziono");
  }
}

/** Subquery: ids of the user's daily plans. */
export function userDailyPlanIds(userId: string) {
  return db
    .select({ id: dailyPlans.id })
    .from(dailyPlans)
    .where(eq(dailyPlans.userId, userId));
}

/** Subquery: ids of the user's shopping lists. */
export function userShoppingListIds(userId: string) {
  return db
    .select({ id: shoppingLists.id })
    .from(shoppingLists)
    .where(eq(shoppingLists.userId, userId));
}

/**
 * Drops server-owned columns from a client-supplied payload. Types alone don't
 * stop a caller of a server action from sending extra fields at runtime.
 */
export function stripProtected<T extends object>(data: T): T {
  const {
    id: _id,
    userId: _userId,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    ...rest
  } = data as Record<string, unknown>;
  return rest as T;
}
