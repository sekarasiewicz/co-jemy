"use client";

import { Plus, Shuffle } from "lucide-react";
import { Button, Card, CardContent } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MealType } from "@/types";
import { getMealTypeAccent } from "./meal-type-accents";
import { type PlanMeal, PlanMealItem } from "./plan-meal-item";

interface MealTypeCardProps {
  mealType: MealType;
  // Position among the meal types, for the fallback accent colour.
  index: number;
  planMeals: PlanMeal[];
  randomizing: boolean;
  randomizeDisabled: boolean;
  onRandomize: () => void;
  onAdd: () => void;
  onToggleCompleted: (planMeal: PlanMeal) => void;
  onRemove: (planMeal: PlanMeal) => void;
}

export function MealTypeCard({
  mealType,
  index,
  planMeals,
  randomizing,
  randomizeDisabled,
  onRandomize,
  onAdd,
  onToggleCompleted,
  onRemove,
}: MealTypeCardProps) {
  const accent = getMealTypeAccent(mealType.name, index);

  return (
    <Card className={cn("border-t-4", accent.bar)}>
      <CardContent className="py-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className={cn("font-semibold", accent.text)}>{mealType.name}</h2>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={onRandomize}
              disabled={randomizeDisabled}
              aria-label={`Wylosuj: ${mealType.name}`}
            >
              <Shuffle
                className={cn("w-4 h-4", randomizing && "animate-spin")}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onAdd}
              aria-label={`Dodaj: ${mealType.name}`}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {planMeals.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="w-full py-6 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <Plus className="w-5 h-5 mx-auto mb-1" />
            <span className="text-sm">Dodaj {mealType.name.toLowerCase()}</span>
          </button>
        ) : (
          <div className="space-y-2">
            {planMeals.map((pm) => (
              <PlanMealItem
                key={pm.id}
                planMeal={pm}
                onToggleCompleted={() => onToggleCompleted(pm)}
                onRemove={() => onRemove(pm)}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
