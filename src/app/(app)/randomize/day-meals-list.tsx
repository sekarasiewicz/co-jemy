"use client";

import { Check, Clock, Flame, Plus, Shuffle } from "lucide-react";
import Link from "next/link";
import { Button, Card, CardContent } from "@/components/ui";
import { formatMinutes } from "@/lib/utils";
import type { MealType, MealWithRelations } from "@/types";

export interface DayMeal {
  mealType: MealType;
  meal: MealWithRelations | null;
  addedToPlan: boolean;
}

interface DayMealsListProps {
  dayMeals: DayMeal[];
  adding: boolean;
  canAdd: boolean;
  onAddAll: () => void;
  onReroll: (index: number) => void;
}

export function DayMealsList({
  dayMeals,
  adding,
  canAdd,
  onAddAll,
  onReroll,
}: DayMealsListProps) {
  const withMeal = dayMeals.filter((dm) => dm.meal);
  // Everything drawn is in the plan (a re-rolled slot needs adding again).
  const added = withMeal.length > 0 && withMeal.every((dm) => dm.addedToPlan);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Wylosowane posiłki
        </h2>
        {added ? (
          <span className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
            <Check className="w-4 h-4" />
            Dodano do planu
          </span>
        ) : (
          withMeal.length > 0 && (
            <Button onClick={onAddAll} loading={adding} disabled={!canAdd}>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj wszystko do planu
            </Button>
          )
        )}
      </div>

      {dayMeals.map((dm, index) => {
        const totalTime = dm.meal
          ? (dm.meal.prepTimeMinutes || 0) + (dm.meal.cookTimeMinutes || 0)
          : 0;
        return (
          <Card key={dm.mealType.id}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">
                  {dm.mealType.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onReroll(index)}
                  aria-label={`Losuj ponownie: ${dm.mealType.name}`}
                >
                  <Shuffle className="w-4 h-4" />
                </Button>
              </div>

              {dm.meal ? (
                <div className="flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/meals/${dm.meal.id}`}
                      className="font-medium text-foreground hover:text-orange-600 dark:hover:text-orange-400"
                    >
                      {dm.meal.name}
                    </Link>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      {dm.meal.calories && (
                        <span className="flex items-center gap-1">
                          <Flame className="w-3 h-3" />
                          {dm.meal.calories} kcal
                        </span>
                      )}
                      {totalTime > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatMinutes(totalTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  {dm.addedToPlan && (
                    <span className="flex items-center gap-1 text-sm text-orange-600 dark:text-orange-400">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Brak dań dla tego typu posiłku
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
