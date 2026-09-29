"use client";

import {
  ArrowLeftRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Copy,
  ShoppingCart,
  Shuffle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addMealToPlanAction,
  duplicateDayShiftForwardAction,
  fillPlannerAction,
  getDailyPlanAction,
  removeMealFromPlanAction,
  toggleMealCompletedAction,
} from "@/app/actions/daily-plans";
import { randomizeMealAction } from "@/app/actions/meals";
import { generateShoppingListAction } from "@/app/actions/shopping";
import { AddMealModal } from "@/components/meals/add-meal-modal";
import { Button } from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import { addDays, parseDayKey, todayKey } from "@/lib/day";
import {
  addNutrition,
  portionsNutrition,
  ZERO_NUTRITION,
} from "@/lib/nutrition";
import type { DailyPlanWithMeals, MealType } from "@/types";
import { DayTotalsCard } from "./day-totals-card";
import { MealTypeCard } from "./meal-type-card";
import { SwapDayModal } from "./swap-day-modal";

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface TodayViewProps {
  mealTypes: MealType[];
}

export function TodayView({ mealTypes }: TodayViewProps) {
  const activeProfile = useActiveProfile();
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlanWithMeals | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingMealType, setAddingMealType] = useState<MealType | null>(null);
  const [generatingList, setGeneratingList] = useState(false);
  const [randomizingMealType, setRandomizingMealType] = useState<string | null>(
    null,
  );
  const [randomizingAll, setRandomizingAll] = useState(false);

  const [selectedDay, setSelectedDay] = useState(todayKey);
  const selectedDate = parseDayKey(selectedDay);

  useEffect(() => {
    if (!activeProfile) return;

    // Ignore responses for a day the user already navigated away from.
    let cancelled = false;
    const loadPlan = async () => {
      setLoading(true);
      const dailyPlan = await getDailyPlanAction(activeProfile.id, selectedDay);
      if (cancelled) return;
      setPlan(dailyPlan || null);
      setLoading(false);
    };

    loadPlan();
    return () => {
      cancelled = true;
    };
  }, [activeProfile, selectedDay]);

  const shiftDay = (delta: number) => {
    setSelectedDay((prev) => addDays(prev, delta));
  };

  const isToday = selectedDay === todayKey();

  const [showSwap, setShowSwap] = useState(false);
  const [dayActionLoading, setDayActionLoading] = useState(false);

  const reloadPlan = async () => {
    if (!activeProfile) return;
    const updated = await getDailyPlanAction(activeProfile.id, selectedDay);
    setPlan(updated || null);
  };

  const handleDuplicateDay = async () => {
    if (!activeProfile) return;
    setDayActionLoading(true);
    try {
      await duplicateDayShiftForwardAction({
        profileId: activeProfile.id,
        day: selectedDay,
      });
      toast.success("Skopiowano dzień, kolejne przesunięto");
      await reloadPlan();
    } catch {
      toast.error("Nie udało się skopiować dnia");
    } finally {
      setDayActionLoading(false);
    }
  };

  const handleAddMeal = async (mealId: string) => {
    if (!addingMealType || !activeProfile) return;

    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        day: selectedDay,
        mealId,
        mealTypeId: addingMealType.id,
      });

      const updatedPlan = await getDailyPlanAction(
        activeProfile.id,
        selectedDay,
      );
      setPlan(updatedPlan || null);
      setAddingMealType(null);
      toast.success("Dodano do planu");
    } catch {
      toast.error("Nie udało się dodać do planu");
    }
  };

  const handleRemoveMeal = async (planMealId: string) => {
    if (!activeProfile) return;

    try {
      await removeMealFromPlanAction(planMealId);
      const updatedPlan = await getDailyPlanAction(
        activeProfile.id,
        selectedDay,
      );
      setPlan(updatedPlan || null);
      toast.success("Usunięto z planu");
    } catch {
      toast.error("Nie udało się usunąć z planu");
    }
  };

  const handleToggleCompleted = async (
    planMealId: string,
    completed: boolean,
  ) => {
    if (!activeProfile) return;

    // Optimistic: flip just this meal locally, no full refetch (avoids screen flash)
    const setCompleted = (value: boolean) =>
      setPlan((prev) =>
        prev
          ? {
              ...prev,
              meals: prev.meals.map((pm) =>
                pm.id === planMealId ? { ...pm, completed: value } : pm,
              ),
            }
          : prev,
      );

    setCompleted(!completed);

    try {
      await toggleMealCompletedAction(planMealId, !completed);
    } catch {
      setCompleted(completed); // revert on failure
      toast.error("Nie udało się zaktualizować posiłku");
    }
  };

  const handleGenerateShoppingList = async () => {
    if (!activeProfile) return;
    setGeneratingList(true);
    try {
      const dateStr = selectedDate.toLocaleDateString("pl-PL", {
        day: "numeric",
        month: "long",
      });
      const list = await generateShoppingListAction({
        profileIds: [activeProfile.id],
        dateFrom: selectedDay,
        dateTo: selectedDay,
        name: `Zakupy - ${dateStr}`,
      });
      router.push(`/shopping/${list.id}`);
    } catch {
      toast.error("Nie udało się wygenerować listy zakupów");
      setGeneratingList(false);
    }
  };

  const handleRandomizeMeal = async (mealType: MealType) => {
    if (!activeProfile) return;

    setRandomizingMealType(mealType.id);
    try {
      const meal = await randomizeMealAction({ mealTypeId: mealType.id });
      if (!meal) {
        toast.error(`Brak dań do wylosowania dla "${mealType.name}"`);
        return;
      }

      await addMealToPlanAction({
        profileId: activeProfile.id,
        day: selectedDay,
        mealId: meal.id,
        mealTypeId: mealType.id,
      });

      const updatedPlan = await getDailyPlanAction(
        activeProfile.id,
        selectedDay,
      );
      setPlan(updatedPlan || null);
      toast.success(`Wylosowano: ${meal.name}`);
    } catch {
      toast.error("Nie udało się wylosować dania");
    } finally {
      setRandomizingMealType(null);
    }
  };

  const handleRandomizeAll = async () => {
    if (!activeProfile) return;

    setRandomizingAll(true);
    try {
      const emptyTypeIds = mealTypes
        .filter((mt) => !plan?.meals.some((pm) => pm.mealType.id === mt.id))
        .map((mt) => mt.id);
      const { mealsAddedCount: count } =
        emptyTypeIds.length > 0
          ? await fillPlannerAction({
              profileId: activeProfile.id,
              days: [selectedDay],
              filters: {},
              mealTypeIds: emptyTypeIds,
              skipExistingDays: false,
            })
          : { mealsAddedCount: 0 };

      const updatedPlan = await getDailyPlanAction(
        activeProfile.id,
        selectedDay,
      );
      setPlan(updatedPlan || null);

      if (count > 0) {
        toast.success(
          `Wylosowano ${count} ${count === 1 ? "danie" : count < 5 ? "dania" : "dań"}`,
        );
      } else {
        toast.info("Wszystkie typy posiłków są już wypełnione");
      }
    } catch {
      toast.error("Nie udało się wylosować dań");
    } finally {
      setRandomizingAll(false);
    }
  };

  const totals = (plan?.meals ?? [])
    .map((pm) =>
      portionsNutrition(pm.meal, pm.meal.mealIngredients, pm.servings || 1),
    )
    .reduce(addNutrition, ZERO_NUTRITION);

  const completedCount = plan?.meals.filter((pm) => pm.completed).length || 0;
  const totalMeals = plan?.meals.length || 0;

  if (!activeProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Wybierz profil, aby zobaczyć plan dnia
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-1">
          <button
            type="button"
            onClick={() => shiftDay(-1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Poprzedni dzień"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <p className="text-muted-foreground capitalize text-center min-w-0 flex-1 sm:flex-none sm:min-w-[12rem]">
            {formatDayLabel(selectedDate)}
          </p>
          <button
            type="button"
            onClick={() => shiftDay(1)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Następny dzień"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {!isToday && (
          <button
            type="button"
            onClick={() => setSelectedDay(todayKey())}
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline mb-1"
          >
            Wróć do dziś
          </button>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Cześć,{" "}
          <span className="text-gradient-brand">{activeProfile.name}</span>!
        </h1>
        {totalMeals > 0 && (
          <p className="text-muted-foreground mt-2">
            {completedCount} z {totalMeals} posiłków zjedzonych
          </p>
        )}
      </div>

      {totals.calories > 0 && <DayTotalsCard totals={totals} />}

      {/* Randomize full day */}
      {!loading && (
        <div className="mb-4 max-w-3xl mx-auto">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleRandomizeAll}
            disabled={randomizingAll}
          >
            <Shuffle className="w-4 h-4 mr-2" />
            {randomizingAll ? "Losowanie..." : "Wylosuj cały dzień"}
          </Button>
        </div>
      )}

      {/* Day operations */}
      {!loading && (plan?.meals.length ?? 0) > 0 && (
        <div className="mb-4 flex gap-2 max-w-3xl mx-auto">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleDuplicateDay}
            disabled={dayActionLoading}
          >
            <Copy className="w-4 h-4 mr-2" />
            Kopiuj dzień →
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setShowSwap(true)}
            disabled={dayActionLoading}
          >
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Zamień z…
          </Button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Ładowanie...
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 items-start">
          {mealTypes.map((mealType, index) => (
            <MealTypeCard
              key={mealType.id}
              mealType={mealType}
              index={index}
              planMeals={
                plan?.meals.filter((pm) => pm.mealType.id === mealType.id) ?? []
              }
              randomizing={randomizingMealType === mealType.id}
              randomizeDisabled={
                randomizingMealType === mealType.id || randomizingAll
              }
              onRandomize={() => handleRandomizeMeal(mealType)}
              onAdd={() => setAddingMealType(mealType)}
              onToggleCompleted={(pm) =>
                handleToggleCompleted(pm.id, pm.completed)
              }
              onRemove={(pm) => handleRemoveMeal(pm.id)}
            />
          ))}
        </div>
      )}

      {/* Quick actions */}
      <div className="mt-8 grid grid-cols-2 gap-4 max-w-3xl mx-auto">
        <Link href="/planner">
          <Button variant="outline" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Planer tygodnia
          </Button>
        </Link>
        {totalMeals > 0 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGenerateShoppingList}
            disabled={generatingList}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            {generatingList ? "Generowanie..." : "Lista zakupów"}
          </Button>
        )}
      </div>

      {/* Add Meal Modal */}
      <AddMealModal
        mealType={addingMealType}
        isOpen={!!addingMealType}
        onClose={() => setAddingMealType(null)}
        onSelect={handleAddMeal}
      />

      {showSwap && (
        <SwapDayModal
          profileId={activeProfile.id}
          day={selectedDay}
          dayLabel={formatDayLabel(selectedDate)}
          onSwapped={reloadPlan}
          onClose={() => setShowSwap(false)}
        />
      )}
    </div>
  );
}
