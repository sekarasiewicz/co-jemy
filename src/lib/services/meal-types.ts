import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { mealTypes } from "@/db/schema";
import { generateId } from "@/lib/utils";
import type { MealType, NewMealType } from "@/types";

export async function getMealTypesByUserId(
  userId: string,
): Promise<MealType[]> {
  return db.query.mealTypes.findMany({
    where: eq(mealTypes.userId, userId),
    orderBy: mealTypes.order,
  });
}

export async function getMealTypeById(
  mealTypeId: string,
  userId: string,
): Promise<MealType | undefined> {
  return db.query.mealTypes.findFirst({
    where: and(eq(mealTypes.id, mealTypeId), eq(mealTypes.userId, userId)),
  });
}

export async function createMealType(
  userId: string,
  data: Omit<NewMealType, "id" | "userId" | "createdAt">,
): Promise<MealType> {
  const [mealType] = await db
    .insert(mealTypes)
    .values({
      id: generateId(),
      userId,
      ...data,
    })
    .returning();

  return mealType;
}

export async function updateMealType(
  mealTypeId: string,
  userId: string,
  data: Partial<Omit<NewMealType, "id" | "userId" | "createdAt">>,
): Promise<MealType> {
  const [mealType] = await db
    .update(mealTypes)
    .set(data)
    .where(and(eq(mealTypes.id, mealTypeId), eq(mealTypes.userId, userId)))
    .returning();

  if (!mealType) {
    throw new Error("Typ posiłku nie został znaleziony");
  }

  return mealType;
}

export async function deleteMealType(
  mealTypeId: string,
  userId: string,
): Promise<void> {
  await db
    .delete(mealTypes)
    .where(and(eq(mealTypes.id, mealTypeId), eq(mealTypes.userId, userId)));
}

export async function createDefaultMealTypes(
  userId: string,
): Promise<MealType[]> {
  // Check if user already has meal types (prevent duplicates)
  const existingMealTypes = await getMealTypesByUserId(userId);
  if (existingMealTypes.length > 0) {
    return existingMealTypes;
  }

  const defaultTypes = [
    { name: "Śniadanie", order: 0 },
    { name: "Obiad", order: 1 },
    { name: "Kolacja", order: 2 },
    { name: "Przekąska", order: 3 },
  ];

  const mealTypesData = defaultTypes.map((type) => ({
    id: generateId(),
    userId,
    ...type,
  }));

  await db.insert(mealTypes).values(mealTypesData);

  return getMealTypesByUserId(userId);
}
