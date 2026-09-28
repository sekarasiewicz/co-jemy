import { and, desc, eq, gt, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { dailyPlanMeals, dailyPlans, } from "@/db/schema";
import { assertOwned, userDailyPlanIds } from "@/lib/services/ownership";
import { addDays, type DayKey } from "@/lib/day";
import { pickMealsForDay } from "@/lib/meal-picker";
import { getMealsByUserId } from "@/lib/services/meals";
import { generateId } from "@/lib/utils";
import type {
  DailyPlan,
  DailyPlanMeal,
  DailyPlanWithMeals,
  MealWithRelations,
  RandomizerFilters,
} from "@/types";
import { UserError } from "@/lib/action-result";

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
    throw new UserError("Nie udało się utworzyć planu dnia");
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
    throw new UserError("Posiłek nie został znaleziony");
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
    throw new UserError("Posiłek nie został znaleziony");
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

/**
 * Randomly fills days with one meal per meal type. The catalog is loaded once
 * and filtered in memory; plans and plan meals are written in bulk.
 */
export async function fillPlanner(
  userId: string,
  data: {
    profileId: string;
    days: DayKey[];
    filters: RandomizerFilters;
    mealTypeIds: string[];
    skipExistingDays: boolean;
  },
): Promise<{ daysFilledCount: number; mealsAddedCount: number }> {
  const { profileId, days } = data;
  if (days.length === 0) return { daysFilledCount: 0, mealsAddedCount: 0 };

  const [existingPlans, catalog] = await Promise.all([
    getDailyPlansByDateRange(userId, profileId, days[0], days[days.length - 1]),
    getMealsByUserId(userId),
  ]);

  const daysWithMeals = new Set(
    existingPlans.filter((p) => p.meals.length > 0).map((p) => p.date),
  );
  const targetDays = data.skipExistingDays
    ? days.filter((day) => !daysWithMeals.has(day))
    : days;

  // Pick meals per day first; a day gets different meals across meal types.
  const picks = new Map<DayKey, { mealId: string; mealTypeId: string }[]>();
  for (const day of targetDays) {
    const dayPicks = pickMealsForDay(catalog, data.mealTypeIds, data.filters)
      .filter((pick) => pick.meal !== null)
      .map((pick) => ({
        mealId: (pick.meal as MealWithRelations).id,
        mealTypeId: pick.mealTypeId,
      }));
    if (dayPicks.length > 0) picks.set(day, dayPicks);
  }
  if (picks.size === 0) return { daysFilledCount: 0, mealsAddedCount: 0 };

  // Create the missing plans in one insert, then read back all plan ids.
  await db
    .insert(dailyPlans)
    .values(
      [...picks.keys()].map((day) => ({
        id: generateId(),
        userId,
        profileId,
        date: day,
      })),
    )
    .onConflictDoNothing();
  const plans = await db
    .select({ id: dailyPlans.id, date: dailyPlans.date })
    .from(dailyPlans)
    .where(
      and(
        eq(dailyPlans.userId, userId),
        eq(dailyPlans.profileId, profileId),
        inArray(dailyPlans.date, [...picks.keys()]),
      ),
    );
  const planIdByDay = new Map(plans.map((p) => [p.date, p.id]));

  const rows = [...picks.entries()].flatMap(([day, dayPicks]) =>
    dayPicks.map((pick) => ({
      id: generateId(),
      dailyPlanId: planIdByDay.get(day) as string,
      mealId: pick.mealId,
      mealTypeId: pick.mealTypeId,
    })),
  );
  await db.insert(dailyPlanMeals).values(rows);

  return { daysFilledCount: picks.size, mealsAddedCount: rows.length };
}

/** Adds several meals to one day in a single insert. */
export async function addMealsToPlan(
  userId: string,
  profileId: string,
  day: DayKey,
  items: { mealId: string; mealTypeId: string }[],
): Promise<void> {
  if (items.length === 0) return;
  await Promise.all([
    assertOwned(
      "meals",
      userId,
      items.map((i) => i.mealId),
    ),
    assertOwned(
      "mealTypes",
      userId,
      items.map((i) => i.mealTypeId),
    ),
  ]);
  const plan = await getOrCreateDailyPlan(userId, profileId, day);
  await db.insert(dailyPlanMeals).values(
    items.map((item) => ({
      id: generateId(),
      dailyPlanId: plan.id,
      mealId: item.mealId,
      mealTypeId: item.mealTypeId,
    })),
  );
}
