import { and, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyPlanMeals, dailyPlans, profiles } from "@/db/schema";
import { assertOwned, userDailyPlanIds } from "@/lib/services/ownership";
import { addDays, type DayKey } from "@/lib/day";
import { generateId } from "@/lib/utils";
import type {
  DailyPlan,
  DailyPlanMeal,
  DailyPlanWithMeals,
  NewDailyPlan,
} from "@/types";

export async function getDailyPlanByDate(
  userId: string,
  profileId: string,
  day: DayKey,
): Promise<DailyPlanWithMeals | undefined> {
  const plan = await db.query.dailyPlans.findFirst({
    where: and(
      eq(dailyPlans.userId, userId),
      eq(dailyPlans.profileId, profileId),
      eq(dailyPlans.date, day),
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
  day: DayKey,
): Promise<DailyPlanWithMeals[]> {
  const plans = await db.query.dailyPlans.findMany({
    where: and(eq(dailyPlans.userId, userId), eq(dailyPlans.date, day)),
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
  dateFrom: DayKey,
  dateTo: DayKey,
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
  day: DayKey,
): Promise<DailyPlan> {
  const findExisting = () =>
    db.query.dailyPlans.findFirst({
      where: and(
        eq(dailyPlans.userId, userId),
        eq(dailyPlans.profileId, profileId),
        eq(dailyPlans.date, day),
      ),
    });

  const existing = await findExisting();
  if (existing) {
    return existing;
  }

  await assertOwned("profiles", userId, [profileId]);

  // Unique (profile_id, date): a concurrent insert wins and we read its row.
  const [plan] = await db
    .insert(dailyPlans)
    .values({
      id: generateId(),
      userId,
      profileId,
      date: day,
    })
    .onConflictDoNothing()
    .returning();

  const result = plan ?? (await findExisting());
  if (!result) {
    throw new Error("Nie udało się utworzyć planu dnia");
  }
  return result;
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

function ownedPlanMeal(userId: string, planMealId: string) {
  return and(
    eq(dailyPlanMeals.id, planMealId),
    inArray(dailyPlanMeals.dailyPlanId, userDailyPlanIds(userId)),
  );
}

export async function removeMealFromPlan(
  userId: string,
  planMealId: string,
): Promise<void> {
  await db.delete(dailyPlanMeals).where(ownedPlanMeal(userId, planMealId));
}

export async function toggleMealCompleted(
  userId: string,
  planMealId: string,
  completed: boolean,
): Promise<DailyPlanMeal> {
  const [planMeal] = await db
    .update(dailyPlanMeals)
    .set({ completed })
    .where(ownedPlanMeal(userId, planMealId))
    .returning();

  if (!planMeal) {
    throw new Error("Posiłek nie został znaleziony");
  }
  return planMeal;
}

export async function updatePlanMealServings(
  userId: string,
  planMealId: string,
  servings: number,
): Promise<DailyPlanMeal> {
  const [planMeal] = await db
    .update(dailyPlanMeals)
    .set({ servings })
    .where(ownedPlanMeal(userId, planMealId))
    .returning();

  if (!planMeal) {
    throw new Error("Posiłek nie został znaleziony");
  }
  return planMeal;
}

/**
 * Swap the meals between two days for a profile. Plans stay on their dates
 * (one plan per profile per day); their meals change owners in one statement.
 */
export async function swapDailyPlans(
  userId: string,
  profileId: string,
  dayA: DayKey,
  dayB: DayKey,
): Promise<void> {
  if (dayA === dayB) return;

  const [planA, planB] = await Promise.all([
    getOrCreateDailyPlan(userId, profileId, dayA),
    getOrCreateDailyPlan(userId, profileId, dayB),
  ]);

  await db
    .update(dailyPlanMeals)
    .set({
      dailyPlanId: sql`case when ${dailyPlanMeals.dailyPlanId} = ${planA.id} then ${planB.id} else ${planA.id} end`,
    })
    .where(inArray(dailyPlanMeals.dailyPlanId, [planA.id, planB.id]));
}

/**
 * Insert a copy of a day at the next day, shifting every later plan forward by
 * one day so nothing is overwritten.
 */
export async function duplicateDayShiftForward(
  userId: string,
  profileId: string,
  day: DayKey,
): Promise<void> {
  const source = await getDailyPlanByDate(userId, profileId, day);

  // Shift all later plans forward by one day, latest first, so each move lands
  // on a day that is already free (one plan per profile per day). Batched so
  // the calendar never ends up half-shifted.
  const laterPlans = await db.query.dailyPlans.findMany({
    where: and(
      eq(dailyPlans.userId, userId),
      eq(dailyPlans.profileId, profileId),
      gt(dailyPlans.date, day),
    ),
    orderBy: desc(dailyPlans.date),
  });
  const [firstShift, ...restShifts] = laterPlans.map((p) =>
    db
      .update(dailyPlans)
      .set({ date: addDays(p.date, 1) })
      .where(eq(dailyPlans.id, p.id)),
  );
  if (firstShift) {
    await db.batch([firstShift, ...restShifts]);
  }

  if (!source || source.meals.length === 0) return;

  // Create the copy at the now-vacated next day.
  const newPlan = await getOrCreateDailyPlan(
    userId,
    profileId,
    addDays(day, 1),
  );
  await db.insert(dailyPlanMeals).values(
    source.meals.map((m) => ({
      id: generateId(),
      dailyPlanId: newPlan.id,
      mealId: m.mealId,
      mealTypeId: m.mealTypeId,
      servings: m.servings,
    })),
  );
}
