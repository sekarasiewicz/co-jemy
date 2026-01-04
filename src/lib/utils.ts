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

export function getWeekDays(startDate: Date): Date[] {
  const days: Date[] = [];
  const start = new Date(startDate);
  start.setDate(start.getDate() - start.getDay() + 1); // Monday

  for (let i = 0; i < 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    days.push(day);
  }

  return days;
}
