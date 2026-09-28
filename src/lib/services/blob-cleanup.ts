import { del } from "@vercel/blob";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ingredients, meals, profiles } from "@/db/schema";

function isBlobUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

/**
 * Deletes Blob files that no row references any more. Call after the rows that
 * used them were updated or deleted. The same URL can be shared (e.g. an
 * ingredient converted into a meal keeps its image), hence the reference check.
 * Never throws — a failed cleanup must not fail the user's operation.
 */
export async function deleteUnreferencedBlobs(
  urls: (string | null | undefined)[],
): Promise<void> {
  const candidates = [...new Set(urls.filter(isBlobUrl))];
  if (candidates.length === 0) return;

  try {
    const [mealRefs, ingredientRefs, profileRefs] = await Promise.all([
      db
        .select({ url: meals.imageUrl })
        .from(meals)
        .where(inArray(meals.imageUrl, candidates)),
      db
        .select({ url: ingredients.image })
        .from(ingredients)
        .where(inArray(ingredients.image, candidates)),
      db
        .select({ url: profiles.avatar })
        .from(profiles)
        .where(inArray(profiles.avatar, candidates)),
    ]);
    const referenced = new Set(
      [...mealRefs, ...ingredientRefs, ...profileRefs].map((r) => r.url),
    );
    const orphaned = candidates.filter((url) => !referenced.has(url));
    if (orphaned.length > 0) await del(orphaned);
  } catch (err) {
    console.error("Failed to delete blobs", err);
  }
}

/** Every image URL owned by a user — collect before bulk-deleting their rows. */
export async function getUserImageUrls(userId: string): Promise<string[]> {
  const [mealRows, ingredientRows, profileRows] = await Promise.all([
    db
      .select({ url: meals.imageUrl })
      .from(meals)
      .where(eq(meals.userId, userId)),
    db
      .select({ url: ingredients.image })
      .from(ingredients)
      .where(eq(ingredients.userId, userId)),
    db
      .select({ url: profiles.avatar })
      .from(profiles)
      .where(eq(profiles.userId, userId)),
  ]);
  return [...mealRows, ...ingredientRows, ...profileRows]
    .map((r) => r.url)
    .filter(isBlobUrl);
}
