"use client";

import { ChevronLeft, ChevronRight, Flame, Shuffle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addMealToPlanAction,
  getDailyPlanAction,
  getDailyPlansByDateRangeAction,
  removeMealFromPlanAction,
  toggleMealCompletedAction,
} from "@/app/actions/daily-plans";
import { randomizeMealAction } from "@/app/actions/meals";
import { AddMealModal } from "@/components/meals/add-meal-modal";
import { FillPlannerModal } from "@/components/planner/fill-planner-modal";
import { Button } from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import {
  addDays,
  type DayKey,
  parseDayKey,
  startOfWeek,
  todayKey,
} from "@/lib/day";
import {
  addNutrition,
  portionsNutrition,
  ZERO_NUTRITION,
} from "@/lib/nutrition";
import { cn, formatDateShort } from "@/lib/utils";
import type { DailyPlanWithMeals, MealType } from "@/types";
import { PlannerCell } from "./planner-cell";

// One request for the whole week, keyed by day.
async function fetchWeekPlans(profileId: string, weekStart: DayKey) {
  const weekPlans = await getDailyPlansByDateRangeAction(
    profileId,
    weekStart,
    addDays(weekStart, 6),
  );
  return new Map(weekPlans.map((plan) => [plan.date, plan]));
}

function dayTotals(plan: DailyPlanWithMeals | undefined) {
  return (plan?.meals ?? [])
    .map((pm) =>
      portionsNutrition(pm.meal, pm.meal.mealIngredients, pm.servings || 1),
    )
    .reduce(addNutrition, ZERO_NUTRITION);
}

interface WeekPlannerProps {
  mealTypes: MealType[];
}

type Cell = { day: DayKey; mealTypeId: string };

export function WeekPlanner({ mealTypes }: WeekPlannerProps) {
  const activeProfile = useActiveProfile();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayKey()));
  const [plans, setPlans] = useState<Map<string, DailyPlanWithMeals>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState<Cell | null>(null);
  const [randomizingCell, setRandomizingCell] = useState<Cell | null>(null);
  const [showFillModal, setShowFillModal] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = todayKey();

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

  // Re-read one day's plan after a change to it.
  const reloadDay = async (day: DayKey) => {
    if (!activeProfile) return;
    const plan = await getDailyPlanAction(activeProfile.id, day);
    setPlans((prev) => {
      const next = new Map(prev);
      if (plan) {
        next.set(day, plan);
      } else {
        next.delete(day);
      }
      return next;
    });
  };

  const handleAddMeal = async (mealId: string) => {
    if (!addingTo || !activeProfile) return;

    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        day: addingTo.day,
        mealId,
        mealTypeId: addingTo.mealTypeId,
      });
      await reloadDay(addingTo.day);
      setAddingTo(null);
      toast.success("Dodano do planu");
    } catch {
      toast.error("Nie udało się dodać do planu");
    }
  };

  const handleRemoveMeal = async (planMealId: string, day: DayKey) => {
    try {
      await removeMealFromPlanAction(planMealId);
      await reloadDay(day);
      toast.success("Usunięto z planu");
    } catch {
      toast.error("Nie udało się usunąć z planu");
    }
  };

  const handleToggleCompleted = async (
    planMealId: string,
    completed: boolean,
    day: DayKey,
  ) => {
    try {
      await toggleMealCompletedAction(planMealId, !completed);
      await reloadDay(day);
    } catch {
      toast.error("Nie udało się zapisać zmiany");
    }
  };

  // Replace whatever is in the cell with one random meal of that type.
  const handleRandomizeCell = async (day: DayKey, mealTypeId: string) => {
    if (!activeProfile) return;

    setRandomizingCell({ day, mealTypeId });
    try {
      const meal = await randomizeMealAction({ mealTypeId });
      if (!meal) {
        toast.error("Brak dań do wylosowania");
        return;
      }

      const existing =
        plans.get(day)?.meals.filter((pm) => pm.mealType.id === mealTypeId) ??
        [];
      for (const pm of existing) {
        await removeMealFromPlanAction(pm.id);
      }

      await addMealToPlanAction({
        profileId: activeProfile.id,
        day,
        mealId: meal.id,
        mealTypeId,
      });
      await reloadDay(day);
      toast.success(`Wylosowano: ${meal.name}`);
    } catch {
      toast.error("Nie udało się wylosować dania");
    } finally {
      setRandomizingCell(null);
    }
  };

  const reloadWeek = async () => {
    if (!activeProfile) return;
    setPlans(await fetchWeekPlans(activeProfile.id, weekStart));
  };

  if (!activeProfile) {
    return <div>Wybierz profil...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => setWeekStart((prev) => addDays(prev, -7))}
          aria-label="Poprzedni tydzień"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            {formatDateShort(parseDayKey(weekDays[0]))} -{" "}
            {formatDateShort(parseDayKey(weekDays[6]))}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFillModal(true)}
          >
            <Shuffle className="w-4 h-4 mr-1.5" />
            Wylosuj
          </Button>
          <Button
            variant="ghost"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            aria-label="Następny tydzień"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-[100px_repeat(7,1fr)] gap-3 mb-3">
        <div />
        {weekDays.map((day) => {
          const date = parseDayKey(day);
          const isToday = day === today;
          return (
            <div
              key={day}
              className={cn(
                "text-center py-2 rounded-xl font-medium",
                isToday
                  ? "bg-orange-500/15 text-orange-600 dark:text-orange-400 ring-1 ring-orange-500/30"
                  : "text-muted-foreground",
              )}
            >
              <div className="text-xs uppercase tracking-wide">
                {date.toLocaleDateString("pl-PL", { weekday: "short" })}
              </div>
              <div
                className={cn(
                  "text-xl font-bold",
                  isToday && "text-orange-600 dark:text-orange-400",
                )}
              >
                {date.getDate()}
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
            <div
              key={mealType.id}
              className="grid grid-cols-[100px_repeat(7,1fr)] gap-3"
            >
              <div className="flex items-start pt-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide leading-tight">
                  {mealType.name}
                </h3>
              </div>

              {weekDays.map((day) => (
                <PlannerCell
                  key={day}
                  planMeals={
                    plans
                      .get(day)
                      ?.meals.filter((pm) => pm.mealType.id === mealType.id) ??
                    []
                  }
                  isToday={day === today}
                  randomizing={
                    randomizingCell?.day === day &&
                    randomizingCell.mealTypeId === mealType.id
                  }
                  onToggleCompleted={(pm) =>
                    handleToggleCompleted(pm.id, pm.completed, day)
                  }
                  onRemove={(pm) => handleRemoveMeal(pm.id, day)}
                  onAdd={() => setAddingTo({ day, mealTypeId: mealType.id })}
                  onRandomize={() => handleRandomizeCell(day, mealType.id)}
                />
              ))}
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
            {weekDays.map((day) => {
              const totals = dayTotals(plans.get(day));
              if (totals.calories === 0) {
                return (
                  <div
                    key={day}
                    className="text-center text-xs text-muted-foreground/50 py-2"
                  >
                    —
                  </div>
                );
              }
              return (
                <div key={day} className="text-center py-2">
                  <p className="text-sm font-semibold text-foreground">
                    {Math.round(totals.calories)}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-tight">
                    B:{Math.round(totals.protein)} W:{Math.round(totals.carbs)}{" "}
                    T:{Math.round(totals.fat)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddMealModal
        mealType={
          mealTypes.find((mt) => mt.id === addingTo?.mealTypeId) ?? null
        }
        isOpen={!!addingTo}
        onClose={() => setAddingTo(null)}
        onSelect={handleAddMeal}
      />

      {showFillModal && (
        <FillPlannerModal
          profileId={activeProfile.id}
          filters={{}}
          mealTypes={mealTypes}
          title="Wylosuj posiłki"
          showPlannerLink={false}
          onFilled={reloadWeek}
          onClose={() => setShowFillModal(false)}
        />
      )}
    </div>
  );
}
