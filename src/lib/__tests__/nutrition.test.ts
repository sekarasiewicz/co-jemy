import { describe, expect, it } from "vitest";
import {
  perServingNutrition,
  portionsNutrition,
  recipeNutrition,
  roundNutrition,
} from "@/lib/nutrition";

const oats = {
  caloriesPer100g: 380,
  proteinPer100g: 13,
  carbsPer100g: 60,
  fatPer100g: 7,
  weightPerUnit: null,
  defaultUnit: "g",
};
const egg = {
  caloriesPer100g: 140,
  proteinPer100g: 12,
  carbsPer100g: 1,
  fatPer100g: 10,
  weightPerUnit: 50,
  defaultUnit: "szt",
};

const lines = [
  { amount: 200, unit: "g", ingredient: oats },
  { amount: 2, unit: "szt", ingredient: egg },
];
const noMealValues = { calories: null, protein: null, carbs: null, fat: null };

describe("nutrition", () => {
  it("sums the whole recipe, converting piece units via weightPerUnit", () => {
    // 200 g oats + 100 g egg
    expect(roundNutrition(recipeNutrition(lines))).toEqual({
      calories: 900,
      protein: 38,
      carbs: 121,
      fat: 24,
    });
  });

  it("divides the recipe by its portions when the meal has no own values", () => {
    const meal = { servings: 4, ...noMealValues };
    expect(roundNutrition(perServingNutrition(meal, lines)!)).toEqual({
      calories: 225,
      protein: 9.5,
      carbs: 30.3,
      fat: 6,
    });
  });

  it("prefers the meal's own per-portion values", () => {
    const meal = {
      servings: 4,
      calories: 300,
      protein: 20,
      carbs: null,
      fat: 5,
    };
    expect(perServingNutrition(meal, lines)).toEqual({
      calories: 300,
      protein: 20,
      carbs: 0,
      fat: 5,
    });
  });

  it("returns null when nothing is known", () => {
    expect(
      perServingNutrition({ servings: 2, ...noMealValues }, []),
    ).toBeNull();
  });

  it("scales by portions eaten, not by the recipe's portion count", () => {
    const meal = { servings: 4, ...noMealValues };
    expect(portionsNutrition(meal, lines, 1).calories).toBeCloseTo(225);
    expect(portionsNutrition(meal, lines, 2).calories).toBeCloseTo(450);
  });
});
