import { getRandomItem } from "@/lib/utils";
import type { MealWithRelations, RandomizerFilters } from "@/types";

/** In-memory randomizer filter — load the catalog once, filter many times. */
export function filterMeals(
  allMeals: MealWithRelations[],
  filters: RandomizerFilters,
): MealWithRelations[] {
  return allMeals.filter((meal) => {
    if (
      filters.mealTypeId &&
      !meal.mealTypes.some((mt) => mt.id === filters.mealTypeId)
    ) {
      return false;
    }

    if (
      filters.maxPrepTime &&
      meal.prepTimeMinutes &&
      meal.prepTimeMinutes > filters.maxPrepTime
    ) {
      return false;
    }

    if (
      filters.maxCookTime &&
      meal.cookTimeMinutes &&
      meal.cookTimeMinutes > filters.maxCookTime
    ) {
      return false;
    }

    if (
      filters.maxCalories &&
      meal.calories &&
      meal.calories > filters.maxCalories
    ) {
      return false;
    }

    if (
      filters.minProtein &&
      meal.protein &&
      meal.protein < filters.minProtein
    ) {
      return false;
    }

    if (filters.isVegetarian && !meal.isVegetarian) return false;
    if (filters.isVegan && !meal.isVegan) return false;
    if (filters.isGlutenFree && !meal.isGlutenFree) return false;
    if (filters.isLactoseFree && !meal.isLactoseFree) return false;
    if (filters.isQuick && !meal.isQuick) return false;
    if (filters.isChildFriendly && !meal.isChildFriendly) return false;

    if (filters.tagIds && filters.tagIds.length > 0) {
      const mealTagIds = meal.tags.map((t) => t.id);
      if (!filters.tagIds.some((tagId) => mealTagIds.includes(tagId))) {
        return false;
      }
    }

    if (filters.excludeMealIds?.includes(meal.id)) {
      return false;
    }

    return true;
  });
}

/**
 * One random meal per meal type, never the same meal twice in a day. Types
 * with no matching meal get `null`.
 */
export function pickMealsForDay(
  catalog: MealWithRelations[],
  mealTypeIds: string[],
  filters: Omit<RandomizerFilters, "mealTypeId" | "excludeMealIds">,
): { mealTypeId: string; meal: MealWithRelations | null }[] {
  const excludeMealIds: string[] = [];
  return mealTypeIds.map((mealTypeId) => {
    const meal =
      getRandomItem(
        filterMeals(catalog, { ...filters, mealTypeId, excludeMealIds }),
      ) ?? null;
    if (meal) excludeMealIds.push(meal.id);
    return { mealTypeId, meal };
  });
}
