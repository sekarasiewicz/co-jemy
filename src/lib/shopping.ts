export interface PlannedPortion<I extends { id: string }> {
  /** Portions eaten (dailyPlanMeals.servings). */
  portions: number;
  meal: {
    /** Portions the recipe yields. */
    servings: number;
    mealIngredients: { amount: number; unit: string; ingredient: I }[];
  };
}

export interface ShoppingTotal<I> {
  ingredient: I;
  amount: number;
  unit: string;
}

/**
 * Sums ingredient amounts over planned portions. Recipe amounts cover the
 * whole recipe, so each is scaled by portions / recipe servings. Amounts are
 * merged per ingredient and unit (different units aren't converted).
 */
export function aggregateShoppingTotals<I extends { id: string }>(
  planned: PlannedPortion<I>[],
): ShoppingTotal<I>[] {
  const totals = new Map<string, ShoppingTotal<I>>();

  for (const { portions, meal } of planned) {
    const factor = portions / Math.max(1, meal.servings);
    for (const line of meal.mealIngredients) {
      const key = `${line.ingredient.id}-${line.unit}`;
      const amount = line.amount * factor;
      const existing = totals.get(key);
      if (existing) {
        existing.amount += amount;
      } else {
        totals.set(key, {
          ingredient: line.ingredient,
          amount,
          unit: line.unit,
        });
      }
    }
  }

  return [...totals.values()];
}
