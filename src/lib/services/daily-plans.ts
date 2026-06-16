import { and, eq, gt, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { dailyPlanMeals, dailyPlans, profiles } from "@/db/schema";
import { generateId, isSameDay } from "@/lib/utils";
import type {
  DailyPlan,
  DailyPlanMeal,
  DailyPlanWithMeals,
  NewDailyPlan,
} from "@/types";

export async function getDailyPlanByDate(
  userId: string,
  profileId: string,
  date: Date,
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
      lte(dailyPlans.date, endOfDay),
    ),
    with: {
      profile: true,
      dailyPlanMeals: {
        with: {
          meal: {
            with: {
              mealIngredients: {
                with: { ingredient: true },
              },
            },
          },
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
  date: Date,
): Promise<DailyPlanWithMeals[]> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const plans = await db.query.dailyPlans.findMany({
    where: and(
      eq(dailyPlans.userId, userId),
      gte(dailyPlans.date, startOfDay),
      lte(dailyPlans.date, endOfDay),
    ),
    with: {
      profile: true,
      dailyPlanMeals: {
        with: {
          meal: {
            with: {
              mealIngredients: {
                with: { ingredient: true },
              },
            },
          },
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
  dateTo: Date,
): Promise<DailyPlanWithMeals[]> {
  const plans = await db.query.dailyPlans.findMany({
    where: and(
      eq(dailyPlans.userId, userId),
      eq(dailyPlans.profileId, profileId),
      gte(dailyPlans.date, dateFrom),
      lte(dailyPlans.date, dateTo),
    ),
    with: {
      profile: true,
      dailyPlanMeals: {
        with: {
          meal: {
            with: {
              mealIngredients: {
                with: { ingredient: true },
              },
            },
          },
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
  date: Date,
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
  servings: number = 1,
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
  completed: boolean,
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
  servings: number,
): Promise<DailyPlanMeal> {
  const [planMeal] = await db
    .update(dailyPlanMeals)
    .set({ servings })
    .where(eq(dailyPlanMeals.id, planMealId))
    .returning();

  return planMeal;
}

function atNoon(date: Date): Date {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Swap the plans (and their meals) between two days for a profile. */
export async function swapDailyPlans(
  userId: string,
  profileId: string,
  dateA: Date,
  dateB: Date,
): Promise<void> {
  const noonA = atNoon(dateA);
  const noonB = atNoon(dateB);
  const planA = await getDailyPlanByDate(userId, profileId, noonA);
  const planB = await getDailyPlanByDate(userId, profileId, noonB);

  // Just move the plan rows to each other's date (no unique constraint, so the
  // momentary overlap is fine). Plan meals follow via the FK.
  if (planA) {
    await db
      .update(dailyPlans)
      .set({ date: noonB })
      .where(eq(dailyPlans.id, planA.id));
  }
  if (planB) {
    await db
      .update(dailyPlans)
      .set({ date: noonA })
      .where(eq(dailyPlans.id, planB.id));
  }
}

/**
 * Insert a copy of a day at the next day, shifting every later plan forward by
 * one day so nothing is overwritten.
 */
export async function duplicateDayShiftForward(
  userId: string,
  profileId: string,
  date: Date,
): Promise<void> {
  const source = await getDailyPlanByDate(userId, profileId, atNoon(date));

  // Shift all later plans (date after the source day) forward by one day.
  const laterPlans = await db.query.dailyPlans.findMany({
    where: and(
      eq(dailyPlans.userId, userId),
      eq(dailyPlans.profileId, profileId),
      gt(dailyPlans.date, endOfDay(date)),
    ),
  });
  await Promise.all(
    laterPlans.map((p) => {
      const shifted = new Date(p.date);
      shifted.setDate(shifted.getDate() + 1);
      return db
        .update(dailyPlans)
        .set({ date: shifted })
        .where(eq(dailyPlans.id, p.id));
    }),
  );

  if (!source || source.meals.length === 0) return;

  // Create the copy at the now-vacated next day.
  const nextDay = atNoon(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const newPlan = await getOrCreateDailyPlan(userId, profileId, nextDay);
  await Promise.all(
    source.meals.map((m) =>
      addMealToPlan(newPlan.id, m.mealId, m.mealTypeId, m.servings),
    ),
  );
}
