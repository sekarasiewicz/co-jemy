import { ArrowLeft, Clock, Flame, Pencil, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMealAction } from "@/app/actions/meals";
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
    const g = convertToGrams(mi.amount, mi.unit, mi.ingredient.weightPerUnit);
    const factor = g / 100;
    return {
      id: mi.id,
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
    <div className="max-w-3xl mx-auto">
      <Link
        href="/meals"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do dań
      </Link>

      {meal.imageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted mb-6">
          <img
            src={meal.imageUrl}
            alt={meal.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">{meal.name}</h1>

          <div className="flex flex-wrap gap-2">
            {meal.mealTypes.map((mt) => (
              <span
                key={mt.id}
                className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium"
              >
                {mt.name}
              </span>
            ))}
            {meal.isChildFriendly && <Badge variant="info">Dla dzieci</Badge>}
            {meal.isVegetarian && <Badge variant="success">Wege</Badge>}
            {meal.isVegan && <Badge variant="success">Vegan</Badge>}
            {meal.isGlutenFree && <Badge>Bezglutenowe</Badge>}
            {meal.isLactoseFree && <Badge>Bez laktozy</Badge>}
            {meal.isQuick && <Badge>Szybkie</Badge>}
            {meal.isMealPrep && <Badge>Meal prep</Badge>}
          </div>
        </div>

        <div className="flex gap-2">
          <Link href={`/meals/${meal.id}/edit`}>
            <Button variant="outline" size="sm">
              <Pencil className="w-4 h-4" />
            </Button>
          </Link>
          <DeleteMealButton mealId={meal.id} mealName={meal.name} />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-8 text-muted-foreground">
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

      {meal.description && (
        <p className="text-muted-foreground mb-8">{meal.description}</p>
      )}

      {hasNutrition && (
        <Card className="mb-8">
          <CardContent className="pt-4">
            <h2 className="font-semibold text-foreground mb-4">
              Wartości odżywcze (całe danie)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {nutrition.calories != null && (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {nutrition.calories}
                  </p>
                  <p className="text-sm text-muted-foreground">kcal</p>
                </div>
              )}
              {nutrition.protein != null && (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {nutrition.protein}g
                  </p>
                  <p className="text-sm text-muted-foreground">białko</p>
                </div>
              )}
              {nutrition.carbs != null && (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {nutrition.carbs}g
                  </p>
                  <p className="text-sm text-muted-foreground">węglowodany</p>
                </div>
              )}
              {nutrition.fat != null && (
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {nutrition.fat}g
                  </p>
                  <p className="text-sm text-muted-foreground">tłuszcze</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {meal.tags.length > 0 && (
        <div className="mb-8">
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
        <Card className="mb-8">
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
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 text-foreground min-w-0">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
                      <span className="truncate">
                        {mi.ingredient.name}{" "}
                        <span className="text-muted-foreground">
                          — {formatAmount(mi.amount)} {mi.unit}
                        </span>
                      </span>
                    </div>
                    {n.calories > 0 && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {n.calories} kcal
                        {(n.protein > 0 || n.carbs > 0 || n.fat > 0) && (
                          <span className="ml-1 hidden sm:inline">
                            (B:{n.protein} W:{n.carbs} T:{n.fat})
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {meal.instructions && (
        <Card>
          <CardContent className="pt-4">
            <h2 className="font-semibold text-foreground mb-4">Przepis</h2>
            <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">
              {meal.instructions}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
