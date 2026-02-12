import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import type {
  dailyPlanMeals,
  dailyPlans,
  ingredients,
  mealIngredients,
  meals,
  mealTypes,
  profiles,
  shoppingListItems,
  shoppingLists,
  tags,
  users,
} from "@/db/schema";

// Base types
export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Profile = InferSelectModel<typeof profiles>;
export type NewProfile = InferInsertModel<typeof profiles>;

export type Ingredient = InferSelectModel<typeof ingredients>;
export type NewIngredient = InferInsertModel<typeof ingredients>;

export type Meal = InferSelectModel<typeof meals>;
export type NewMeal = InferInsertModel<typeof meals>;

export type Tag = InferSelectModel<typeof tags>;
export type NewTag = InferInsertModel<typeof tags>;

export type MealType = InferSelectModel<typeof mealTypes>;
export type NewMealType = InferInsertModel<typeof mealTypes>;

export type MealIngredient = InferSelectModel<typeof mealIngredients>;
export type NewMealIngredient = InferInsertModel<typeof mealIngredients>;

export type DailyPlan = InferSelectModel<typeof dailyPlans>;
export type NewDailyPlan = InferInsertModel<typeof dailyPlans>;

export type DailyPlanMeal = InferSelectModel<typeof dailyPlanMeals>;
export type NewDailyPlanMeal = InferInsertModel<typeof dailyPlanMeals>;

export type ShoppingList = InferSelectModel<typeof shoppingLists>;
export type NewShoppingList = InferInsertModel<typeof shoppingLists>;

export type ShoppingListItem = InferSelectModel<typeof shoppingListItems>;
export type NewShoppingListItem = InferInsertModel<typeof shoppingListItems>;

// Extended types with relations
export type MealWithRelations = Meal & {
  tags: Tag[];
  mealTypes: MealType[];
  ingredients: (MealIngredient & { ingredient: Ingredient })[];
};

export type DailyPlanWithMeals = DailyPlan & {
  profile: Profile;
  meals: (DailyPlanMeal & {
    meal: Meal;
    mealType: MealType;
  })[];
};

export type ShoppingListWithItems = ShoppingList & {
  items: (ShoppingListItem & { ingredient: Ingredient | null })[];
};

// Randomizer filters
export type RandomizerFilters = {
  mealTypeId?: string;
  maxPrepTime?: number;
  maxCookTime?: number;
  maxCalories?: number;
  minProtein?: number;
  isVegetarian?: boolean;
  isVegan?: boolean;
  isGlutenFree?: boolean;
  isLactoseFree?: boolean;
  isQuick?: boolean;
  isChildFriendly?: boolean;
  tagIds?: string[];
  excludeMealIds?: string[];
};

// Constants
export const INGREDIENT_CATEGORIES = [
  "Warzywa",
  "Owoce",
  "Mięso",
  "Ryby",
  "Nabiał",
  "Pieczywo",
  "Makarony i kasze",
  "Przyprawy",
  "Oleje i tłuszcze",
  "Konserwy",
  "Mrożonki",
  "Napoje",
  "Słodycze",
  "Inne",
] as const;

export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];

export const UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "szt",
  "łyżka",
  "łyżeczka",
  "szklanka",
  "opakowanie",
  "pęczek",
  "ząbek",
  "plaster",
  "kromka",
  "kostka",
  "garść",
  "szczypta",
  "listek",
  "gałązka",
  "łodyga",
  "puszka",
  "słoik",
  "woreczek",
  "porcja",
] as const;

export type Unit = (typeof UNITS)[number];

export const PROFILE_COLORS = [
  "#10b981", // emerald-500
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
] as const;

export type ProfileColor = (typeof PROFILE_COLORS)[number];
