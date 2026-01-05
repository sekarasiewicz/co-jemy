"use client";

import { ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addMealToPlanAction,
  getDailyPlanAction,
  removeMealFromPlanAction,
  toggleMealCompletedAction,
} from "@/app/actions/daily-plans";
import { Badge, Button, Card, CardContent, Modal } from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import { cn, formatDateShort, getTodayNoon, getWeekDays } from "@/lib/utils";
import type { DailyPlanWithMeals, MealType, MealWithRelations } from "@/types";

interface WeekPlannerProps {
  mealTypes: MealType[];
  meals: MealWithRelations[];
}

export function WeekPlanner({ mealTypes, meals }: WeekPlannerProps) {
  const activeProfile = useActiveProfile();
  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    today.setDate(today.getDate() - today.getDay() + 1); // Monday
    today.setHours(12, 0, 0, 0); // Noon to avoid timezone issues
    return today;
  });
  const [plans, setPlans] = useState<Map<string, DailyPlanWithMeals>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [addingMeal, setAddingMeal] = useState<{
    date: Date;
    mealTypeId: string;
  } | null>(null);

  const weekDays = getWeekDays(weekStart);

  useEffect(() => {
    if (!activeProfile) return;

    const loadPlans = async () => {
      setLoading(true);
      const newPlans = new Map<string, DailyPlanWithMeals>();

      await Promise.all(
        weekDays.map(async (date: Date) => {
          const plan = await getDailyPlanAction(activeProfile.id, date);
          if (plan) {
            newPlans.set(date.toISOString().split("T")[0], plan);
          }
        }),
      );

      setPlans(newPlans);
      setLoading(false);
    };

    loadPlans();
  }, [activeProfile, weekStart]);

  const navigateWeek = (direction: number) => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + direction * 7);
      return newDate;
    });
  };

  const handleAddMeal = async (mealId: string) => {
    if (!addingMeal || !activeProfile) return;

    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        date: addingMeal.date,
        mealId,
        mealTypeId: addingMeal.mealTypeId,
      });

      // Reload the plan for this day
      const plan = await getDailyPlanAction(activeProfile.id, addingMeal.date);
      if (plan) {
        setPlans((prev) => {
          const newPlans = new Map(prev);
          newPlans.set(addingMeal.date.toISOString().split("T")[0], plan);
          return newPlans;
        });
      }

      setAddingMeal(null);
      toast.success("Dodano do planu");
    } catch {
      toast.error("Nie udało się dodać do planu");
    }
  };

  const handleRemoveMeal = async (planMealId: string, date: Date) => {
    if (!activeProfile) return;

    try {
      await removeMealFromPlanAction(planMealId);

      const plan = await getDailyPlanAction(activeProfile.id, date);
      setPlans((prev) => {
        const newPlans = new Map(prev);
        const key = date.toISOString().split("T")[0];
        if (plan) {
          newPlans.set(key, plan);
        } else {
          newPlans.delete(key);
        }
        return newPlans;
      });
      toast.success("Usunięto z planu");
    } catch {
      toast.error("Nie udało się usunąć z planu");
    }
  };

  const handleToggleCompleted = async (
    planMealId: string,
    completed: boolean,
    date: Date,
  ) => {
    if (!activeProfile) return;

    await toggleMealCompletedAction(planMealId, !completed);

    const plan = await getDailyPlanAction(activeProfile.id, date);
    if (plan) {
      setPlans((prev) => {
        const newPlans = new Map(prev);
        newPlans.set(date.toISOString().split("T")[0], plan);
        return newPlans;
      });
    }
  };

  const getMealsForType = (mealTypeId: string) => {
    return meals.filter((meal) =>
      meal.mealTypes.some((mt) => mt.id === mealTypeId),
    );
  };

  if (!activeProfile) {
    return <div>Wybierz profil...</div>;
  }

  const today = getTodayNoon();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigateWeek(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {formatDateShort(weekDays[0])} - {formatDateShort(weekDays[6])}
          </p>
        </div>

        <Button variant="ghost" onClick={() => navigateWeek(1)}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekDays.map((day: Date) => {
          const isToday = day.getTime() === today.getTime();
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center py-2 rounded-lg text-sm font-medium",
                isToday
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              <div className="text-xs uppercase">
                {day.toLocaleDateString("pl-PL", { weekday: "short" })}
              </div>
              <div className="text-lg">{day.getDate()}</div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Ładowanie...
        </div>
      ) : (
        <div className="space-y-4">
          {mealTypes.map((mealType) => (
            <Card key={mealType.id}>
              <CardContent className="py-3">
                <h3 className="font-semibold text-foreground mb-3">
                  {mealType.name}
                </h3>

                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day: Date) => {
                    const key = day.toISOString().split("T")[0];
                    const plan = plans.get(key);
                    const planMeals =
                      plan?.meals.filter(
                        (pm) => pm.mealType.id === mealType.id,
                      ) || [];

                    return (
                      <div
                        key={day.toISOString()}
                        className="min-h-[60px] bg-muted/50 rounded-lg p-1"
                      >
                        {planMeals.map((pm) => (
                          <div
                            key={pm.id}
                            className={cn(
                              "group relative text-xs p-1.5 rounded mb-1 cursor-pointer transition-colors",
                              pm.completed
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 line-through"
                                : "bg-card border border-border hover:border-muted-foreground",
                            )}
                            onClick={() =>
                              handleToggleCompleted(pm.id, pm.completed, day)
                            }
                          >
                            <span className="line-clamp-2">{pm.meal.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMeal(pm.id, day);
                              }}
                              className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() =>
                            setAddingMeal({
                              date: day,
                              mealTypeId: mealType.id,
                            })
                          }
                          className="w-full py-1 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors"
                        >
                          <Plus className="w-4 h-4 mx-auto" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Meal Modal */}
      <Modal
        isOpen={!!addingMeal}
        onClose={() => setAddingMeal(null)}
        title={`Dodaj ${
          addingMeal
            ? mealTypes.find((mt) => mt.id === addingMeal.mealTypeId)?.name
            : ""
        }`}
        size="lg"
      >
        {addingMeal && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getMealsForType(addingMeal.mealTypeId).length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Brak dań dla tego typu posiłku
              </p>
            ) : (
              getMealsForType(addingMeal.mealTypeId).map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => handleAddMeal(meal.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{meal.name}</p>
                    <div className="flex gap-2 mt-1">
                      {meal.calories && (
                        <span className="text-xs text-muted-foreground">
                          {meal.calories} kcal
                        </span>
                      )}
                      {meal.isChildFriendly && (
                        <Badge size="sm" variant="info">
                          Dla dzieci
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
