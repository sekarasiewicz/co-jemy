import { ArrowLeft, Clock, Flame, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMealAction } from "@/app/actions/meals";
import { MealImage } from "@/components/meals/meal-image";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { convertToGrams, formatAmount, formatMinutes } from "@/lib/utils";
import { DeleteMealButton } from "./delete-meal-button";

export default async function MealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const meal = await getMealAction(id);

  if (!meal) {
    notFound();
  }

  const totalTime = (meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0);

  // Compute nutrition from ingredients
  const ingredientNutrition = meal.ingredients.map((mi) => {
    const g = convertToGrams(mi.amount, mi.unit, mi.ingredient.weightPerUnit, mi.ingredient.defaultUnit);
    const factor = g / 100;
    return {
      id: mi.id,
      grams: Math.round(g),
      calories: Math.round((mi.ingredient.caloriesPer100g || 0) * factor),
      protein: Math.round((mi.ingredient.proteinPer100g || 0) * factor * 10) / 10,
      carbs: Math.round((mi.ingredient.carbsPer100g || 0) * factor * 10) / 10,
      fat: Math.round((mi.ingredient.fatPer100g || 0) * factor * 10) / 10,
    };
  });

  const computedTotal = ingredientNutrition.reduce(
    (acc, n) => ({
      calories: acc.calories + n.calories,
      protein: acc.protein + n.protein,
      carbs: acc.carbs + n.carbs,
      fat: acc.fat + n.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const nutrition = {
    calories: meal.calories ?? (computedTotal.calories > 0 ? Math.round(computedTotal.calories) : null),
    protein: meal.protein ?? (computedTotal.protein > 0 ? Math.round(computedTotal.protein * 10) / 10 : null),
    carbs: meal.carbs ?? (computedTotal.carbs > 0 ? Math.round(computedTotal.carbs * 10) / 10 : null),
    fat: meal.fat ?? (computedTotal.fat > 0 ? Math.round(computedTotal.fat * 10) / 10 : null),
  };

  const hasNutrition = nutrition.calories || nutrition.protein || nutrition.carbs || nutrition.fat;

  return (
    <div className="w-full">
      <Link
        href="/meals"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do dań
      </Link>

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-start">
        {meal.imageUrl && <MealImage src={meal.imageUrl} alt={meal.name} />}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">{meal.name}</h1>
            <div className="flex flex-shrink-0 gap-2">
              <Link href={`/meals/${meal.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="w-4 h-4" />
                </Button>
              </Link>
              <DeleteMealButton mealId={meal.id} mealName={meal.name} />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {meal.mealTypes.map((mt) => (
              <span
                key={mt.id}
                className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium"
              >
                {mt.name}
              </span>
            ))}
            {meal.isChildFriendly && <Badge variant="info">Dla dzieci</Badge>}
            {meal.isVegetarian && <Badge variant="fit">Wege</Badge>}
            {meal.isVegan && <Badge variant="fit">Vegan</Badge>}
            {meal.isGlutenFree && <Badge>Bezglutenowe</Badge>}
            {meal.isLactoseFree && <Badge>Bez laktozy</Badge>}
            {meal.isQuick && <Badge>Szybkie</Badge>}
            {meal.isMealPrep && <Badge>Meal prep</Badge>}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-muted-foreground">
            {totalTime > 0 && (
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>{formatMinutes(totalTime)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>{meal.servings} porcji</span>
            </div>
            {nutrition.calories && (
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5" />
                <span>{nutrition.calories} kcal</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {meal.description && (
        <p className="text-muted-foreground mb-8">{meal.description}</p>
      )}

      {hasNutrition && (
        <Card className="mb-8">
          <CardContent className="pt-4">
            <h2 className="font-semibold text-foreground mb-4">
              Wartości odżywcze (całe danie)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {nutrition.calories != null && (
                <div className="rounded-xl bg-primary/10 p-3 text-center">
                  <p className="text-2xl font-extrabold text-primary">
                    {nutrition.calories}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    kcal
                  </p>
                </div>
              )}
              {nutrition.protein != null && (
                <div className="rounded-xl bg-fit/15 p-3 text-center">
                  <p className="text-2xl font-extrabold text-lime-700 dark:text-lime-400">
                    {nutrition.protein}g
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    białko
                  </p>
                </div>
              )}
              {nutrition.carbs != null && (
                <div className="rounded-xl bg-amber-500/12 p-3 text-center">
                  <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
                    {nutrition.carbs}g
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    węglowodany
                  </p>
                </div>
              )}
              {nutrition.fat != null && (
                <div className="rounded-xl bg-sky-500/12 p-3 text-center">
                  <p className="text-2xl font-extrabold text-sky-600 dark:text-sky-400">
                    {nutrition.fat}g
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    tłuszcze
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5 items-start">
        <div className="space-y-6 lg:col-span-2">
      {meal.tags.length > 0 && (
        <div>
          <h2 className="font-semibold text-foreground mb-3">Tagi</h2>
          <div className="flex flex-wrap gap-2">
            {meal.tags.map((tag) => (
              <span
                key={tag.id}
                className="px-3 py-1 rounded-full text-sm"
                style={{
                  backgroundColor: tag.color + "20",
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {meal.ingredients.length > 0 && (
        <Card>
          <CardContent className="pt-4">
            <h2 className="font-semibold text-foreground mb-4">
              Składniki ({meal.servings} porcji)
            </h2>
            <ul className="space-y-2">
              {meal.ingredients.map((mi, idx) => {
                const n = ingredientNutrition[idx];
                return (
                  <li
                    key={mi.id}
                    className="flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 text-foreground min-w-0 flex-1">
                      {mi.ingredient.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mi.ingredient.image}
                          alt={mi.ingredient.name}
                          className="h-8 w-8 flex-shrink-0 rounded-md object-cover border border-border"
                        />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-fit flex-shrink-0" />
                      )}
                      <span className="truncate">{mi.ingredient.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 text-sm">
                      <span className="text-muted-foreground whitespace-nowrap">
                        {formatAmount(mi.amount)} {mi.unit}
                        {n.grams > 0 &&
                          !["g", "kg", "ml", "l"].includes(mi.unit) &&
                          ` (${n.grams} g)`}
                      </span>
                      {n.calories > 0 && (
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          · {n.calories} kcal
                          {(n.protein > 0 || n.carbs > 0 || n.fat > 0) && (
                            <span className="ml-1 hidden sm:inline">
                              (B:{n.protein} W:{n.carbs} T:{n.fat})
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
        </div>

        {meal.instructions && (
          <Card className="lg:col-span-3">
            <CardContent className="pt-4">
              <h2 className="font-semibold text-foreground mb-4">Przepis</h2>
              <div className="prose prose-stone dark:prose-invert max-w-none whitespace-pre-wrap">
                {meal.instructions}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
