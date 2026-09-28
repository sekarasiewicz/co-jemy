"use server";

import { revalidatePath } from "next/cache";
import {
  addMealToPlan,
  addMealsToPlan,
  duplicateDayShiftForward,
  fillPlanner,
  getDailyPlanByDate,
  getDailyPlansByDateRange,
  getDailyPlansForAllProfiles,
  getOrCreateDailyPlan,
  removeMealFromPlan,
  swapDailyPlans,
  toggleMealCompleted,
  updatePlanMealServings,
} from "@/lib/services/daily-plans";
import { assertDayKey } from "@/lib/day";
import { assertOwned } from "@/lib/services/ownership";
import type { DailyPlanMeal, DailyPlanWithMeals, RandomizerFilters } from "@/types";
import { requireAuth } from "@/lib/session";
import { UserError } from "@/lib/action-result";

function assertPortions(servings: number): void {
  if (!Number.isFinite(servings) || servings <= 0 || servings > 50) {
    throw new UserError("Nieprawidłowa liczba porcji");
  }
}

export async function getDailyPlanAction(
  profileId: string,
  day: string,
): Promise<DailyPlanWithMeals | undefined> {
  const session = await requireAuth();
  return getDailyPlanByDate(session.user.id, profileId, assertDayKey(day));
}

export async function getDailyPlansForAllProfilesAction(
  day: string,
): Promise<DailyPlanWithMeals[]> {
  const session = await requireAuth();
  return getDailyPlansForAllProfiles(session.user.id, assertDayKey(day));
}

export async function getDailyPlansByDateRangeAction(
  profileId: string,
  dateFrom: string,
  dateTo: string,
): Promise<DailyPlanWithMeals[]> {
  const session = await requireAuth();
  return getDailyPlansByDateRange(
    session.user.id,
    profileId,
    assertDayKey(dateFrom),
    assertDayKey(dateTo),
  );
}

export async function addMealToPlanAction(data: {
  profileId: string;
  day: string;
  mealId: string;
  mealTypeId: string;
  servings?: number;
}): Promise<DailyPlanMeal> {
  const session = await requireAuth();
  if (data.servings !== undefined) assertPortions(data.servings);
  await Promise.all([
    assertOwned("meals", session.user.id, [data.mealId]),
    assertOwned("mealTypes", session.user.id, [data.mealTypeId]),
  ]);

  const plan = await getOrCreateDailyPlan(
    session.user.id,
    data.profileId,
    assertDayKey(data.day),
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

export async function addMealsToPlanAction(data: {
  profileId: string;
  day: string;
  items: { mealId: string; mealTypeId: string }[];
}): Promise<void> {
  const session = await requireAuth();
  await addMealsToPlan(
    session.user.id,
    data.profileId,
    assertDayKey(data.day),
    data.items,
  );
  revalidatePath("/planner");
}

export async function removeMealFromPlanAction(
  planMealId: string,
): Promise<void> {
  const session = await requireAuth();
  await removeMealFromPlan(session.user.id, planMealId);
  revalidatePath("/planner");
}

export async function toggleMealCompletedAction(
  planMealId: string,
  completed: boolean,
): Promise<DailyPlanMeal> {
  const session = await requireAuth();
  const planMeal = await toggleMealCompleted(
    session.user.id,
    planMealId,
    completed,
  );
  revalidatePath("/planner");
  return planMeal;
}

export async function updatePlanMealServingsAction(
  planMealId: string,
  servings: number,
): Promise<DailyPlanMeal> {
  const session = await requireAuth();
  assertPortions(servings);
  const planMeal = await updatePlanMealServings(
    session.user.id,
    planMealId,
    servings,
  );
  revalidatePath("/planner");
  return planMeal;
}

export async function swapDailyPlansAction(data: {
  profileId: string;
  dayA: string;
  dayB: string;
}): Promise<void> {
  const session = await requireAuth();
  await swapDailyPlans(
    session.user.id,
    data.profileId,
    assertDayKey(data.dayA),
    assertDayKey(data.dayB),
  );
  revalidatePath("/today");
  revalidatePath("/planner");
}

export async function duplicateDayShiftForwardAction(data: {
  profileId: string;
  day: string;
}): Promise<void> {
  const session = await requireAuth();
  await duplicateDayShiftForward(
    session.user.id,
    data.profileId,
    assertDayKey(data.day),
  );
  revalidatePath("/today");
  revalidatePath("/planner");
}

export async function fillPlannerAction(data: {
  profileId: string;
  days: string[];
  filters: RandomizerFilters;
  mealTypeIds: string[];
  skipExistingDays: boolean;
}): Promise<{ daysFilledCount: number; mealsAddedCount: number }> {
  const session = await requireAuth();
  const userId = session.user.id;
  const days = [...new Set(data.days.map(assertDayKey))].sort();
  if (days.length > 62) {
    throw new UserError("Można zaplanować maksymalnie 62 dni naraz");
  }
  await Promise.all([
    assertOwned("profiles", userId, [data.profileId]),
    assertOwned("mealTypes", userId, data.mealTypeIds),
  ]);

  const result = await fillPlanner(userId, { ...data, days });
  revalidatePath("/planner");
  return result;
}
