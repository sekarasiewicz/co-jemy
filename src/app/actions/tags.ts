"use server";

import { revalidatePath } from "next/cache";
import { addMissingDefaultMealTypes } from "@/lib/services/meal-types";
import {
  createTag,
  deleteTag,
  getTagsByUserId,
  updateTag,
} from "@/lib/services/tags";
import type { MealType, Tag } from "@/types";
import { requireAuth } from "./auth";

export async function getTagsAction(): Promise<Tag[]> {
  const session = await requireAuth();
  return getTagsByUserId(session.user.id);
}

export async function createTagAction(data: {
  name: string;
  color?: string;
}): Promise<Tag> {
  const session = await requireAuth();
  const tag = await createTag(session.user.id, data);
  revalidatePath("/meals");
  return tag;
}

export async function updateTagAction(
  tagId: string,
  data: { name?: string; color?: string },
): Promise<Tag> {
  const session = await requireAuth();
  const tag = await updateTag(tagId, session.user.id, data);
  revalidatePath("/meals");
  return tag;
}

export async function deleteTagAction(tagId: string): Promise<void> {
  const session = await requireAuth();
  await deleteTag(tagId, session.user.id);
  revalidatePath("/meals");
}

export async function getMealTypesAction(): Promise<MealType[]> {
  const session = await requireAuth();
  // Automatically add missing default meal types (e.g., II śniadanie)
  return addMissingDefaultMealTypes(session.user.id);
}
