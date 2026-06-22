import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Ingredient, ShoppingListItem } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}min`;
}

type NutritionTotal = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export function calculateTotalNutrition(
  meals: {
    calories?: number | null;
    protein?: number | null;
    carbs?: number | null;
    fat?: number | null;
    servings?: number;
  }[],
): NutritionTotal {
  return meals.reduce<NutritionTotal>(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories ?? 0) * (meal.servings ?? 1),
      protein: acc.protein + (meal.protein ?? 0) * (meal.servings ?? 1),
      carbs: acc.carbs + (meal.carbs ?? 0) * (meal.servings ?? 1),
      fat: acc.fat + (meal.fat ?? 0) * (meal.servings ?? 1),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Siedzący (brak ćwiczeń)", factor: 1.2 },
  { value: "light", label: "Lekko aktywny (1-3 dni/tydzień)", factor: 1.375 },
  { value: "moderate", label: "Umiarkowanie aktywny (3-5 dni/tydzień)", factor: 1.55 },
  { value: "active", label: "Bardzo aktywny (6-7 dni/tydzień)", factor: 1.725 },
  { value: "very_active", label: "Wyczynowo aktywny (2x dziennie)", factor: 1.9 },
] as const;

/**
 * Daily calorie goal (TDEE) via Mifflin-St Jeor BMR × activity factor.
 * Returns null when required inputs (height/weight/age/sex) are missing.
 */
export function calculateCalorieGoal(input: {
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  sex?: string | null;
  activityLevel?: string | null;
}): number | null {
  const { height, weight, age, sex, activityLevel } = input;
  if (!height || !weight || !age || !sex) return null;

  // Mifflin-St Jeor
  const base = 10 * weight + 6.25 * height - 5 * age;
  const bmr = sex === "female" ? base - 161 : base + 5;

  const factor =
    ACTIVITY_LEVELS.find((l) => l.value === activityLevel)?.factor ?? 1.55;

  return Math.round((bmr * factor) / 10) * 10; // round to nearest 10 kcal
}

/**
 * Daily calorie + macro goals derived from body metrics.
 * Protein 1.8 g/kg, fat 25% kcal, carbs remainder. Null if inputs missing.
 */
export function calculateNutritionGoals(input: {
  height?: number | null;
  weight?: number | null;
  age?: number | null;
  sex?: string | null;
  activityLevel?: string | null;
}): { calories: number; protein: number; carbs: number; fat: number } | null {
  const calories = calculateCalorieGoal(input);
  if (calories === null || !input.weight) return null;

  const protein = Math.round(1.8 * input.weight);
  const fat = Math.round((calories * 0.25) / 9);
  const carbsKcal = calories - protein * 4 - fat * 9;
  const carbs = Math.max(0, Math.round(carbsKcal / 4));

  return { calories, protein, carbs, fat };
}

type AggregatedIngredient = {
  ingredientId: string | null;
  customName: string | null;
  ingredient: Ingredient | null;
  totalAmount: number;
  unit: string;
  category: string;
};

export function aggregateIngredients(
  items: (ShoppingListItem & { ingredient: Ingredient | null })[],
): AggregatedIngredient[] {
  const aggregated = new Map<string, AggregatedIngredient>();

  for (const item of items) {
    const key = item.ingredientId ?? item.customName ?? "";
    const existing = aggregated.get(key);

    if (existing && existing.unit === item.unit) {
      existing.totalAmount += item.amount ?? 0;
    } else {
      aggregated.set(key, {
        ingredientId: item.ingredientId,
        customName: item.customName,
        ingredient: item.ingredient,
        totalAmount: item.amount ?? 0,
        unit: item.unit ?? "",
        category: item.category,
      });
    }
  }

  return Array.from(aggregated.values());
}

export function groupByCategory<T extends { category: string }>(
  items: T[],
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const existing = grouped.get(item.category);
    if (existing) {
      existing.push(item);
    } else {
      grouped.set(item.category, [item]);
    }
  }

  return grouped;
}

export function getRandomItem<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

export function getRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.16666667, "⅙"],
  [0.2, "⅕"],
  [0.25, "¼"],
  [0.33333334, "⅓"],
  [0.5, "½"],
  [0.66666667, "⅔"],
  [0.75, "¾"],
];

export function formatAmount(amount: number): string {
  if (amount === 0) return "0";

  const whole = Math.floor(amount);
  const frac = amount - whole;

  // No fractional part
  if (frac < 0.01) {
    return whole.toString();
  }

  // Find matching fraction
  for (const [value, symbol] of FRACTIONS) {
    if (Math.abs(frac - value) < 0.02) {
      return whole > 0 ? `${whole}${symbol}` : symbol;
    }
  }

  // Fallback: round to 2 decimal places, strip trailing zeros
  return parseFloat(amount.toFixed(2)).toString();
}

/**
 * Convert kitchen units to grams for nutrition calculation.
 * Pass weightPerUnit for ingredient-specific units (szt, puszka, etc.).
 */
export function convertToGrams(amount: number, unit: string, weightPerUnit?: number | null, defaultUnit?: string | null): number {
  switch (unit) {
    case "g":
      return amount;
    case "kg":
      return amount * 1000;
    case "ml":
      return amount;
    case "l":
      return amount * 1000;
    case "łyżka":
      return amount * 15;
    case "łyżeczka":
      return amount * 5;
    case "szklanka":
      return amount * 250;
    case "szczypta":
      return amount * 0.5;
    case "garść":
      return amount * 30;
    default:
      // szt, puszka, opakowanie, plaster, kromka, ząbek, etc.
      // Use weightPerUnit only when recipe unit matches ingredient's defaultUnit
      if (weightPerUnit && weightPerUnit > 0 && (!defaultUnit || unit === defaultUnit)) {
        return amount * weightPerUnit;
      }
      return 0;
  }
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "short",
  });
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Returns today's date at noon local time.
 * Setting to noon prevents timezone conversion issues when sending to server.
 */
export function getTodayNoon(): Date {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return today;
}

export function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday
  start.setHours(12, 0, 0, 0); // Noon to avoid timezone issues

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return days;
}
