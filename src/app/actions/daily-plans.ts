"use server";

import { revalidatePath } from "next/cache";
import {
  addMealToPlan,
  getDailyPlanByDate,
  getDailyPlansByDateRange,
  getDailyPlansForAllProfiles,
  getOrCreateDailyPlan,
  removeMealFromPlan,
  toggleMealCompleted,
  updatePlanMealServings,
} from "@/lib/services/daily-plans";
import { randomizeSingleMeal } from "@/lib/services/meals";
import type { DailyPlan, DailyPlanMeal, DailyPlanWithMeals, RandomizerFilters } from "@/types";
import { requireAuth } from "./auth";

export async function getDailyPlanAction(
  profileId: string,
  date: Date,
): Promise<DailyPlanWithMeals | undefined> {
  const session = await requireAuth();
  return getDailyPlanByDate(session.user.id, profileId, date);
}

export async function getDailyPlansForAllProfilesAction(
  date: Date,
): Promise<DailyPlanWithMeals[]> {
  const session = await requireAuth();
  return getDailyPlansForAllProfiles(session.user.id, date);
}

export async function getDailyPlansByDateRangeAction(
  profileId: string,
  dateFrom: Date,
  dateTo: Date,
): Promise<DailyPlanWithMeals[]> {
  const session = await requireAuth();
  return getDailyPlansByDateRange(session.user.id, profileId, dateFrom, dateTo);
}

export async function addMealToPlanAction(data: {
  profileId: string;
  date: Date;
  mealId: string;
  mealTypeId: string;
  servings?: number;
}): Promise<DailyPlanMeal> {
  const session = await requireAuth();

  const plan = await getOrCreateDailyPlan(
    session.user.id,
    data.profileId,
    data.date,
  );

  const planMeal = await addMealToPlan(
    plan.id,
    data.mealId,
    data.mealTypeId,
    data.servings,
  );

  revalidatePath("/planner");
  return planMeal;
}

export async function removeMealFromPlanAction(
  planMealId: string,
): Promise<void> {
  await requireAuth();
  await removeMealFromPlan(planMealId);
  revalidatePath("/planner");
}

export async function toggleMealCompletedAction(
  planMealId: string,
  completed: boolean,
): Promise<DailyPlanMeal> {
  await requireAuth();
  const planMeal = await toggleMealCompleted(planMealId, completed);
  revalidatePath("/planner");
  return planMeal;
}

export async function updatePlanMealServingsAction(
  planMealId: string,
  servings: number,
): Promise<DailyPlanMeal> {
  await requireAuth();
  const planMeal = await updatePlanMealServings(planMealId, servings);
  revalidatePath("/planner");
  return planMeal;
}

export async function fillPlannerAction(data: {
  profileId: string;
  dates: Date[];
  filters: RandomizerFilters;
  mealTypeIds: string[];
  skipExistingDays: boolean;
}): Promise<{ daysFilledCount: number; mealsAddedCount: number }> {
  const session = await requireAuth();
  const userId = session.user.id;

  // Fetch existing plans for the date range to check which days already have meals
  const existingPlans =
    data.dates.length > 0
      ? await getDailyPlansByDateRange(
          userId,
          data.profileId,
          data.dates[0],
          data.dates[data.dates.length - 1],
        )
      : [];

  let daysFilledCount = 0;
  let mealsAddedCount = 0;

  for (const date of data.dates) {
    // Check if this day already has meals
    if (data.skipExistingDays) {
      const existingPlan = existingPlans.find(
        (p) => new Date(p.date).toDateString() === date.toDateString(),
      );
      if (existingPlan && existingPlan.meals.length > 0) {
        continue;
      }
    }

    const plan = await getOrCreateDailyPlan(userId, data.profileId, date);
    const excludeMealIds: string[] = [];
    let addedForDay = false;

    for (const mealTypeId of data.mealTypeIds) {
      const filters: RandomizerFilters = {
        ...data.filters,
        mealTypeId,
        excludeMealIds: excludeMealIds.length > 0 ? excludeMealIds : undefined,
      };

      const meal = await randomizeSingleMeal(userId, filters);
      if (meal) {
        await addMealToPlan(plan.id, meal.id, mealTypeId, meal.servings);
        excludeMealIds.push(meal.id);
        mealsAddedCount++;
        addedForDay = true;
      }
    }

    if (addedForDay) {
      daysFilledCount++;
    }
  }

  revalidatePath("/planner");
  return { daysFilledCount, mealsAddedCount };
}
