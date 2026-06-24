"use server";

import {
  type ExtractedMeal,
  enrichIngredients,
  extractMealFromImage,
  extractMealFromText,
} from "@/lib/services/ai";
import {
  createIngredient,
  getIngredientsByUserId,
} from "@/lib/services/ingredients";
import { addMissingDefaultMealTypes } from "@/lib/services/meal-types";
import { convertToGrams } from "@/lib/utils";
import type { Ingredient } from "@/types";
import { requireAuth } from "./auth";

export interface MealDraft {
  name: string;
  description: string;
  instructions: string;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isQuick: boolean;
  isMealPrep: boolean;
  isChildFriendly: boolean;
  mealTypeIds: string[];
  ingredients: { ingredientId: string; amount: number; unit: string }[];
  // Ingredients created during extraction — merged into the form's option list.
  newIngredients: Ingredient[];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// Units where convertToGrams resolves grams via weightPerUnit (not fixed-gram).
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

async function buildMealDraft(
  userId: string,
  extracted: ExtractedMeal,
): Promise<MealDraft> {
  const mealTypes = await addMissingDefaultMealTypes(userId);
  const existing = await getIngredientsByUserId(userId);
  const ingredientByName = new Map<string, Ingredient>(
    existing.map((i) => [i.name.toLowerCase(), i]),
  );

  // 1. Find missing ingredients, enrich them for macros, create.
  const neededByName = new Map<
    string,
    { name: string; unit: string; amount: number; grams: number }
  >();
  for (const ing of extracted.ingredients) {
    const key = ing.name.toLowerCase();
    if (ingredientByName.has(key)) continue;
    const prev = neededByName.get(key);
    if (!prev || (prev.grams <= 0 && ing.grams > 0)) {
      neededByName.set(key, {
        name: ing.name,
        unit: ing.unit,
        amount: ing.amount,
        grams: ing.grams,
      });
    }
  }

  const newIngredients: Ingredient[] = [];
  if (neededByName.size > 0) {
    const enrichedByName = new Map<
      string,
      Awaited<ReturnType<typeof enrichIngredients>>[number]
    >();
    try {
      const enriched = await enrichIngredients(
        [...neededByName.values()].map((n) => n.name),
        undefined,
        userId,
      );
      for (const e of enriched) {
        enrichedByName.set(e.name.toLowerCase(), e);
      }
    } catch {
      // Fall back to creating ingredients without macros.
    }

    const created = await Promise.all(
      [...neededByName.values()].map(({ name, unit, amount, grams }) => {
        const e = enrichedByName.get(name.toLowerCase());
        const hintWeightPerUnit =
          grams > 0 && amount > 0 && WEIGHT_PER_UNIT_UNITS.has(unit)
            ? round(grams / amount)
            : null;
        return createIngredient(userId, {
          name,
          category: e?.category ?? "Inne",
          defaultUnit: hintWeightPerUnit ? unit : (e?.defaultUnit ?? unit),
          caloriesPer100g: e?.caloriesPer100g ?? null,
          proteinPer100g: e?.proteinPer100g ?? null,
          carbsPer100g: e?.carbsPer100g ?? null,
          fatPer100g: e?.fatPer100g ?? null,
          weightPerUnit: hintWeightPerUnit ?? e?.weightPerUnit ?? null,
        });
      }),
    );
    for (const ing of created) {
      ingredientByName.set(ing.name.toLowerCase(), ing);
      newIngredients.push(ing);
    }
  }

  // 2. Build ingredient entries + compute total macros.
  const ingredients: MealDraft["ingredients"] = [];
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const ing of extracted.ingredients) {
    const ingredient = ingredientByName.get(ing.name.toLowerCase());
    if (!ingredient) continue;
    ingredients.push({
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

  // Form stores nutrition per serving.
  const perServing = Math.max(1, extracted.servings);

  // 3. Resolve meal type names → ids.
  const mealTypeIds = extracted.mealTypeNames
    .map(
      (name) =>
        mealTypes.find((mt) => mt.name.toLowerCase() === name.toLowerCase())
          ?.id,
    )
    .filter((id): id is string => Boolean(id));

  return {
    name: extracted.name,
    description: extracted.description,
    instructions: extracted.instructions,
    servings: perServing,
    prepTimeMinutes: extracted.prepTimeMinutes,
    cookTimeMinutes: extracted.cookTimeMinutes,
    calories: Math.round(calories / perServing),
    protein: round(protein / perServing),
    carbs: round(carbs / perServing),
    fat: round(fat / perServing),
    isVegetarian: extracted.isVegetarian,
    isVegan: extracted.isVegan,
    isGlutenFree: extracted.isGlutenFree,
    isLactoseFree: extracted.isLactoseFree,
    isQuick: extracted.isQuick,
    isMealPrep: extracted.isMealPrep,
    isChildFriendly: extracted.isChildFriendly,
    mealTypeIds,
    ingredients,
    newIngredients,
  };
}

export async function createMealDraftFromTextAction(
  recipeText: string,
): Promise<MealDraft> {
  const session = await requireAuth();
  const text = recipeText.trim();
  if (!text) throw new Error("Pusty tekst przepisu");
  const extracted = await extractMealFromText(text, session.user.id);
  if (!extracted.name) throw new Error("AI nie rozpoznało dania z tekstu");
  return buildMealDraft(session.user.id, extracted);
}

export async function createMealDraftFromImageAction(input: {
  base64: string;
  mimeType: string;
}): Promise<MealDraft> {
  const session = await requireAuth();
  if (!input.base64) throw new Error("Brak zdjęcia");
  const extracted = await extractMealFromImage(
    input.base64,
    input.mimeType,
    session.user.id,
  );
  if (!extracted.name) throw new Error("AI nie rozpoznało dania ze zdjęcia");
  return buildMealDraft(session.user.id, extracted);
}
