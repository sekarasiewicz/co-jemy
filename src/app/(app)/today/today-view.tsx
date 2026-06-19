"use client";

import {
  ArrowLeftRight,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Flame,
  Plus,
  ShoppingCart,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  addMealToPlanAction,
  duplicateDayShiftForwardAction,
  getDailyPlanAction,
  removeMealFromPlanAction,
  swapDailyPlansAction,
  toggleMealCompletedAction,
} from "@/app/actions/daily-plans";
import { randomizeMealAction } from "@/app/actions/meals";
import { generateShoppingListAction } from "@/app/actions/shopping";
import {
  Badge,
  Button,
  Card,
  CardContent,
  DatePicker,
  Modal,
} from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import { cn, convertToGrams, formatAmount, formatMinutes, getTodayNoon } from "@/lib/utils";
import type { DailyPlanWithMeals, Meal, MealIngredient, Ingredient, MealType, MealWithRelations } from "@/types";

type MealNutrition = { calories: number; protein: number; carbs: number; fat: number };

function getMealNutrition(
  meal: Meal & { mealIngredients: (MealIngredient & { ingredient: Ingredient })[] },
  servings: number,
): MealNutrition {
  // Use meal-level values if available
  if (meal.calories != null || meal.protein != null || meal.carbs != null || meal.fat != null) {
    return {
      calories: (meal.calories || 0) * servings,
      protein: (meal.protein || 0) * servings,
      carbs: (meal.carbs || 0) * servings,
      fat: (meal.fat || 0) * servings,
    };
  }
  // Compute from ingredients
  if (meal.mealIngredients.length === 0) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  }
  const totals = meal.mealIngredients.reduce(
    (acc, mi) => {
      const g = convertToGrams(mi.amount, mi.unit, mi.ingredient.weightPerUnit, mi.ingredient.defaultUnit) / 100;
      return {
        calories: acc.calories + (mi.ingredient.caloriesPer100g || 0) * g,
        protein: acc.protein + (mi.ingredient.proteinPer100g || 0) * g,
        carbs: acc.carbs + (mi.ingredient.carbsPer100g || 0) * g,
        fat: acc.fat + (mi.ingredient.fatPer100g || 0) * g,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return {
    calories: totals.calories * servings,
    protein: totals.protein * servings,
    carbs: totals.carbs * servings,
    fat: totals.fat * servings,
  };
}

// Distinct accent per meal type so the day cards don't blend together.
const MEAL_TYPE_ACCENTS: Record<string, { bar: string; text: string }> = {
  Śniadanie: { bar: "border-t-amber-500", text: "text-amber-600 dark:text-amber-400" },
  "II śniadanie": { bar: "border-t-lime-500", text: "text-lime-600 dark:text-lime-400" },
  Obiad: { bar: "border-t-orange-500", text: "text-orange-600 dark:text-orange-400" },
  Podwieczorek: { bar: "border-t-rose-500", text: "text-rose-600 dark:text-rose-400" },
  Kolacja: { bar: "border-t-sky-500", text: "text-sky-600 dark:text-sky-400" },
  Przekąska: { bar: "border-t-violet-500", text: "text-violet-600 dark:text-violet-400" },
};

const FALLBACK_ACCENTS = [
  { bar: "border-t-orange-500", text: "text-orange-600 dark:text-orange-400" },
  { bar: "border-t-lime-500", text: "text-lime-600 dark:text-lime-400" },
  { bar: "border-t-sky-500", text: "text-sky-600 dark:text-sky-400" },
  { bar: "border-t-violet-500", text: "text-violet-600 dark:text-violet-400" },
  { bar: "border-t-amber-500", text: "text-amber-600 dark:text-amber-400" },
  { bar: "border-t-rose-500", text: "text-rose-600 dark:text-rose-400" },
];

function getMealTypeAccent(name: string, index: number) {
  return MEAL_TYPE_ACCENTS[name] ?? FALLBACK_ACCENTS[index % FALLBACK_ACCENTS.length];
}

interface TodayViewProps {
  mealTypes: MealType[];
  meals: MealWithRelations[];
}

export function TodayView({ mealTypes, meals }: TodayViewProps) {
  const activeProfile = useActiveProfile();
  const router = useRouter();
  const [plan, setPlan] = useState<DailyPlanWithMeals | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingMealType, setAddingMealType] = useState<MealType | null>(null);
  const [generatingList, setGeneratingList] = useState(false);
  const [randomizingMealType, setRandomizingMealType] = useState<string | null>(null);
  const [randomizingAll, setRandomizingAll] = useState(false);

  const [selectedDate, setSelectedDate] = useState(getTodayNoon());

  useEffect(() => {
    if (!activeProfile) return;

    const loadPlan = async () => {
      setLoading(true);
      const dailyPlan = await getDailyPlanAction(activeProfile.id, selectedDate);
      setPlan(dailyPlan || null);
      setLoading(false);
    };

    loadPlan();
  }, [activeProfile, selectedDate]);

  const shiftDay = (delta: number) => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + delta);
      return next;
    });
  };

  const isToday = selectedDate.toDateString() === getTodayNoon().toDateString();

  const [showSwap, setShowSwap] = useState(false);
  const [swapDate, setSwapDate] = useState("");
  const [dayActionLoading, setDayActionLoading] = useState(false);

  const reloadPlan = async () => {
    if (!activeProfile) return;
    const updated = await getDailyPlanAction(activeProfile.id, selectedDate);
    setPlan(updated || null);
  };

  const handleDuplicateDay = async () => {
    if (!activeProfile) return;
    setDayActionLoading(true);
    try {
      await duplicateDayShiftForwardAction({
        profileId: activeProfile.id,
        date: selectedDate,
      });
      toast.success("Skopiowano dzień, kolejne przesunięto");
      await reloadPlan();
    } catch {
      toast.error("Nie udało się skopiować dnia");
    } finally {
      setDayActionLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!activeProfile || !swapDate) return;
    setDayActionLoading(true);
    try {
      const [y, m, d] = swapDate.split("-").map(Number);
      const target = new Date(y, m - 1, d, 12, 0, 0, 0);
      await swapDailyPlansAction({
        profileId: activeProfile.id,
        dateA: selectedDate,
        dateB: target,
      });
      toast.success("Zamieniono dni");
      setShowSwap(false);
      await reloadPlan();
    } catch {
      toast.error("Nie udało się zamienić dni");
    } finally {
      setDayActionLoading(false);
    }
  };

  const openSwap = () => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSwapDate(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}`,
    );
    setShowSwap(true);
  };

  const handleAddMeal = async (mealId: string) => {
    if (!addingMealType || !activeProfile) return;

    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        date: selectedDate,
        mealId,
        mealTypeId: addingMealType.id,
      });

      const updatedPlan = await getDailyPlanAction(activeProfile.id, selectedDate);
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
      const updatedPlan = await getDailyPlanAction(activeProfile.id, selectedDate);
      setPlan(updatedPlan || null);
      toast.success("Usunięto z planu");
    } catch {
      toast.error("Nie udało się usunąć z planu");
    }
  };

  const handleToggleCompleted = async (
    planMealId: string,
    completed: boolean
  ) => {
    if (!activeProfile) return;

    await toggleMealCompletedAction(planMealId, !completed);

    const updatedPlan = await getDailyPlanAction(activeProfile.id, selectedDate);
    setPlan(updatedPlan || null);
  };

  const getMealsForType = (mealTypeId: string) => {
    return meals.filter((meal) =>
      meal.mealTypes.some((mt) => mt.id === mealTypeId)
    );
  };

  const getMealIngredients = (mealId: string) => {
    const meal = meals.find((m) => m.id === mealId);
    return meal?.ingredients || [];
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
        dateFrom: selectedDate,
        dateTo: selectedDate,
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
        date: selectedDate,
        mealId: meal.id,
        mealTypeId: mealType.id,
      });

      const updatedPlan = await getDailyPlanAction(activeProfile.id, selectedDate);
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
    let count = 0;
    try {
      for (const mealType of mealTypes) {
        const planMeals =
          plan?.meals.filter((pm) => pm.mealType.id === mealType.id) || [];
        if (planMeals.length > 0) continue;

        const meal = await randomizeMealAction({ mealTypeId: mealType.id });
        if (!meal) continue;

        await addMealToPlanAction({
          profileId: activeProfile.id,
          date: selectedDate,
          mealId: meal.id,
          mealTypeId: mealType.id,
        });
        count++;
      }

      const updatedPlan = await getDailyPlanAction(activeProfile.id, selectedDate);
      setPlan(updatedPlan || null);

      if (count > 0) {
        toast.success(`Wylosowano ${count} ${count === 1 ? "danie" : count < 5 ? "dania" : "dań"}`);
      } else {
        toast.info("Wszystkie typy posiłków są już wypełnione");
      }
    } catch {
      toast.error("Nie udało się wylosować dań");
    } finally {
      setRandomizingAll(false);
    }
  };

  // Calculate totals for the day
  const totals = plan?.meals.reduce(
    (acc, pm) => {
      const n = getMealNutrition(pm.meal, pm.servings || 1);
      return {
        calories: acc.calories + n.calories,
        protein: acc.protein + n.protein,
        carbs: acc.carbs + n.carbs,
        fat: acc.fat + n.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ) || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  const completedCount = plan?.meals.filter((pm) => pm.completed).length || 0;
  const totalMeals = plan?.meals.length || 0;

  if (!activeProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Wybierz profil, aby zobaczyć plan dnia</p>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("pl-PL", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

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
          <p className="text-muted-foreground capitalize min-w-[12rem]">
            {formatDate(selectedDate)}
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
            onClick={() => setSelectedDate(getTodayNoon())}
            className="text-xs text-orange-600 dark:text-orange-400 hover:underline mb-1"
          >
            Wróć do dziś
          </button>
        )}
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Cześć, <span className="text-gradient-brand">{activeProfile.name}</span>!
        </h1>
        {totalMeals > 0 && (
          <p className="text-muted-foreground mt-2">
            {completedCount} z {totalMeals} posiłków zjedzonych
          </p>
        )}
      </div>

      {/* Quick stats */}
      {totals.calories > 0 && (
        <Card className="mb-6 max-w-3xl mx-auto">
          <CardContent className="py-4">
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="rounded-xl bg-primary/10 py-2">
                <p className="text-2xl font-extrabold text-primary">
                  {Math.round(totals.calories)}
                </p>
                <p className="text-xs font-medium text-muted-foreground">kcal</p>
              </div>
              <div className="rounded-xl bg-fit/15 py-2">
                <p className="text-2xl font-extrabold text-lime-700 dark:text-lime-400">
                  {Math.round(totals.protein)}g
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  białko
                </p>
              </div>
              <div className="rounded-xl bg-amber-500/12 py-2">
                <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                  {Math.round(totals.carbs)}g
                </p>
                <p className="text-xs font-medium text-muted-foreground">węgle</p>
              </div>
              <div className="rounded-xl bg-sky-500/12 py-2">
                <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">
                  {Math.round(totals.fat)}g
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  tłuszcze
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            onClick={openSwap}
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
          {mealTypes.map((mealType, index) => {
            const planMeals =
              plan?.meals.filter((pm) => pm.mealType.id === mealType.id) || [];
            const accent = getMealTypeAccent(mealType.name, index);

            return (
              <Card key={mealType.id} className={cn("border-t-4", accent.bar)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className={cn("font-semibold", accent.text)}>
                      {mealType.name}
                    </h2>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRandomizeMeal(mealType)}
                        disabled={randomizingMealType === mealType.id || randomizingAll}
                      >
                        <Shuffle className={cn("w-4 h-4", randomizingMealType === mealType.id && "animate-spin")} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAddingMealType(mealType)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {planMeals.length === 0 ? (
                    <button
                      onClick={() => setAddingMealType(mealType)}
                      className="w-full py-6 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                      <Plus className="w-5 h-5 mx-auto mb-1" />
                      <span className="text-sm">Dodaj {mealType.name.toLowerCase()}</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      {planMeals.map((pm) => {
                        const totalTime =
                          (pm.meal.prepTimeMinutes || 0) +
                          (pm.meal.cookTimeMinutes || 0);

                        return (
                          <div
                            key={pm.id}
                            className={cn(
                              "flex flex-wrap items-center gap-3 p-3 rounded-xl border transition-colors",
                              pm.completed
                                ? "bg-fit/10 border-fit/30"
                                : "bg-card border-border"
                            )}
                          >
                            <button
                              onClick={() =>
                                handleToggleCompleted(pm.id, pm.completed)
                              }
                              className={cn(
                                "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                                pm.completed
                                  ? "bg-fit border-fit text-white"
                                  : "border-muted-foreground hover:border-fit"
                              )}
                            >
                              {pm.completed && <Check className="w-4 h-4" />}
                            </button>

                            {pm.meal.imageUrl && (
                              <Link
                                href={`/meals/${pm.meal.id}`}
                                className="flex-shrink-0"
                              >
                                <Image
                                  src={pm.meal.imageUrl}
                                  alt={pm.meal.name}
                                  width={48}
                                  height={48}
                                  className="h-12 w-12 rounded-lg border border-border object-cover"
                                />
                              </Link>
                            )}

                            <Link
                              href={`/meals/${pm.meal.id}`}
                              className="flex-1 min-w-0"
                            >
                              <p
                                className={cn(
                                  "font-medium leading-snug break-words",
                                  pm.completed
                                    ? "text-lime-700 dark:text-lime-400 line-through"
                                    : "text-foreground"
                                )}
                              >
                                {pm.meal.name}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {(() => {
                                  const n = getMealNutrition(pm.meal, pm.servings || 1);
                                  return n.calories > 0 ? (
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
                                  ) : null;
                                })()}
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
                              onClick={() => handleRemoveMeal(pm.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors self-start mt-0.5"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            {/* Ingredients list */}
                            {getMealIngredients(pm.meal.id).length > 0 && (
                              <div className="w-full border-t border-border/50 pt-2">
                                <ul className="text-xs text-muted-foreground space-y-0.5">
                                  {getMealIngredients(pm.meal.id).map((mi) => (
                                    <li key={mi.id}>
                                      {formatAmount(mi.amount)} {mi.unit} {mi.ingredient.name}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
      <Modal
        isOpen={!!addingMealType}
        onClose={() => setAddingMealType(null)}
        title={`Dodaj ${addingMealType?.name || ""}`}
        size="lg"
      >
        {addingMealType && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {getMealsForType(addingMealType.id).length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  Brak dań dla tego typu posiłku
                </p>
                <Link href="/meals/new">
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Dodaj nowe danie
                  </Button>
                </Link>
              </div>
            ) : (
              getMealsForType(addingMealType.id).map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => handleAddMeal(meal.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-orange-500 hover:bg-orange-500/10 transition-colors text-left"
                >
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{meal.name}</p>
                    <div className="flex gap-2 mt-1">
                      {meal.calories && (
                        <span className="text-xs text-muted-foreground">
                          {meal.calories} kcal
                        </span>
                      )}
                      {meal.isVegetarian && (
                        <Badge size="sm" variant="fit">
                          Wege
                        </Badge>
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

      {/* Swap day Modal */}
      <Modal
        isOpen={showSwap}
        onClose={() => !dayActionLoading && setShowSwap(false)}
        title="Zamień dzień"
      >
        <p className="text-muted-foreground mb-4">
          Plan z <strong className="text-foreground">{formatDate(selectedDate)}</strong>{" "}
          zostanie zamieniony miejscami z wybranym dniem.
        </p>
        <DatePicker
          label="Zamień z dniem"
          value={swapDate}
          onChange={setSwapDate}
          className="mb-6"
        />
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowSwap(false)}
            disabled={dayActionLoading}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleSwap}
            disabled={dayActionLoading || !swapDate}
            className="flex-1"
          >
            {dayActionLoading ? "Zamiana..." : "Zamień"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
