"use client";

import { Calendar, CalendarRange, Shuffle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  addMealsToPlanAction,
  addMealToPlanAction,
} from "@/app/actions/daily-plans";
import { randomizeDayAction, randomizeMealAction } from "@/app/actions/meals";
import { FillPlannerModal } from "@/components/planner/fill-planner-modal";
import { Button, Card, CardContent } from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import { todayKey } from "@/lib/day";
import { cn } from "@/lib/utils";
import type { MealType, MealWithRelations, Tag } from "@/types";
import { type DayMeal, DayMealsList } from "./day-meals-list";
import { DayPickerModal } from "./day-picker-modal";
import { MealResultCard } from "./meal-result-card";
import {
  type FilterState,
  initialFilterState,
  RandomizerFiltersCard,
  toBaseFilters,
} from "./randomizer-filters";

interface RandomizerProps {
  mealTypes: MealType[];
  tags: Tag[];
}

type OpenModal = "pickDayForMeal" | "pickDayForAll" | "fillPlanner" | null;

export function Randomizer({ mealTypes, tags }: RandomizerProps) {
  const activeProfile = useActiveProfile();
  const [filters, setFilters] = useState<FilterState>(() =>
    initialFilterState(activeProfile?.isChild || false),
  );
  const [modal, setModal] = useState<OpenModal>(null);

  // Single meal mode
  const [result, setResult] = useState<MealWithRelations | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [addedToPlan, setAddedToPlan] = useState(false);

  // Full day mode
  const [dayMeals, setDayMeals] = useState<DayMeal[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [addingAllToPlan, setAddingAllToPlan] = useState(false);

  const handleRandomize = async () => {
    setLoading(true);
    setNoResults(false);
    setIsAnimating(true);
    setAddedToPlan(false);

    try {
      const meal = await randomizeMealAction({
        ...toBaseFilters(filters),
        mealTypeId: filters.mealTypeId || undefined,
        excludeMealIds: result ? [result.id] : undefined,
      });

      // Let the shuffle animation play.
      await new Promise((resolve) => setTimeout(resolve, 500));

      setResult(meal ?? null);
      setNoResults(!meal);
    } finally {
      setLoading(false);
      setIsAnimating(false);
    }
  };

  const handleAddToPlan = async (day: string) => {
    setModal(null);
    if (!result || !activeProfile) return;

    // The filtered meal type, else the meal's first type, else any type.
    const typeId =
      filters.mealTypeId || result.mealTypes[0]?.id || mealTypes[0]?.id;
    if (!typeId) return;

    setAddingToPlan(true);
    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        day,
        mealId: result.id,
        mealTypeId: typeId,
      });
      setAddedToPlan(true);
      toast.success(
        day === todayKey() ? "Dodano do planu na dziś" : "Dodano do planu",
      );
    } catch {
      toast.error("Nie udało się dodać do planu");
    } finally {
      setAddingToPlan(false);
    }
  };

  const handleRandomizeDay = async () => {
    setLoadingDay(true);
    setResult(null);
    setDayMeals([]);

    try {
      const picks = await randomizeDayAction(
        mealTypes.map((mt) => mt.id),
        toBaseFilters(filters),
      );
      setDayMeals(
        mealTypes.map((mealType, i) => ({
          mealType,
          meal: picks[i]?.meal ?? null,
          addedToPlan: false,
        })),
      );
    } catch {
      toast.error("Nie udało się wylosować dań");
    } finally {
      setLoadingDay(false);
    }
  };

  const handleAddAllToPlan = async (day: string) => {
    setModal(null);
    if (!activeProfile) return;

    const toAdd = dayMeals.flatMap((dm) =>
      dm.meal && !dm.addedToPlan
        ? [{ mealId: dm.meal.id, mealTypeId: dm.mealType.id }]
        : [],
    );
    if (toAdd.length === 0) return;

    setAddingAllToPlan(true);
    try {
      await addMealsToPlanAction({
        profileId: activeProfile.id,
        day,
        items: toAdd,
      });
      setDayMeals((prev) =>
        prev.map((dm) => (dm.meal ? { ...dm, addedToPlan: true } : dm)),
      );
      toast.success(
        day === todayKey()
          ? "Dodano wszystkie posiłki na dziś"
          : "Dodano wszystkie posiłki do planu",
      );
    } catch {
      toast.error("Nie udało się dodać posiłków do planu");
    } finally {
      setAddingAllToPlan(false);
    }
  };

  const handleRerollDayMeal = async (index: number) => {
    const current = dayMeals[index];
    const usedMealIds = dayMeals.flatMap((dm) => (dm.meal ? [dm.meal.id] : []));

    try {
      const meal = await randomizeMealAction({
        ...toBaseFilters(filters),
        mealTypeId: current.mealType.id,
        excludeMealIds: usedMealIds,
      });
      setDayMeals((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, meal: meal ?? null, addedToPlan: false }
            : item,
        ),
      );
    } catch {
      toast.error("Nie udało się wylosować dania");
    }
  };

  return (
    <div className="space-y-6">
      <RandomizerFiltersCard
        value={filters}
        onChange={setFilters}
        mealTypes={mealTypes}
        tags={tags}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          onClick={handleRandomize}
          loading={loading}
          size="lg"
          className="w-full"
        >
          <Shuffle
            className={cn("w-5 h-5", isAnimating && "animate-spin-slow")}
          />
          {result ? "Losuj ponownie" : "Losuj danie"}
        </Button>
        <Button
          onClick={handleRandomizeDay}
          loading={loadingDay}
          size="lg"
          variant="outline"
          className="w-full"
        >
          <Calendar className="w-5 h-5 mr-2" />
          Losuj cały dzień
        </Button>
        <Button
          onClick={() => setModal("fillPlanner")}
          size="lg"
          variant="outline"
          className="w-full"
          disabled={!activeProfile}
        >
          <CalendarRange className="w-5 h-5 mr-2" />
          Wypełnij planer
        </Button>
      </div>

      {noResults && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-4 text-center">
            <p className="text-amber-600 dark:text-amber-400">
              Nie znaleziono dań spełniających kryteria.
            </p>
            <p className="text-amber-600/80 dark:text-amber-400/80 text-sm mt-1">
              Spróbuj zmienić filtry lub{" "}
              <Link href="/meals/new" className="underline hover:no-underline">
                dodaj nowe danie
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <MealResultCard
          meal={result}
          isAnimating={isAnimating}
          added={addedToPlan}
          adding={addingToPlan}
          canAdd={Boolean(activeProfile)}
          onAdd={() => setModal("pickDayForMeal")}
        />
      )}

      {dayMeals.length > 0 && (
        <DayMealsList
          dayMeals={dayMeals}
          adding={addingAllToPlan}
          canAdd={Boolean(activeProfile)}
          onAddAll={() => setModal("pickDayForAll")}
          onReroll={handleRerollDayMeal}
        />
      )}

      {modal === "pickDayForMeal" && (
        <DayPickerModal
          title="Wybierz dzień"
          onPick={handleAddToPlan}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "pickDayForAll" && (
        <DayPickerModal
          title="Wybierz dzień dla wszystkich posiłków"
          onPick={handleAddAllToPlan}
          onClose={() => setModal(null)}
        />
      )}
      {modal === "fillPlanner" && activeProfile && (
        <FillPlannerModal
          profileId={activeProfile.id}
          filters={toBaseFilters(filters)}
          mealTypes={mealTypes}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
