"use client";

import { Check, Clock, Flame, Trash2, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { portionsNutrition } from "@/lib/nutrition";
import { cn, formatAmount, formatMinutes } from "@/lib/utils";
import type { DailyPlanWithMeals } from "@/types";

export type PlanMeal = DailyPlanWithMeals["meals"][number];

interface PlanMealItemProps {
  planMeal: PlanMeal;
  onToggleCompleted: () => void;
  onRemove: () => void;
}

export function PlanMealItem({
  planMeal: pm,
  onToggleCompleted,
  onRemove,
}: PlanMealItemProps) {
  const totalTime =
    (pm.meal.prepTimeMinutes || 0) + (pm.meal.cookTimeMinutes || 0);
  const n = portionsNutrition(
    pm.meal,
    pm.meal.mealIngredients,
    pm.servings || 1,
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 p-3 rounded-xl border transition-colors",
        pm.completed ? "bg-fit/10 border-fit/30" : "bg-card border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggleCompleted}
        aria-pressed={pm.completed}
        aria-label={`Zjedzone: ${pm.meal.name}`}
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
          pm.completed
            ? "bg-fit border-fit text-white"
            : "border-muted-foreground hover:border-fit",
        )}
      >
        {pm.completed && <Check className="w-4 h-4" />}
      </button>

      {pm.meal.imageUrl && (
        <Link href={`/meals/${pm.meal.id}`} className="flex-shrink-0">
          <Image
            src={pm.meal.imageUrl}
            alt={pm.meal.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-lg border border-border object-cover"
          />
        </Link>
      )}

      <Link href={`/meals/${pm.meal.id}`} className="flex-1 min-w-0">
        <p
          className={cn(
            "font-medium leading-snug break-words",
            pm.completed
              ? "text-lime-700 dark:text-lime-400 line-through"
              : "text-foreground",
          )}
        >
          {pm.meal.name}
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          {n.calories > 0 && (
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3" />
              {Math.round(n.calories)} kcal
              {(n.protein > 0 || n.carbs > 0 || n.fat > 0) && (
                <span className="ml-1">
                  ·{n.protein > 0 ? ` B: ${Math.round(n.protein)}g` : ""}
                  {n.carbs > 0 ? ` W: ${Math.round(n.carbs)}g` : ""}
                  {n.fat > 0 ? ` T: ${Math.round(n.fat)}g` : ""}
                </span>
              )}
            </span>
          )}
          {totalTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatMinutes(totalTime)}
            </span>
          )}
          {pm.servings && pm.servings > 1 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {pm.servings} porcji
            </span>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Usuń z planu: ${pm.meal.name}`}
        className="text-muted-foreground hover:text-destructive transition-colors self-start mt-0.5"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {pm.meal.mealIngredients.length > 0 && (
        <div className="w-full border-t border-border/50 pt-2">
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {pm.meal.mealIngredients.map((mi) => (
              <li key={mi.id}>
                {formatAmount(mi.amount)} {mi.unit} {mi.ingredient.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
