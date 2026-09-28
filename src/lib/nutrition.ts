import { convertToGrams, round1 } from "@/lib/utils";

/**
 * Serving model used across the app:
 * - `meal.servings`: how many portions the recipe yields.
 * - `meal.calories/protein/carbs/fat`: values for ONE portion.
 * - `mealIngredients[].amount`: quantities for the WHOLE recipe.
 * - `dailyPlanMeals.servings`: portions this profile eats (default 1).
 */

export interface Nutrition {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export const ZERO_NUTRITION: Nutrition = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
};

interface NutritionIngredient {
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  weightPerUnit: number | null;
  defaultUnit: string;
}

export interface IngredientLine {
  amount: number;
  unit: string;
  ingredient: NutritionIngredient;
}

interface MealNutritionSource {
  servings: number;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export function addNutrition(a: Nutrition, b: Nutrition): Nutrition {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
  };
}

export function scaleNutrition(n: Nutrition, factor: number): Nutrition {
  return {
    calories: n.calories * factor,
    protein: n.protein * factor,
    carbs: n.carbs * factor,
    fat: n.fat * factor,
  };
}

/** Kcal as an integer, macros to one decimal. */
export function roundNutrition(n: Nutrition): Nutrition {
  return {
    calories: Math.round(n.calories),
    protein: round1(n.protein),
    carbs: round1(n.carbs),
    fat: round1(n.fat),
  };
}

export function lineGrams(line: IngredientLine): number {
  return convertToGrams(
    line.amount,
    line.unit,
    line.ingredient.weightPerUnit,
    line.ingredient.defaultUnit,
  );
}

/** Nutrition of one ingredient line (its amount as written). */
export function lineNutrition(line: IngredientLine): Nutrition {
  const factor = lineGrams(line) / 100;
  const i = line.ingredient;
  return {
    calories: (i.caloriesPer100g ?? 0) * factor,
    protein: (i.proteinPer100g ?? 0) * factor,
    carbs: (i.carbsPer100g ?? 0) * factor,
    fat: (i.fatPer100g ?? 0) * factor,
  };
}

/** Nutrition of the whole recipe (all portions). */
export function recipeNutrition(lines: IngredientLine[]): Nutrition {
  return lines.map(lineNutrition).reduce(addNutrition, ZERO_NUTRITION);
}

function hasMealLevelValues(meal: MealNutritionSource): boolean {
  return (
    meal.calories != null ||
    meal.protein != null ||
    meal.carbs != null ||
    meal.fat != null
  );
}

/**
 * Nutrition of one portion: the meal's own values when set, otherwise the
 * recipe total divided by its portion count. `null` when nothing is known.
 */
export function perServingNutrition(
  meal: MealNutritionSource,
  lines: IngredientLine[],
): Nutrition | null {
  if (hasMealLevelValues(meal)) {
    return {
      calories: meal.calories ?? 0,
      protein: meal.protein ?? 0,
      carbs: meal.carbs ?? 0,
      fat: meal.fat ?? 0,
    };
  }
  const total = recipeNutrition(lines);
  if (
    total.calories <= 0 &&
    total.protein <= 0 &&
    total.carbs <= 0 &&
    total.fat <= 0
  ) {
    return null;
  }
  return scaleNutrition(total, 1 / Math.max(1, meal.servings));
}

/** Nutrition of `portions` portions of a meal (e.g. one plan entry). */
export function portionsNutrition(
  meal: MealNutritionSource,
  lines: IngredientLine[],
  portions: number,
): Nutrition {
  const perServing = perServingNutrition(meal, lines) ?? ZERO_NUTRITION;
  return scaleNutrition(perServing, portions);
}
