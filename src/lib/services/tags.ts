import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { tags } from "@/db/schema";
import { generateId } from "@/lib/utils";
import type { NewTag, Tag } from "@/types";

export async function getTagsByUserId(userId: string): Promise<Tag[]> {
  return db.query.tags.findMany({
    where: eq(tags.userId, userId),
    orderBy: tags.name,
  });
}

export async function getTagById(
  tagId: string,
  userId: string,
): Promise<Tag | undefined> {
  return db.query.tags.findFirst({
    where: and(eq(tags.id, tagId), eq(tags.userId, userId)),
  });
}

export async function createTag(
  userId: string,
  data: Omit<NewTag, "id" | "userId" | "createdAt">,
): Promise<Tag> {
  const [tag] = await db
    .insert(tags)
    .values({
      id: generateId(),
      userId,
      ...data,
    })
    .returning();

  return tag;
}

export async function updateTag(
  tagId: string,
  userId: string,
  data: Partial<Omit<NewTag, "id" | "userId" | "createdAt">>,
): Promise<Tag> {
  const [tag] = await db
    .update(tags)
    .set(data)
    .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
    .returning();

  if (!tag) {
    throw new Error("Tag nie został znaleziony");
  }

  return tag;
}

export async function deleteTag(tagId: string, userId: string): Promise<void> {
  await db.delete(tags).where(and(eq(tags.id, tagId), eq(tags.userId, userId)));
}
