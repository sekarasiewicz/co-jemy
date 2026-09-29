// Filters of the /meals list, kept in the URL so a filtered page can be
// reloaded, shared and paginated on the server.

export const MEAL_LIST_PAGE_SIZE = 24;

export const MEAL_FLAGS = {
  vegetarian: { column: "isVegetarian", label: "Wegetariańskie" },
  vegan: { column: "isVegan", label: "Wegańskie" },
  glutenFree: { column: "isGlutenFree", label: "Bezglutenowe" },
  lactoseFree: { column: "isLactoseFree", label: "Bez laktozy" },
  quick: { column: "isQuick", label: "Szybkie" },
  childFriendly: { column: "isChildFriendly", label: "Dla dzieci" },
} as const;

export type MealFlag = keyof typeof MEAL_FLAGS;

export interface MealListQuery {
  q: string;
  mealTypeIds: string[];
  tagIds: string[];
  flags: MealFlag[];
  page: number;
}

export type MealListParams = Record<string, string | string[] | undefined>;

function first(value: unknown): string {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" ? v : "";
}

function list(value: unknown): string[] {
  return [
    ...new Set(
      first(value)
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean),
    ),
  ].slice(0, 50);
}

function isMealFlag(value: string): value is MealFlag {
  return Object.hasOwn(MEAL_FLAGS, value);
}

export function parseMealListQuery(params: MealListParams): MealListQuery {
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    mealTypeIds: list(params.types),
    tagIds: list(params.tags),
    flags: list(params.flags).filter(isMealFlag),
    page: Number.isFinite(page) && page > 1 ? page : 1,
  };
}

// Query string for `query`, leaving out defaults ("" when nothing is set).
export function mealListSearch(query: MealListQuery): string {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.mealTypeIds.length)
    params.set("types", query.mealTypeIds.join(","));
  if (query.tagIds.length) params.set("tags", query.tagIds.join(","));
  if (query.flags.length) params.set("flags", query.flags.join(","));
  if (query.page > 1) params.set("page", String(query.page));
  const search = params.toString();
  return search ? `?${search}` : "";
}

export function hasMealListFilters(query: MealListQuery): boolean {
  return Boolean(
    query.q ||
      query.mealTypeIds.length ||
      query.tagIds.length ||
      query.flags.length,
  );
}
