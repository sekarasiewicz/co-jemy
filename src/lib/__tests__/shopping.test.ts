import { describe, expect, it } from "vitest";
import { aggregateShoppingTotals } from "@/lib/shopping";

const flour = { id: "flour" };
const milk = { id: "milk" };

const pancakes = {
  servings: 4,
  mealIngredients: [
    { amount: 200, unit: "g", ingredient: flour },
    { amount: 400, unit: "ml", ingredient: milk },
  ],
};

describe("aggregateShoppingTotals", () => {
  it("buys one recipe when four profiles each eat one of its four portions", () => {
    const planned = Array.from({ length: 4 }, () => ({
      portions: 1,
      meal: pancakes,
    }));
    expect(aggregateShoppingTotals(planned)).toEqual([
      { ingredient: flour, amount: 200, unit: "g" },
      { ingredient: milk, amount: 400, unit: "ml" },
    ]);
  });

  it("scales a single profile's portions", () => {
    const totals = aggregateShoppingTotals([{ portions: 2, meal: pancakes }]);
    expect(totals.map((t) => t.amount)).toEqual([100, 200]);
  });

  it("keeps different units of one ingredient apart", () => {
    const totals = aggregateShoppingTotals([
      {
        portions: 1,
        meal: {
          servings: 1,
          mealIngredients: [{ amount: 1, unit: "szklanka", ingredient: milk }],
        },
      },
      {
        portions: 1,
        meal: {
          servings: 1,
          mealIngredients: [{ amount: 100, unit: "ml", ingredient: milk }],
        },
      },
    ]);
    expect(totals).toHaveLength(2);
  });
});
