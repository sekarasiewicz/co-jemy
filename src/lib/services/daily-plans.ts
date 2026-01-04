import { db } from "@/db";
import { dailyPlans, dailyPlanMeals, profiles } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { generateId, isSameDay } from "@/lib/utils";
import type {
  DailyPlan,
  NewDailyPlan,
  DailyPlanWithMeals,
  DailyPlanMeal,
} from "@/types";

export async function getDailyPlanByDate(
  userId: string,
  profileId: string,
  date: Date
): Promise<DailyPlanWithMeals | undefined> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const plan = await db.query.dailyPlans.findFirst({
    where: and(
      eq(dailyPlans.userId, userId),
      eq(dailyPlans.profileId, profileId),
      gte(dailyPlans.date, startOfDay),
      lte(dailyPlans.date, endOfDay)
    ),
    with: {
      profile: true,
      dailyPlanMeals: {
        with: {
          meal: true,
          mealType: true,
        },
      },
    },
  });

  if (!plan) return undefined;

  return {
    ...plan,
    meals: plan.dailyPlanMeals,
  };
}

export async function getDailyPlansForAllProfiles(
  userId: string,
  date: Date
): Promise<DailyPlanWithMeals[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const plans = await db.query.dailyPlans.findMany({
    where: and(
      eq(dailyPlans.userId, userId),
      gte(dailyPlans.date, startOfDay),
      lte(dailyPlans.date, endOfDay)
    ),
    with: {
      profile: true,
      dailyPlanMeals: {
        with: {
          meal: true,
          mealType: true,
        },
      },
    },
  });

  return plans.map((plan) => ({
    ...plan,
    meals: plan.dailyPlanMeals,
  }));
}

export async function getDailyPlansByDateRange(
  userId: string,
  profileId: string,
  dateFrom: Date,
  dateTo: Date
): Promise<DailyPlanWithMeals[]> {
  const plans = await db.query.dailyPlans.findMany({
    where: and(
      eq(dailyPlans.userId, userId),
      eq(dailyPlans.profileId, profileId),
      gte(dailyPlans.date, dateFrom),
      lte(dailyPlans.date, dateTo)
    ),
    with: {
      profile: true,
      dailyPlanMeals: {
        with: {
          meal: true,
          mealType: true,
        },
      },
    },
    orderBy: dailyPlans.date,
  });

  return plans.map((plan) => ({
    ...plan,
    meals: plan.dailyPlanMeals,
  }));
}

export async function getOrCreateDailyPlan(
  userId: string,
  profileId: string,
  date: Date
): Promise<DailyPlan> {
  const existing = await getDailyPlanByDate(userId, profileId, date);

  if (existing) {
    return existing;
  }

  const [plan] = await db
    .insert(dailyPlans)
    .values({
      id: generateId(),
      userId,
      profileId,
      date,
    })
    .returning();

  return plan;
}

export async function addMealToPlan(
  dailyPlanId: string,
  mealId: string,
  mealTypeId: string,
  servings: number = 1
): Promise<DailyPlanMeal> {
  const [planMeal] = await db
    .insert(dailyPlanMeals)
    .values({
      id: generateId(),
      dailyPlanId,
      mealId,
      mealTypeId,
      servings,
    })
    .returning();

  return planMeal;
}

export async function removeMealFromPlan(planMealId: string): Promise<void> {
  await db.delete(dailyPlanMeals).where(eq(dailyPlanMeals.id, planMealId));
}

export async function toggleMealCompleted(
  planMealId: string,
  completed: boolean
): Promise<DailyPlanMeal> {
  const [planMeal] = await db
    .update(dailyPlanMeals)
    .set({ completed })
    .where(eq(dailyPlanMeals.id, planMealId))
    .returning();

  return planMeal;
}

export async function updatePlanMealServings(
  planMealId: string,
  servings: number
): Promise<DailyPlanMeal> {
  const [planMeal] = await db
    .update(dailyPlanMeals)
    .set({ servings })
    .where(eq(dailyPlanMeals.id, planMealId))
    .returning();

  return planMeal;
}
