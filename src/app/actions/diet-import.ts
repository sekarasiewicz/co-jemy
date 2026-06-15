"use server";

import { revalidatePath } from "next/cache";
import { addMealToPlan, getOrCreateDailyPlan } from "@/lib/services/daily-plans";
import {
  createIngredient,
  getIngredientsByUserId,
} from "@/lib/services/ingredients";
import { addMissingDefaultMealTypes } from "@/lib/services/meal-types";
import { createMeal } from "@/lib/services/meals";
import { enrichIngredients, extractDietFromPdf } from "@/lib/services/ai";
import { convertToGrams } from "@/lib/utils";
import type { Ingredient } from "@/types";
import { requireAuth } from "./auth";

export interface DietImportResult {
  mealsCreated: number;
  ingredientsCreated: number;
  daysPlanned: number;
  errors: string[];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function importDietFromPdfAction(
  base64Pdf: string,
  profileId: string,
  startDateIso: string,
): Promise<DietImportResult> {
  const session = await requireAuth();
  const userId = session.user.id;
  const errors: string[] = [];

  const diet = await extractDietFromPdf(base64Pdf);
  if (diet.meals.length === 0) {
    return {
      mealsCreated: 0,
      ingredientsCreated: 0,
      daysPlanned: 0,
      errors: ["AI nie znalazło dań w pliku PDF"],
    };
  }

  const mealTypes = await addMissingDefaultMealTypes(userId);
  let ingredients = await getIngredientsByUserId(userId);
  const ingredientByName = new Map<string, Ingredient>(
    ingredients.map((i) => [i.name.toLowerCase(), i]),
  );

  // 1. Enrich + create missing ingredients. Enrich forcing the unit the
  //    recipe uses (grouped per unit), so the ingredient's defaultUnit matches
  //    the recipe unit and weightPerUnit is correct for macro conversion.
  const neededByName = new Map<string, { name: string; unit: string }>();
  for (const meal of diet.meals) {
    for (const ing of meal.ingredients) {
      const key = ing.name.toLowerCase();
      if (!ingredientByName.has(key) && !neededByName.has(key)) {
        neededByName.set(key, { name: ing.name, unit: ing.unit });
      }
    }
  }

  let ingredientsCreated = 0;
  if (neededByName.size > 0) {
    // Group needed names by their recipe unit for batched, unit-forced enrich.
    const byUnit = new Map<string, string[]>();
    for (const { name, unit } of neededByName.values()) {
      const list = byUnit.get(unit) ?? [];
      list.push(name);
      byUnit.set(unit, list);
    }

    const enrichedByName = new Map<
      string,
      Awaited<ReturnType<typeof enrichIngredients>>[number]
    >();
    for (const [unit, names] of byUnit) {
      try {
        const enriched = await enrichIngredients(names, unit);
        for (const e of enriched) {
          enrichedByName.set(e.name.toLowerCase(), e);
        }
      } catch {
        errors.push(
          `Nie udało się wzbogacić składników (${unit}) — utworzono bez makr`,
        );
      }
    }

    for (const { name, unit } of neededByName.values()) {
      const e = enrichedByName.get(name.toLowerCase());
      const created = await createIngredient(userId, {
        name,
        category: e?.category ?? "Inne",
        defaultUnit: e?.defaultUnit ?? unit,
        caloriesPer100g: e?.caloriesPer100g ?? null,
        proteinPer100g: e?.proteinPer100g ?? null,
        carbsPer100g: e?.carbsPer100g ?? null,
        fatPer100g: e?.fatPer100g ?? null,
        weightPerUnit: e?.weightPerUnit ?? null,
      });
      ingredientByName.set(name.toLowerCase(), created);
      ingredientsCreated++;
    }
    ingredients = [...ingredients];
  }

  // 2. Create meals (dedup by name), computing macros from ingredient gramature.
  const mealIdByName = new Map<string, string>();
  let mealsCreated = 0;

  for (const meal of diet.meals) {
    const key = meal.name.toLowerCase();
    if (mealIdByName.has(key)) continue;

    try {
      const mealType = mealTypes.find(
        (mt) => mt.name.toLowerCase() === meal.mealTypeName.toLowerCase(),
      );

      let calories = 0;
      let protein = 0;
      let carbs = 0;
      let fat = 0;
      const ingredientsList: {
        ingredientId: string;
        amount: number;
        unit: string;
      }[] = [];

      for (const ing of meal.ingredients) {
        const ingredient = ingredientByName.get(ing.name.toLowerCase());
        if (!ingredient) continue;
        ingredientsList.push({
          ingredientId: ingredient.id,
          amount: ing.amount,
          unit: ing.unit,
        });
        const grams = convertToGrams(
          ing.amount,
          ing.unit,
          ingredient.weightPerUnit,
          ingredient.defaultUnit,
        );
        const factor = grams / 100;
        calories += (ingredient.caloriesPer100g ?? 0) * factor;
        protein += (ingredient.proteinPer100g ?? 0) * factor;
        carbs += (ingredient.carbsPer100g ?? 0) * factor;
        fat += (ingredient.fatPer100g ?? 0) * factor;
      }

      const created = await createMeal(userId, {
        name: meal.name,
        instructions: meal.instructions || null,
        servings: 1,
        calories: Math.round(calories),
        protein: round(protein),
        carbs: round(carbs),
        fat: round(fat),
        mealTypeIds: mealType ? [mealType.id] : [],
        ingredientsList,
      });
      mealIdByName.set(key, created.id);
      mealsCreated++;
    } catch {
      errors.push(`Nie udało się utworzyć dania: ${meal.name}`);
    }
  }

  // 3. Build the weekly plan for the chosen profile.
  const startDate = new Date(startDateIso);
  const plannedDays = new Set<number>();

  for (const day of diet.plan) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + day.dayIndex);

    try {
      const plan = await getOrCreateDailyPlan(userId, profileId, date);
      for (const item of day.meals) {
        const mealId = mealIdByName.get(item.mealName.toLowerCase());
        const mealType = mealTypes.find(
          (mt) => mt.name.toLowerCase() === item.mealTypeName.toLowerCase(),
        );
        if (!mealId || !mealType) continue;
        await addMealToPlan(plan.id, mealId, mealType.id, 1);
      }
      plannedDays.add(day.dayIndex);
    } catch {
      errors.push(`Nie udało się zaplanować dnia ${day.dayIndex + 1}`);
    }
  }

  revalidatePath("/meals");
  revalidatePath("/planner");
  revalidatePath("/today");

  return {
    mealsCreated,
    ingredientsCreated,
    daysPlanned: plannedDays.size,
    errors,
  };
}
