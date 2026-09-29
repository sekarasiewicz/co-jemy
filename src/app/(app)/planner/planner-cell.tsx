"use client";

import { Check, Loader2, Plus, Shuffle, X } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { portionsNutrition } from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { DailyPlanWithMeals } from "@/types";

type PlanMeal = DailyPlanWithMeals["meals"][number];

interface PlannerCellProps {
  planMeals: PlanMeal[];
  isToday: boolean;
  randomizing: boolean;
  onToggleCompleted: (planMeal: PlanMeal) => void;
  onRemove: (planMeal: PlanMeal) => void;
  onAdd: () => void;
  onRandomize: () => void;
}

// One day × meal type cell of the week grid.
export function PlannerCell({
  planMeals,
  isToday,
  randomizing,
  onToggleCompleted,
  onRemove,
  onAdd,
  onRandomize,
}: PlannerCellProps) {
  return (
    <div
      className={cn(
        "min-h-[80px] rounded-xl p-2 transition-colors",
        isToday ? "bg-orange-500/5 ring-1 ring-orange-500/20" : "bg-muted/30",
      )}
    >
      <div className="space-y-1.5">
        {planMeals.map((pm) => {
          const calories = portionsNutrition(
            pm.meal,
            pm.meal.mealIngredients,
            pm.servings || 1,
          ).calories;
          return (
            // biome-ignore lint/a11y/useSemanticElements: the card contains its own remove button, and buttons can't nest
            <div
              key={pm.id}
              className={cn(
                "group relative rounded-lg p-2 cursor-pointer transition-all",
                pm.completed
                  ? "bg-orange-500/10 border border-orange-500/20"
                  : "bg-card border border-border shadow-sm hover:shadow-md hover:border-orange-500/40",
              )}
              role="button"
              tabIndex={0}
              aria-pressed={pm.completed}
              onClick={() => onToggleCompleted(pm)}
              onKeyDown={(e) => {
                // Only the card itself, not its inner buttons.
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onToggleCompleted(pm);
                }
              }}
            >
              <div className="flex items-start gap-1.5">
                <div
                  className={cn(
                    "mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                    pm.completed
                      ? "bg-orange-500 border-orange-500"
                      : "border-border group-hover:border-orange-400",
                  )}
                >
                  {pm.completed && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <div className="min-w-0">
                  <Tooltip content={pm.meal.name}>
                    <span
                      className={cn(
                        "text-sm leading-snug line-clamp-3",
                        pm.completed
                          ? "text-orange-600 dark:text-orange-400 line-through opacity-70"
                          : "text-foreground font-medium",
                      )}
                    >
                      {pm.meal.name}
                    </span>
                  </Tooltip>
                  {calories > 0 && (
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      {Math.round(calories)} kcal
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(pm);
                }}
                aria-label={`Usuń z planu: ${pm.meal.name}`}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-1 mt-1.5">
        <button
          type="button"
          onClick={onAdd}
          aria-label="Dodaj danie"
          className="flex-1 py-1.5 rounded-lg border border-dashed transition-all flex items-center justify-center border-transparent text-muted-foreground/50 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/5"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={onRandomize}
          disabled={randomizing}
          aria-label="Wylosuj danie"
          className="flex-1 py-1.5 rounded-lg border border-dashed transition-all flex items-center justify-center border-transparent text-muted-foreground/50 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/5 disabled:opacity-50"
        >
          {randomizing ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Shuffle className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}
