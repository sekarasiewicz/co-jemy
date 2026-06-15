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

// Units where convertToGrams resolves grams via weightPerUnit (i.e. NOT the
// fixed-gram units g/kg/ml/l/łyżka/łyżeczka/szklanka/szczypta/garść).
const WEIGHT_PER_UNIT_UNITS = new Set([
  "szt",
  "opakowanie",
  "pęczek",
  "ząbek",
  "plaster",
  "kromka",
  "kostka",
  "listek",
  "gałązka",
  "łodyga",
  "puszka",
  "słoik",
  "woreczek",
  "porcja",
]);

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
  const neededByName = new Map<
    string,
    { name: string; unit: string; amount: number; grams: number }
  >();
  for (const meal of diet.meals) {
    for (const ing of meal.ingredients) {
      const key = ing.name.toLowerCase();
      if (ingredientByName.has(key)) continue;
      const existing = neededByName.get(key);
      // Capture first occurrence, but prefer one that carries a "(Ng)" gram
      // hint so weightPerUnit can be derived even if another meal omits it.
      if (!existing || (existing.grams <= 0 && ing.grams > 0)) {
        neededByName.set(key, {
          name: ing.name,
          unit: ing.unit,
          amount: ing.amount,
          grams: ing.grams,
        });
      }
    }
  }

  let ingredientsCreated = 0;
  if (neededByName.size > 0) {
    // Single enrich call for macros + category. weightPerUnit comes from the
    // PDF gram hints (authoritative), so no per-unit forced enrich is needed.
    const enrichedByName = new Map<
      string,
      Awaited<ReturnType<typeof enrichIngredients>>[number]
    >();
    try {
      const enriched = await enrichIngredients(
        [...neededByName.values()].map((n) => n.name),
      );
      for (const e of enriched) {
        enrichedByName.set(e.name.toLowerCase(), e);
      }
    } catch {
      errors.push("Nie udało się wzbogacić składników — utworzono bez makr");
    }

    // Create all missing ingredients concurrently.
    const created = await Promise.all(
      [...neededByName.values()].map(({ name, unit, amount, grams }) => {
        const e = enrichedByName.get(name.toLowerCase());
        // Prefer the exact per-unit weight from the PDF ("(75g)") over the AI
        // estimate, for piece-like units where convertToGrams uses weightPerUnit.
        const pdfWeightPerUnit =
          grams > 0 && amount > 0 && WEIGHT_PER_UNIT_UNITS.has(unit)
            ? round(grams / amount)
            : null;
        return createIngredient(userId, {
          name,
          category: e?.category ?? "Inne",
          // defaultUnit must match the recipe unit so convertToGrams applies
          // weightPerUnit (it only does when unit === defaultUnit).
          defaultUnit: pdfWeightPerUnit ? unit : (e?.defaultUnit ?? unit),
          caloriesPer100g: e?.caloriesPer100g ?? null,
          proteinPer100g: e?.proteinPer100g ?? null,
          carbsPer100g: e?.carbsPer100g ?? null,
          fatPer100g: e?.fatPer100g ?? null,
          weightPerUnit: pdfWeightPerUnit ?? e?.weightPerUnit ?? null,
        });
      }),
    );
    for (const ing of created) {
      ingredientByName.set(ing.name.toLowerCase(), ing);
    }
    ingredientsCreated = created.length;
    ingredients = [...ingredients];
  }

  // 2. Create meals (dedup by name), computing macros from ingredient gramature.
  const mealIdByName = new Map<string, string>();
  const uniqueMeals = new Map<string, (typeof diet.meals)[number]>();
  for (const meal of diet.meals) {
    const key = meal.name.toLowerCase();
    if (!uniqueMeals.has(key)) uniqueMeals.set(key, meal);
  }

  const createdMeals = await Promise.all(
    [...uniqueMeals.entries()].map(async ([key, meal]) => {
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

      try {
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
        return { key, id: created.id };
      } catch {
        errors.push(`Nie udało się utworzyć dania: ${meal.name}`);
        return null;
      }
    }),
  );

  for (const m of createdMeals) {
    if (m) mealIdByName.set(m.key, m.id);
  }
  const mealsCreated = mealIdByName.size;

  // 3. Build the weekly plan for the chosen profile (days run concurrently;
  //    each day has a distinct date so getOrCreateDailyPlan can't collide).
  const startDate = new Date(startDateIso);
  const plannedResults = await Promise.all(
    diet.plan.map(async (day) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + day.dayIndex);
      try {
        const plan = await getOrCreateDailyPlan(userId, profileId, date);
        await Promise.all(
          day.meals.map((item) => {
            const mealId = mealIdByName.get(item.mealName.toLowerCase());
            const mealType = mealTypes.find(
              (mt) => mt.name.toLowerCase() === item.mealTypeName.toLowerCase(),
            );
            if (!mealId || !mealType) return Promise.resolve();
            return addMealToPlan(plan.id, mealId, mealType.id, 1);
          }),
        );
        return true;
      } catch {
        errors.push(`Nie udało się zaplanować dnia ${day.dayIndex + 1}`);
        return false;
      }
    }),
  );
  const plannedDays = plannedResults.filter(Boolean).length;

  revalidatePath("/meals");
  revalidatePath("/planner");
  revalidatePath("/today");

  return {
    mealsCreated,
    ingredientsCreated,
    daysPlanned: plannedDays,
    errors,
  };
}
