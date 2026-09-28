import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyPlans,
  ingredients,
  meals,
  mealTypes,
  shoppingLists,
  tags,
  users,
} from "@/db/schema";
import {
  deleteUnreferencedBlobs,
  getUserImageUrls,
} from "@/lib/services/blob-cleanup";

/**
 * Delete all app data for a user but keep the account, profiles and sessions.
 * Child tables (junctions, items, plan meals) are removed via ON DELETE CASCADE.
 */
export async function clearUserData(userId: string): Promise<void> {
  const imageUrls = await getUserImageUrls(userId);
  await db.delete(dailyPlans).where(eq(dailyPlans.userId, userId));
  await db.delete(shoppingLists).where(eq(shoppingLists.userId, userId));
  await db.delete(meals).where(eq(meals.userId, userId));
  await db.delete(ingredients).where(eq(ingredients.userId, userId));
  await db.delete(tags).where(eq(tags.userId, userId));
  await db.delete(mealTypes).where(eq(mealTypes.userId, userId));
  // Profiles are kept, so their avatars stay referenced and survive this.
  await deleteUnreferencedBlobs(imageUrls);
}

/**
 * Delete the user account entirely. Every related row (profiles, sessions,
 * accounts and all app data) is removed via ON DELETE CASCADE from users.
 */
export async function deleteUserAccount(userId: string): Promise<void> {
  const imageUrls = await getUserImageUrls(userId);
  await db.delete(users).where(eq(users.id, userId));
  await deleteUnreferencedBlobs(imageUrls);
}
