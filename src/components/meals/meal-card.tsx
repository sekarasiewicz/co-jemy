import { Clock, Flame, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge, Card, CardContent } from "@/components/ui";
import { perServingNutrition, roundNutrition } from "@/lib/nutrition";
import { formatMinutes } from "@/lib/utils";
import type { MealWithRelations } from "@/types";

interface MealCardProps {
  meal: MealWithRelations;
}

export function MealCard({ meal }: MealCardProps) {
  const totalTime = (meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0);

  const perServing = perServingNutrition(meal, meal.ingredients);
  const { calories, protein, carbs, fat } = perServing
    ? roundNutrition(perServing)
    : { calories: null, protein: null, carbs: null, fat: null };

  return (
    <Link href={`/meals/${meal.id}`} className="group block h-full">
      <Card className="h-full cursor-pointer overflow-hidden transition-all duration-200 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-warm">
        {meal.imageUrl && (
          <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-muted">
            <Image
              src={meal.imageUrl}
              alt={meal.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 20vw"
              className="object-cover"
            />
          </div>
        )}
        <CardContent className={meal.imageUrl ? "pt-3" : ""}>
          <h3 className="font-semibold text-foreground mb-2 transition-colors group-hover:text-primary">
            {meal.name}
          </h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {meal.isChildFriendly && <Badge variant="info">Dla dzieci</Badge>}
            {meal.isVegetarian && <Badge variant="fit">Wege</Badge>}
            {meal.isVegan && <Badge variant="fit">Vegan</Badge>}
            {meal.isQuick && <Badge>Szybkie</Badge>}
          </div>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {totalTime > 0 && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatMinutes(totalTime)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              <span>{meal.servings} porcji</span>
            </div>
            {calories && (
              <div className="flex items-center gap-1 font-medium text-primary">
                <Flame className="w-4 h-4" />
                <span>{calories} kcal</span>
              </div>
            )}
          </div>

          {(protein || carbs || fat) && (
            <p className="text-xs text-muted-foreground mt-1">
              {protein ? `B: ${protein}g` : ""}
              {protein && (carbs || fat) ? " · " : ""}
              {carbs ? `W: ${carbs}g` : ""}
              {carbs && fat ? " · " : ""}
              {fat ? `T: ${fat}g` : ""}
            </p>
          )}

          {meal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {meal.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag.id}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
