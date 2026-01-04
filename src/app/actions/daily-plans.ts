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
import type { DailyPlan, DailyPlanMeal, DailyPlanWithMeals } from "@/types";
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
