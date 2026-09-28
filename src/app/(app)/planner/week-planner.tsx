"use client";

import { Check, ChevronLeft, ChevronRight, Flame, Loader2, Plus, Shuffle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addMealToPlanAction,
  fillPlannerAction,
  getDailyPlanAction,
  getDailyPlansByDateRangeAction,
  removeMealFromPlanAction,
  toggleMealCompletedAction,
} from "@/app/actions/daily-plans";
import { randomizeMealAction } from "@/app/actions/meals";
import { Button, Checkbox, Modal, Tooltip } from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import {
  addDays,
  type DayKey,
  parseDayKey,
  startOfWeek,
  toDayKey,
  todayKey,
} from "@/lib/day";
import {
  FILL_RANGE_LABELS,
  type FillRange,
  getDaysForRange,
} from "@/lib/fill-range";
import { portionsNutrition } from "@/lib/nutrition";
import { cn, formatDateShort } from "@/lib/utils";
import type { DailyPlanWithMeals, MealType, } from "@/types";
import { AddMealModal } from "@/components/meals/add-meal-modal";

// One request for the whole week, keyed by day.
async function fetchWeekPlans(profileId: string, weekStart: DayKey) {
  const weekPlans = await getDailyPlansByDateRangeAction(
    profileId,
    weekStart,
    addDays(weekStart, 6),
  );
  return new Map(weekPlans.map((plan) => [plan.date, plan]));
}

interface WeekPlannerProps {
  mealTypes: MealType[];
}

export function WeekPlanner({ mealTypes }: WeekPlannerProps) {
  const activeProfile = useActiveProfile();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayKey()));
  const [plans, setPlans] = useState<Map<string, DailyPlanWithMeals>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [addingMeal, setAddingMeal] = useState<{
    date: Date;
    mealTypeId: string;
  } | null>(null);
  const [randomizingCell, setRandomizingCell] = useState<{
    date: string;
    mealTypeId: string;
  } | null>(null);

  // Fill planner modal state
  const [showFillModal, setShowFillModal] = useState(false);
  const [fillRange, setFillRange] = useState<FillRange>("week");
  const [skipExisting, setSkipExisting] = useState(true);
  const [fillingPlanner, setFillingPlanner] = useState(false);
  const [fillResult, setFillResult] = useState<{
    daysFilledCount: number;
    mealsAddedCount: number;
  } | null>(null);

  const weekDays = Array.from({ length: 7 }, (_, i) =>
    parseDayKey(addDays(weekStart, i)),
  );

  useEffect(() => {
    if (!activeProfile) return;

    // Ignore responses for a week the user already navigated away from.
    let cancelled = false;
    const loadPlans = async () => {
      setLoading(true);
      const newPlans = await fetchWeekPlans(activeProfile.id, weekStart);
      if (cancelled) return;
      setPlans(newPlans);
      setLoading(false);
    };

    loadPlans();
    return () => {
      cancelled = true;
    };
  }, [activeProfile, weekStart]);

  const navigateWeek = (direction: number) => {
    setWeekStart((prev) => addDays(prev, direction * 7));
  };

  const handleAddMeal = async (mealId: string) => {
    if (!addingMeal || !activeProfile) return;

    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        day: toDayKey(addingMeal.date),
        mealId,
        mealTypeId: addingMeal.mealTypeId,
      });

      // Reload the plan for this day
      const plan = await getDailyPlanAction(
        activeProfile.id,
        toDayKey(addingMeal.date),
      );
      if (plan) {
        setPlans((prev) => {
          const newPlans = new Map(prev);
          newPlans.set(toDayKey(addingMeal.date), plan);
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

      const plan = await getDailyPlanAction(activeProfile.id, toDayKey(date));
      setPlans((prev) => {
        const newPlans = new Map(prev);
        const key = toDayKey(date);
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

    const plan = await getDailyPlanAction(activeProfile.id, toDayKey(date));
    if (plan) {
      setPlans((prev) => {
        const newPlans = new Map(prev);
        newPlans.set(toDayKey(date), plan);
        return newPlans;
      });
    }
  };

  const handleRandomizeCell = async (date: Date, mealTypeId: string) => {
    if (!activeProfile) return;

    const dateKey = toDayKey(date);
    setRandomizingCell({ date: dateKey, mealTypeId });

    try {
      const meal = await randomizeMealAction({ mealTypeId });
      if (!meal) {
        toast.error("Brak dań do wylosowania");
        return;
      }

      // Remove existing meals in this cell first
      const existingPlan = plans.get(dateKey);
      const existingMeals = existingPlan?.meals.filter(
        (pm) => pm.mealType.id === mealTypeId,
      ) || [];
      for (const pm of existingMeals) {
        await removeMealFromPlanAction(pm.id);
      }

      await addMealToPlanAction({
        profileId: activeProfile.id,
        day: dateKey,
        mealId: meal.id,
        mealTypeId,
      });

      const plan = await getDailyPlanAction(activeProfile.id, toDayKey(date));
      if (plan) {
        setPlans((prev) => {
          const newPlans = new Map(prev);
          newPlans.set(dateKey, plan);
          return newPlans;
        });
      }

      toast.success(`Wylosowano: ${meal.name}`);
    } catch {
      toast.error("Nie udało się wylosować dania");
    } finally {
      setRandomizingCell(null);
    }
  };

  const reloadAllPlans = async () => {
    if (!activeProfile) return;

    setPlans(await fetchWeekPlans(activeProfile.id, weekStart));
  };

  const handleFillPlanner = async () => {
    if (!activeProfile) return;

    setFillingPlanner(true);
    setFillResult(null);

    try {
      const result = await fillPlannerAction({
        profileId: activeProfile.id,
        days: getDaysForRange(fillRange),
        filters: {},
        mealTypeIds: mealTypes.map((mt) => mt.id),
        skipExistingDays: skipExisting,
      });
      setFillResult(result);
      toast.success(`Dodano ${result.mealsAddedCount} posiłków na ${result.daysFilledCount} dni`);
      await reloadAllPlans();
    } catch {
      toast.error("Nie udało się wypełnić planera");
    } finally {
      setFillingPlanner(false);
    }
  };

  const fillDates = getDaysForRange(fillRange);

  if (!activeProfile) {
    return <div>Wybierz profil...</div>;
  }

  const today = parseDayKey(todayKey());

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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFillResult(null);
              setShowFillModal(true);
            }}
          >
            <Shuffle className="w-4 h-4 mr-1.5" />
            Wylosuj
          </Button>
          <Button variant="ghost" onClick={() => navigateWeek(1)}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
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
                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30"
                  : "text-muted-foreground",
              )}
            >
              <div className="text-xs uppercase tracking-wide">
                {day.toLocaleDateString("pl-PL", { weekday: "short" })}
              </div>
              <div className={cn("text-xl font-bold", isToday && "text-orange-600 dark:text-orange-400")}>
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
                const key = toDayKey(day);
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
                        ? "bg-orange-500/5 ring-1 ring-orange-500/20"
                        : "bg-muted/30",
                    )}
                  >
                    <div className="space-y-1.5">
                      {planMeals.map((pm) => (
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
                          onClick={() =>
                            handleToggleCompleted(pm.id, pm.completed, day)
                          }
                          onKeyDown={(e) => {
                            // Only the card itself, not its inner buttons.
                            if (e.target !== e.currentTarget) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              handleToggleCompleted(pm.id, pm.completed, day);
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
                              {pm.completed && (
                                <Check className="w-2.5 h-2.5 text-white" />
                              )}
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
                              {(() => {
                                const n = portionsNutrition(pm.meal, pm.meal.mealIngredients, pm.servings || 1);
                                return n.calories > 0 ? (
                                  <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                                    {Math.round(n.calories)} kcal
                                  </p>
                                ) : null;
                              })()}
                            </div>
                          </div>
                          <button type="button"
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

                    <div className="flex gap-1 mt-1.5">
                      <button type="button"
                        onClick={() =>
                          setAddingMeal({
                            date: day,
                            mealTypeId: mealType.id,
                          })
                        }
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border border-dashed transition-all flex items-center justify-center",
                          "border-transparent text-muted-foreground/50 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/5",
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button type="button"
                        onClick={() => handleRandomizeCell(day, mealType.id)}
                        disabled={randomizingCell?.date === key && randomizingCell?.mealTypeId === mealType.id}
                        className={cn(
                          "flex-1 py-1.5 rounded-lg border border-dashed transition-all flex items-center justify-center",
                          "border-transparent text-muted-foreground/50 hover:border-orange-500/40 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-500/5",
                          "disabled:opacity-50",
                        )}
                      >
                        {randomizingCell?.date === key && randomizingCell?.mealTypeId === mealType.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Shuffle className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Daily totals row */}
          <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-3 pt-2 border-t border-border/50">
            <div className="flex items-center">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Flame className="w-3.5 h-3.5 inline mr-1" />
                Suma
              </h3>
            </div>
            {weekDays.map((day: Date) => {
              const key = toDayKey(day);
              const plan = plans.get(key);
              const dayTotals = plan?.meals.reduce(
                (acc, pm) => {
                  const n = portionsNutrition(pm.meal, pm.meal.mealIngredients, pm.servings || 1);
                  return {
                    calories: acc.calories + n.calories,
                    protein: acc.protein + n.protein,
                    carbs: acc.carbs + n.carbs,
                    fat: acc.fat + n.fat,
                  };
                },
                { calories: 0, protein: 0, carbs: 0, fat: 0 },
              ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

              if (dayTotals.calories === 0) {
                return <div key={day.toISOString()} className="text-center text-xs text-muted-foreground/50 py-2">—</div>;
              }

              return (
                <div key={day.toISOString()} className="text-center py-2">
                  <p className="text-sm font-semibold text-foreground">{Math.round(dayTotals.calories)}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    B:{Math.round(dayTotals.protein)} W:{Math.round(dayTotals.carbs)} T:{Math.round(dayTotals.fat)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddMealModal
        mealType={
          mealTypes.find((mt) => mt.id === addingMeal?.mealTypeId) ?? null
        }
        isOpen={!!addingMeal}
        onClose={() => setAddingMeal(null)}
        onSelect={handleAddMeal}
      />

      {/* Fill Planner Modal */}
      <Modal
        isOpen={showFillModal}
        onClose={() => setShowFillModal(false)}
        title="Wylosuj posiłki"
      >
        {fillResult ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-orange-500/10">
              <Check className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Dodano {fillResult.mealsAddedCount} posiłków na {fillResult.daysFilledCount} dni
              </p>
              {fillResult.mealsAddedCount === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  Wszystkie dni w wybranym zakresie mają już posiłki lub brak dań spełniających kryteria.
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowFillModal(false)}
            >
              Zamknij
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="block text-sm font-medium text-foreground mb-2">
                Zakres dat
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(FILL_RANGE_LABELS) as [FillRange, string][]).map(
                  ([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFillRange(value)}
                      className={cn(
                        "p-3 rounded-lg border text-sm text-left transition-colors",
                        fillRange === value
                          ? "border-orange-500 bg-orange-500/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-orange-500/50",
                      )}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            </div>

            <Checkbox
              label="Pomiń dni które już mają posiłki"
              checked={skipExisting}
              onChange={(e) => setSkipExisting(e.target.checked)}
            />

            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              Wylosuję posiłki na{" "}
              <span className="font-medium text-foreground">
                {fillDates.length} dni
              </span>{" "}
              ({mealTypes.length} posiłków dziennie)
            </div>

            <Button
              onClick={handleFillPlanner}
              loading={fillingPlanner}
              variant="primary"
              className="w-full"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Losuj i dodaj do planera
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
