"use client";

import { Check, ChevronLeft, ChevronRight, Plus, X } from "lucide-react";
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

      {/* Day headers */}
      <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-3 mb-3">
        <div />
        {weekDays.map((day: Date) => {
          const isToday = day.getTime() === today.getTime();
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "text-center py-2 rounded-xl font-medium",
                isToday
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                  : "text-muted-foreground",
              )}
            >
              <div className="text-xs uppercase tracking-wide">
                {day.toLocaleDateString("pl-PL", { weekday: "short" })}
              </div>
              <div className={cn("text-xl font-bold", isToday && "text-emerald-600 dark:text-emerald-400")}>
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Ładowanie...
        </div>
      ) : (
        <div className="space-y-3">
          {mealTypes.map((mealType) => (
            <div key={mealType.id} className="grid grid-cols-[100px_repeat(7,1fr)] gap-3">
              {/* Meal type label */}
              <div className="flex items-start pt-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
                  {mealType.name}
                </h3>
              </div>

              {/* Day cells */}
              {weekDays.map((day: Date) => {
                const isToday = day.getTime() === today.getTime();
                const key = day.toISOString().split("T")[0];
                const plan = plans.get(key);
                const planMeals =
                  plan?.meals.filter(
                    (pm) => pm.mealType.id === mealType.id,
                  ) || [];

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[80px] rounded-xl p-2 transition-colors",
                      isToday
                        ? "bg-emerald-500/5 ring-1 ring-emerald-500/20"
                        : "bg-muted/30",
                    )}
                  >
                    <div className="space-y-1.5">
                      {planMeals.map((pm) => (
                        <div
                          key={pm.id}
                          className={cn(
                            "group relative rounded-lg p-2 cursor-pointer transition-all",
                            pm.completed
                              ? "bg-emerald-500/10 border border-emerald-500/20"
                              : "bg-card border border-border shadow-sm hover:shadow-md hover:border-emerald-500/40",
                          )}
                          onClick={() =>
                            handleToggleCompleted(pm.id, pm.completed, day)
                          }
                        >
                          <div className="flex items-start gap-1.5">
                            <div
                              className={cn(
                                "mt-0.5 flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
                                pm.completed
                                  ? "bg-emerald-500 border-emerald-500"
                                  : "border-border group-hover:border-emerald-400",
                              )}
                            >
                              {pm.completed && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-sm leading-snug line-clamp-3",
                                pm.completed
                                  ? "text-emerald-600 dark:text-emerald-400 line-through opacity-70"
                                  : "text-foreground font-medium",
                              )}
                            >
                              {pm.meal.name}
                            </span>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveMeal(pm.id, day);
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center shadow-sm"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        setAddingMeal({
                          date: day,
                          mealTypeId: mealType.id,
                        })
                      }
                      className={cn(
                        "w-full mt-1.5 py-1.5 rounded-lg border border-dashed transition-all flex items-center justify-center gap-1",
                        "border-transparent text-muted-foreground/50 hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/5",
                      )}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
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
