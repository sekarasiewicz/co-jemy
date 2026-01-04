"use server";

import { revalidatePath } from "next/cache";
import {
  createMeal,
  deleteMeal,
  getFilteredMeals,
  getMealById,
  getMealsByUserId,
  randomizeSingleMeal,
  updateMeal,
} from "@/lib/services/meals";
import type { Meal, MealWithRelations, RandomizerFilters } from "@/types";
import { requireAuth } from "./auth";

export async function getMealsAction(): Promise<MealWithRelations[]> {
  const session = await requireAuth();
  return getMealsByUserId(session.user.id);
}

export async function getMealAction(
  mealId: string,
): Promise<MealWithRelations | undefined> {
  const session = await requireAuth();
  return getMealById(mealId, session.user.id);
}

export async function createMealAction(data: {
  name: string;
  description?: string;
  instructions?: string;
  imageUrl?: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isLactoseFree?: boolean;
  isQuick?: boolean;
  isMealPrep?: boolean;
  isChildFriendly?: boolean;
  tagIds?: string[];
  mealTypeIds?: string[];
  ingredientsList?: { ingredientId: string; amount: number; unit: string }[];
}): Promise<Meal> {
  const session = await requireAuth();
  const meal = await createMeal(session.user.id, data);
  revalidatePath("/meals");
  return meal;
}

export async function updateMealAction(
  mealId: string,
  data: {
    name?: string;
    description?: string;
    instructions?: string;
    imageUrl?: string;
    servings?: number;
    prepTimeMinutes?: number;
    cookTimeMinutes?: number;
    calories?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    isVegetarian?: boolean;
    isVegan?: boolean;
    isGlutenFree?: boolean;
    isLactoseFree?: boolean;
    isQuick?: boolean;
    isMealPrep?: boolean;
    isChildFriendly?: boolean;
    tagIds?: string[];
    mealTypeIds?: string[];
    ingredientsList?: { ingredientId: string; amount: number; unit: string }[];
  },
): Promise<Meal> {
  const session = await requireAuth();
  const meal = await updateMeal(mealId, session.user.id, data);
  revalidatePath("/meals");
  revalidatePath(`/meals/${mealId}`);
  return meal;
}

export async function deleteMealAction(mealId: string): Promise<void> {
  const session = await requireAuth();
  await deleteMeal(mealId, session.user.id);
  revalidatePath("/meals");
}

export async function randomizeMealAction(
  filters: RandomizerFilters,
): Promise<MealWithRelations | null> {
  const session = await requireAuth();
  const meal = await randomizeSingleMeal(session.user.id, filters);
  return meal ?? null;
}

export async function getFilteredMealsAction(
  filters: RandomizerFilters,
): Promise<MealWithRelations[]> {
  const session = await requireAuth();
  return getFilteredMeals(session.user.id, filters);
}
