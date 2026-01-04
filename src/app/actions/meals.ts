"use server";

import { revalidatePath } from "next/cache";
import { createIngredient, getIngredientsByUserId } from "@/lib/services/ingredients";
import { parseMarkdownMeals } from "@/lib/markdown-parser";
import { getMealTypesByUserId } from "@/lib/services/meal-types";
import {
  createMeal,
  deleteMeal,
  getFilteredMeals,
  getMealById,
  getMealsByUserId,
  randomizeSingleMeal,
  updateMeal,
} from "@/lib/services/meals";
import { createTag, getTagsByUserId } from "@/lib/services/tags";
import type { Ingredient, Meal, MealType, MealWithRelations, RandomizerFilters, Tag } from "@/types";
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

export interface ImportResult {
  imported: number;
  errors: string[];
}

export async function importMealsFromMarkdownAction(
  markdown: string,
): Promise<ImportResult> {
  const session = await requireAuth();
  const userId = session.user.id;

  const parsedMeals = parseMarkdownMeals(markdown);
  if (parsedMeals.length === 0) {
    return { imported: 0, errors: ["Nie znaleziono przepisów w podanym tekście"] };
  }

  // Cache existing data
  let ingredients = await getIngredientsByUserId(userId);
  const mealTypes = await getMealTypesByUserId(userId);
  let tags = await getTagsByUserId(userId);

  const errors: string[] = [];
  let imported = 0;

  for (const parsed of parsedMeals) {
    try {
      // Find/create ingredients
      const ingredientsList: { ingredientId: string; amount: number; unit: string }[] = [];
      for (const pi of parsed.ingredients) {
        const nameLower = pi.name.toLowerCase();
        let ingredient = ingredients.find(
          (i) => i.name.toLowerCase() === nameLower
        );

        if (!ingredient) {
          // Create new ingredient
          ingredient = await createIngredient(userId, {
            name: pi.name,
            category: "Inne",
            defaultUnit: pi.unit,
          });
          ingredients = [...ingredients, ingredient];
        }

        ingredientsList.push({
          ingredientId: ingredient.id,
          amount: pi.amount,
          unit: pi.unit,
        });
      }

      // Match meal types by name (case-insensitive)
      const mealTypeIds: string[] = [];
      for (const typeName of parsed.mealTypeNames) {
        const typeNameLower = typeName.toLowerCase();
        const mealType = mealTypes.find(
          (mt) => mt.name.toLowerCase() === typeNameLower
        );
        if (mealType) {
          mealTypeIds.push(mealType.id);
        }
      }

      // Find/create tags
      const tagIds: string[] = [];
      for (const tagName of parsed.tagNames) {
        const tagNameLower = tagName.toLowerCase();
        let tag = tags.find((t) => t.name.toLowerCase() === tagNameLower);

        if (!tag) {
          // Create new tag with random color
          const colors = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          tag = await createTag(userId, { name: tagName, color: randomColor });
          tags = [...tags, tag];
        }

        tagIds.push(tag.id);
      }

      // Create meal
      await createMeal(userId, {
        name: parsed.name,
        description: parsed.description,
        instructions: parsed.instructions,
        servings: parsed.servings,
        prepTimeMinutes: parsed.prepTimeMinutes,
        cookTimeMinutes: parsed.cookTimeMinutes,
        isVegetarian: parsed.isVegetarian,
        isVegan: parsed.isVegan,
        isGlutenFree: parsed.isGlutenFree,
        isLactoseFree: parsed.isLactoseFree,
        isQuick: parsed.isQuick,
        isMealPrep: parsed.isMealPrep,
        isChildFriendly: parsed.isChildFriendly,
        mealTypeIds,
        tagIds,
        ingredientsList,
      });

      imported++;
    } catch (error) {
      errors.push(`Błąd przy imporcie "${parsed.name}": ${error instanceof Error ? error.message : "Nieznany błąd"}`);
    }
  }

  revalidatePath("/meals");
  return { imported, errors };
}
