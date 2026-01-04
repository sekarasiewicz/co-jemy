"use client";

import {
  Calendar,
  Check,
  Clock,
  Flame,
  Plus,
  Shuffle,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
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
import { cn, formatMinutes } from "@/lib/utils";
import type { DailyPlanWithMeals, MealType, MealWithRelations } from "@/types";

interface TodayViewProps {
  mealTypes: MealType[];
  meals: MealWithRelations[];
}

export function TodayView({ mealTypes, meals }: TodayViewProps) {
  const activeProfile = useActiveProfile();
  const [plan, setPlan] = useState<DailyPlanWithMeals | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingMealType, setAddingMealType] = useState<MealType | null>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!activeProfile) return;

    const loadPlan = async () => {
      setLoading(true);
      const dailyPlan = await getDailyPlanAction(activeProfile.id, today);
      setPlan(dailyPlan || null);
      setLoading(false);
    };

    loadPlan();
  }, [activeProfile]);

  const handleAddMeal = async (mealId: string) => {
    if (!addingMealType || !activeProfile) return;

    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        date: today,
        mealId,
        mealTypeId: addingMealType.id,
      });

      const updatedPlan = await getDailyPlanAction(activeProfile.id, today);
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
      const updatedPlan = await getDailyPlanAction(activeProfile.id, today);
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

    const updatedPlan = await getDailyPlanAction(activeProfile.id, today);
    setPlan(updatedPlan || null);
  };

  const getMealsForType = (mealTypeId: string) => {
    return meals.filter((meal) =>
      meal.mealTypes.some((mt) => mt.id === mealTypeId)
    );
  };

  // Calculate totals for the day
  const totals = plan?.meals.reduce(
    (acc, pm) => ({
      calories: acc.calories + (pm.meal.calories || 0) * (pm.servings || 1),
      protein: acc.protein + (pm.meal.protein || 0) * (pm.servings || 1),
      carbs: acc.carbs + (pm.meal.carbs || 0) * (pm.servings || 1),
      fat: acc.fat + (pm.meal.fat || 0) * (pm.servings || 1),
    }),
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
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-muted-foreground mb-1">
          {formatDate(today)}
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          Cześć, {activeProfile.name}!
        </h1>
        {totalMeals > 0 && (
          <p className="text-muted-foreground mt-2">
            {completedCount} z {totalMeals} posiłków zjedzonych
          </p>
        )}
      </div>

      {/* Quick stats */}
      {totals.calories > 0 && (
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(totals.calories)}
                </p>
                <p className="text-xs text-muted-foreground">kcal</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(totals.protein)}g
                </p>
                <p className="text-xs text-muted-foreground">białko</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(totals.carbs)}g
                </p>
                <p className="text-xs text-muted-foreground">węgle</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round(totals.fat)}g
                </p>
                <p className="text-xs text-muted-foreground">tłuszcze</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Ładowanie...
        </div>
      ) : (
        <div className="space-y-4">
          {mealTypes.map((mealType) => {
            const planMeals =
              plan?.meals.filter((pm) => pm.mealType.id === mealType.id) || [];

            return (
              <Card key={mealType.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-semibold text-foreground">
                      {mealType.name}
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAddingMealType(mealType)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {planMeals.length === 0 ? (
                    <button
                      onClick={() => setAddingMealType(mealType)}
                      className="w-full py-6 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
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
                              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                              pm.completed
                                ? "bg-emerald-500/10 border-emerald-500/30"
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
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-muted-foreground hover:border-emerald-500"
                              )}
                            >
                              {pm.completed && <Check className="w-4 h-4" />}
                            </button>

                            <Link
                              href={`/meals/${pm.meal.id}`}
                              className="flex-1 min-w-0"
                            >
                              <p
                                className={cn(
                                  "font-medium truncate",
                                  pm.completed
                                    ? "text-emerald-600 dark:text-emerald-400 line-through"
                                    : "text-foreground"
                                )}
                              >
                                {pm.meal.name}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                                {pm.meal.calories && (
                                  <span className="flex items-center gap-1">
                                    <Flame className="w-3 h-3" />
                                    {pm.meal.calories * (pm.servings || 1)} kcal
                                  </span>
                                )}
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
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      <div className="mt-8 grid grid-cols-2 gap-4">
        <Link href="/randomize">
          <Button variant="outline" className="w-full">
            <Shuffle className="w-4 h-4 mr-2" />
            Wylosuj danie
          </Button>
        </Link>
        <Link href="/planner">
          <Button variant="outline" className="w-full">
            <Calendar className="w-4 h-4 mr-2" />
            Planer tygodnia
          </Button>
        </Link>
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
                      {meal.isVegetarian && (
                        <Badge size="sm" variant="success">
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
    </div>
  );
}
