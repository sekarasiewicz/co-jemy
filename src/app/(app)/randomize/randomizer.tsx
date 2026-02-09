"use client";

import { Calendar, CalendarRange, Check, Clock, Flame, Plus, Shuffle, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { addMealToPlanAction, fillPlannerAction } from "@/app/actions/daily-plans";
import { randomizeMealAction } from "@/app/actions/meals";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Modal,
  Select,
} from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import { cn, formatMinutes, getTodayNoon } from "@/lib/utils";
import type {
  MealType,
  MealWithRelations,
  RandomizerFilters,
  Tag,
} from "@/types";

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(12, 0, 0, 0);
    days.push(date);
  }
  return days;
}

function formatDayOption(date: Date, index: number): string {
  if (index === 0) return "Dziś";
  if (index === 1) return "Jutro";
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

type FillRange = "week" | "next-week" | "2weeks" | "month";

function getDatesForRange(range: FillRange): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  if (range === "week") {
    // From today to end of this week (Sunday)
    const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon...
    const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    for (let i = 0; i <= daysUntilSunday; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
  } else if (range === "next-week") {
    // Next Monday to next Sunday
    const dayOfWeek = today.getDay();
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + daysUntilNextMonday + i);
      dates.push(date);
    }
  } else if (range === "2weeks") {
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
  } else {
    // month — 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push(date);
    }
  }

  return dates;
}

const FILL_RANGE_LABELS: Record<FillRange, string> = {
  week: "Ten tydzień (pon-nd)",
  "next-week": "Następny tydzień",
  "2weeks": "Najbliższe 2 tygodnie",
  month: "Miesiąc (30 dni)",
};

interface DayMeal {
  mealType: MealType;
  meal: MealWithRelations | null;
  addedToPlan: boolean;
}

interface RandomizerProps {
  mealTypes: MealType[];
  tags: Tag[];
}

export function Randomizer({ mealTypes, tags }: RandomizerProps) {
  const activeProfile = useActiveProfile();
  const [result, setResult] = useState<MealWithRelations | null>(null);
  const [noResults, setNoResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [addingToPlan, setAddingToPlan] = useState(false);
  const [addedToPlan, setAddedToPlan] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Full day mode
  const [dayMeals, setDayMeals] = useState<DayMeal[]>([]);
  const [loadingDay, setLoadingDay] = useState(false);
  const [addingAllToPlan, setAddingAllToPlan] = useState(false);
  const [showDayDatePicker, setShowDayDatePicker] = useState(false);
  const [addedDayToPlan, setAddedDayToPlan] = useState<Date | null>(null);

  // Fill planner mode
  const [showFillPlanner, setShowFillPlanner] = useState(false);
  const [fillRange, setFillRange] = useState<FillRange>("week");
  const [skipExisting, setSkipExisting] = useState(true);
  const [fillingPlanner, setFillingPlanner] = useState(false);
  const [fillResult, setFillResult] = useState<{
    daysFilledCount: number;
    mealsAddedCount: number;
  } | null>(null);

  // Filters
  const [mealTypeId, setMealTypeId] = useState("");
  const [isVegetarian, setIsVegetarian] = useState(false);
  const [isVegan, setIsVegan] = useState(false);
  const [isGlutenFree, setIsGlutenFree] = useState(false);
  const [isLactoseFree, setIsLactoseFree] = useState(false);
  const [isQuick, setIsQuick] = useState(false);
  const [isChildFriendly, setIsChildFriendly] = useState(
    activeProfile?.isChild || false,
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const handleRandomize = async () => {
    setLoading(true);
    setNoResults(false);
    setIsAnimating(true);
    setAddedToPlan(null);

    const filters: RandomizerFilters = {
      mealTypeId: mealTypeId || undefined,
      isVegetarian: isVegetarian || undefined,
      isVegan: isVegan || undefined,
      isGlutenFree: isGlutenFree || undefined,
      isLactoseFree: isLactoseFree || undefined,
      isQuick: isQuick || undefined,
      isChildFriendly: isChildFriendly || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      excludeMealIds: result ? [result.id] : undefined,
    };

    try {
      const meal = await randomizeMealAction(filters);

      // Add animation delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (meal) {
        setResult(meal);
      } else {
        setNoResults(true);
        setResult(null);
      }
    } finally {
      setLoading(false);
      setIsAnimating(false);
    }
  };

  const handleAddToPlan = async (date: Date) => {
    if (!result || !activeProfile) return;

    // Use selected mealTypeId from filter, or first type from meal, or first available type
    const typeId =
      mealTypeId ||
      result.mealTypes[0]?.id ||
      mealTypes[0]?.id;

    if (!typeId) return;

    setAddingToPlan(true);
    setShowDatePicker(false);
    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        date,
        mealId: result.id,
        mealTypeId: typeId,
        servings: result.servings,
      });
      setAddedToPlan(date);
      const isToday = date.toDateString() === new Date().toDateString();
      toast.success(isToday ? "Dodano do planu na dziś" : "Dodano do planu");
    } catch {
      toast.error("Nie udało się dodać do planu");
    } finally {
      setAddingToPlan(false);
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleRandomizeDay = async () => {
    setLoadingDay(true);
    setResult(null);
    setDayMeals([]);
    setAddedDayToPlan(null);

    const baseFilters: Omit<RandomizerFilters, "mealTypeId"> = {
      isVegetarian: isVegetarian || undefined,
      isVegan: isVegan || undefined,
      isGlutenFree: isGlutenFree || undefined,
      isLactoseFree: isLactoseFree || undefined,
      isQuick: isQuick || undefined,
      isChildFriendly: isChildFriendly || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    const results: DayMeal[] = [];
    const usedMealIds: string[] = [];

    for (const mealType of mealTypes) {
      const filters: RandomizerFilters = {
        ...baseFilters,
        mealTypeId: mealType.id,
        excludeMealIds: usedMealIds.length > 0 ? usedMealIds : undefined,
      };

      const meal = await randomizeMealAction(filters);
      if (meal) {
        usedMealIds.push(meal.id);
      }
      results.push({
        mealType,
        meal: meal || null,
        addedToPlan: false,
      });
    }

    setDayMeals(results);
    setLoadingDay(false);
  };

  const handleAddAllToPlan = async (date: Date) => {
    if (!activeProfile) return;

    const mealsToAdd = dayMeals.filter((dm) => dm.meal && !dm.addedToPlan);
    if (mealsToAdd.length === 0) return;

    setAddingAllToPlan(true);
    setShowDayDatePicker(false);
    try {
      for (const dm of mealsToAdd) {
        if (dm.meal) {
          await addMealToPlanAction({
            profileId: activeProfile.id,
            date,
            mealId: dm.meal.id,
            mealTypeId: dm.mealType.id,
            servings: dm.meal.servings,
          });
        }
      }

      setDayMeals((prev) =>
        prev.map((dm) => (dm.meal ? { ...dm, addedToPlan: true } : dm))
      );
      setAddedDayToPlan(date);
      const isToday = date.toDateString() === new Date().toDateString();
      toast.success(isToday ? "Dodano wszystkie posiłki na dziś" : "Dodano wszystkie posiłki do planu");
    } catch {
      toast.error("Nie udało się dodać posiłków do planu");
    } finally {
      setAddingAllToPlan(false);
    }
  };

  const handleRerollDayMeal = async (index: number) => {
    const dm = dayMeals[index];
    const usedMealIds = dayMeals
      .filter((_, i) => i !== index)
      .map((d) => d.meal?.id)
      .filter(Boolean) as string[];

    const filters: RandomizerFilters = {
      mealTypeId: dm.mealType.id,
      isVegetarian: isVegetarian || undefined,
      isVegan: isVegan || undefined,
      isGlutenFree: isGlutenFree || undefined,
      isLactoseFree: isLactoseFree || undefined,
      isQuick: isQuick || undefined,
      isChildFriendly: isChildFriendly || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      excludeMealIds: dm.meal ? [...usedMealIds, dm.meal.id] : usedMealIds,
    };

    const meal = await randomizeMealAction(filters);
    setDayMeals((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, meal: meal || null, addedToPlan: false } : item
      )
    );
  };

  const handleFillPlanner = async () => {
    if (!activeProfile) return;

    setFillingPlanner(true);
    setFillResult(null);

    const baseFilters: RandomizerFilters = {
      isVegetarian: isVegetarian || undefined,
      isVegan: isVegan || undefined,
      isGlutenFree: isGlutenFree || undefined,
      isLactoseFree: isLactoseFree || undefined,
      isQuick: isQuick || undefined,
      isChildFriendly: isChildFriendly || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    try {
      const result = await fillPlannerAction({
        profileId: activeProfile.id,
        dates: getDatesForRange(fillRange),
        filters: baseFilters,
        mealTypeIds: mealTypes.map((mt) => mt.id),
        skipExistingDays: skipExisting,
      });
      setFillResult(result);
      toast.success(`Dodano ${result.mealsAddedCount} posiłków do planera`);
    } catch {
      toast.error("Nie udało się wypełnić planera");
    } finally {
      setFillingPlanner(false);
    }
  };

  const fillDates = getDatesForRange(fillRange);

  const totalTime = result
    ? (result.prepTimeMinutes || 0) + (result.cookTimeMinutes || 0)
    : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-foreground">Filtry</h2>

          <Select
            label="Typ posiłku"
            value={mealTypeId}
            onChange={(e) => setMealTypeId(e.target.value)}
            options={[
              { value: "", label: "Wszystkie" },
              ...mealTypes.map((mt) => ({ value: mt.id, label: mt.name })),
            ]}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Checkbox
              label="Wegetariańskie"
              checked={isVegetarian}
              onChange={(e) => setIsVegetarian(e.target.checked)}
            />
            <Checkbox
              label="Wegańskie"
              checked={isVegan}
              onChange={(e) => setIsVegan(e.target.checked)}
            />
            <Checkbox
              label="Bezglutenowe"
              checked={isGlutenFree}
              onChange={(e) => setIsGlutenFree(e.target.checked)}
            />
            <Checkbox
              label="Bez laktozy"
              checked={isLactoseFree}
              onChange={(e) => setIsLactoseFree(e.target.checked)}
            />
            <Checkbox
              label="Szybkie"
              checked={isQuick}
              onChange={(e) => setIsQuick(e.target.checked)}
            />
            <Checkbox
              label="Dla dzieci"
              checked={isChildFriendly}
              onChange={(e) => setIsChildFriendly(e.target.checked)}
            />
          </div>

          {tags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Tagi
              </label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-opacity",
                      selectedTagIds.includes(tag.id)
                        ? "opacity-100 ring-2 ring-offset-2 ring-offset-background"
                        : "opacity-50 hover:opacity-75",
                    )}
                    style={{
                      backgroundColor: `${tag.color}20`,
                      color: tag.color,
                    }}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          onClick={handleRandomize}
          loading={loading}
          size="lg"
          className="w-full"
        >
          <Shuffle
            className={cn("w-5 h-5 mr-2", isAnimating && "animate-spin")}
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
          onClick={() => {
            setFillResult(null);
            setShowFillPlanner(true);
          }}
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
        <Card
          className={cn(
            "transition-all duration-300",
            isAnimating && "opacity-50 scale-95",
          )}
        >
          {result.imageUrl && (
            <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
              <img
                src={result.imageUrl}
                alt={result.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className={result.imageUrl ? "pt-4" : "pt-6"}>
            <h3 className="text-xl font-bold text-foreground mb-3">
              {result.name}
            </h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {result.isChildFriendly && (
                <Badge variant="info">Dla dzieci</Badge>
              )}
              {result.isVegetarian && <Badge variant="success">Wege</Badge>}
              {result.isVegan && <Badge variant="success">Vegan</Badge>}
              {result.isQuick && <Badge>Szybkie</Badge>}
            </div>

            <div className="flex items-center gap-6 text-muted-foreground mb-4">
              {totalTime > 0 && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{formatMinutes(totalTime)}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>{result.servings} porcji</span>
              </div>
              {result.calories && (
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  <span>{result.calories} kcal</span>
                </div>
              )}
            </div>

            {result.description && (
              <p className="text-muted-foreground mb-4">{result.description}</p>
            )}

            <div className="flex gap-3">
              <Link href={`/meals/${result.id}`} className="flex-1">
                <Button variant="outline" className="w-full">
                  Zobacz przepis
                </Button>
              </Link>
              {addedToPlan ? (
                <Button variant="outline" className="flex-1" disabled>
                  <Check className="w-4 h-4 mr-2 text-emerald-500" />
                  Dodano do planu
                </Button>
              ) : (
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={() => setShowDatePicker(true)}
                  loading={addingToPlan}
                  disabled={!activeProfile}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj do planu
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {dayMeals.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Wylosowane posiłki
            </h2>
            {addedDayToPlan ? (
              <span className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400">
                <Check className="w-4 h-4" />
                Dodano do planu
              </span>
            ) : dayMeals.some((dm) => dm.meal) && (
              <Button
                onClick={() => setShowDayDatePicker(true)}
                loading={addingAllToPlan}
                disabled={!activeProfile}
              >
                <Plus className="w-4 h-4 mr-2" />
                Dodaj wszystko do planu
              </Button>
            )}
          </div>

          {dayMeals.map((dm, index) => (
            <Card key={dm.mealType.id}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">
                    {dm.mealType.name}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRerollDayMeal(index)}
                  >
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </div>

                {dm.meal ? (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/meals/${dm.meal.id}`}
                        className="font-medium text-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
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
                        {((dm.meal.prepTimeMinutes || 0) +
                          (dm.meal.cookTimeMinutes || 0)) >
                          0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatMinutes(
                              (dm.meal.prepTimeMinutes || 0) +
                                (dm.meal.cookTimeMinutes || 0)
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    {addedDayToPlan && (
                      <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
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
          ))}
        </div>
      )}

      <Modal
        isOpen={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        title="Wybierz dzień"
      >
        <div className="space-y-2">
          {getNextDays(8).map((date, index) => (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleAddToPlan(date)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-colors",
                "hover:border-emerald-500 hover:bg-emerald-500/10",
                index === 0 && "border-emerald-500 bg-emerald-500/10"
              )}
            >
              <span className="font-medium text-foreground capitalize">
                {formatDayOption(date, index)}
              </span>
              {index > 1 && (
                <span className="text-muted-foreground ml-2">
                  ({date.getDate()}.{(date.getMonth() + 1).toString().padStart(2, "0")})
                </span>
              )}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showDayDatePicker}
        onClose={() => setShowDayDatePicker(false)}
        title="Wybierz dzień dla wszystkich posiłków"
      >
        <div className="space-y-2">
          {getNextDays(8).map((date, index) => (
            <button
              key={date.toISOString()}
              type="button"
              onClick={() => handleAddAllToPlan(date)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-colors",
                "hover:border-emerald-500 hover:bg-emerald-500/10",
                index === 0 && "border-emerald-500 bg-emerald-500/10"
              )}
            >
              <span className="font-medium text-foreground capitalize">
                {formatDayOption(date, index)}
              </span>
              {index > 1 && (
                <span className="text-muted-foreground ml-2">
                  ({date.getDate()}.{(date.getMonth() + 1).toString().padStart(2, "0")})
                </span>
              )}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showFillPlanner}
        onClose={() => setShowFillPlanner(false)}
        title="Wypełnij planer"
      >
        {fillResult ? (
          <div className="space-y-4 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-emerald-500/10">
              <Check className="w-6 h-6 text-emerald-500" />
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
            <div className="flex gap-3">
              <Link href="/planner" className="flex-1">
                <Button variant="primary" className="w-full">
                  Przejdź do planera
                </Button>
              </Link>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowFillPlanner(false)}
              >
                Zamknij
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Zakres dat
              </label>
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
                          ? "border-emerald-500 bg-emerald-500/10 text-foreground"
                          : "border-border text-muted-foreground hover:border-emerald-500/50"
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
              Wylosuję posiłki na <span className="font-medium text-foreground">{fillDates.length} dni</span>
              {" "}({mealTypes.length} posiłków dziennie)
            </div>

            <Button
              onClick={handleFillPlanner}
              loading={fillingPlanner}
              variant="primary"
              className="w-full"
              disabled={!activeProfile}
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
