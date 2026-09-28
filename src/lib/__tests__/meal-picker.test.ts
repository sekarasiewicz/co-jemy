import { describe, expect, it } from "vitest";
import { filterMeals, pickMealsForDay } from "@/lib/meal-picker";
import type { MealWithRelations } from "@/types";

function meal(
  id: string,
  mealTypeIds: string[],
  extra: Partial<MealWithRelations> = {},
): MealWithRelations {
  return {
    id,
    mealTypes: mealTypeIds.map((mtId) => ({ id: mtId })),
    tags: [],
    ingredients: [],
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    calories: null,
    protein: null,
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    isQuick: false,
    isChildFriendly: false,
    ...extra,
  } as unknown as MealWithRelations;
}

const catalog = [
  meal("oats", ["breakfast"], { isVegetarian: true }),
  meal("eggs", ["breakfast", "dinner"]),
  meal("soup", ["lunch"], { isVegetarian: true, calories: 700 }),
];

describe("filterMeals", () => {
  it("filters by meal type, flags and calories", () => {
    expect(
      filterMeals(catalog, { mealTypeId: "breakfast" }).map((m) => m.id),
    ).toEqual(["oats", "eggs"]);
    expect(
      filterMeals(catalog, { isVegetarian: true }).map((m) => m.id),
    ).toEqual(["oats", "soup"]);
    expect(filterMeals(catalog, { maxCalories: 500 }).map((m) => m.id)).toEqual(
      ["oats", "eggs"],
    );
  });
});

describe("pickMealsForDay", () => {
  it("never repeats a meal within a day", () => {
    for (let i = 0; i < 20; i++) {
      const picks = pickMealsForDay(catalog, ["breakfast", "dinner"], {});
      const ids = picks.map((p) => p.meal?.id).filter(Boolean);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("returns null for a type with nothing left to pick", () => {
    const picks = pickMealsForDay([catalog[1]], ["breakfast", "dinner"], {});
    expect(picks.map((p) => p.meal?.id ?? null)).toEqual(["eggs", null]);
  });
});
