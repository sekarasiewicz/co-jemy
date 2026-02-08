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

const DEFAULT_MEAL_TYPES = [
  { name: "Śniadanie", order: 0 },
  { name: "II śniadanie", order: 1 },
  { name: "Obiad", order: 2 },
  { name: "Kolacja", order: 3 },
  { name: "Przekąska", order: 4 },
];

export async function addMissingDefaultMealTypes(
  userId: string,
): Promise<MealType[]> {
  const existingMealTypes = await getMealTypesByUserId(userId);
  const existingNames = existingMealTypes.map((mt) => mt.name.toLowerCase());

  const missingTypes = DEFAULT_MEAL_TYPES.filter(
    (type) => !existingNames.includes(type.name.toLowerCase())
  );

  if (missingTypes.length > 0) {
    const maxOrder = existingMealTypes.length > 0
      ? Math.max(...existingMealTypes.map((mt) => mt.order))
      : -1;

    const mealTypesData = missingTypes.map((type, index) => ({
      id: generateId(),
      userId,
      name: type.name,
      order: maxOrder + 1 + index,
    }));

    await db.insert(mealTypes).values(mealTypesData);
  }

  return getMealTypesByUserId(userId);
}
