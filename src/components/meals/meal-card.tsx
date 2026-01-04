import { Clock, Flame, Users } from "lucide-react";
import Link from "next/link";
import { Badge, Card, CardContent } from "@/components/ui";
import { formatMinutes } from "@/lib/utils";
import type { MealWithRelations } from "@/types";

interface MealCardProps {
  meal: MealWithRelations;
}

export function MealCard({ meal }: MealCardProps) {
  const totalTime = (meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0);

  return (
    <Link href={`/meals/${meal.id}`}>
      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
        {meal.imageUrl && (
          <div className="aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
            <img
              src={meal.imageUrl}
              alt={meal.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <CardContent className={meal.imageUrl ? "pt-3" : ""}>
          <h3 className="font-semibold text-foreground mb-2">{meal.name}</h3>

          <div className="flex flex-wrap gap-2 mb-3">
            {meal.isChildFriendly && <Badge variant="info">Dla dzieci</Badge>}
            {meal.isVegetarian && <Badge variant="success">Wege</Badge>}
            {meal.isVegan && <Badge variant="success">Vegan</Badge>}
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
            {meal.calories && (
              <div className="flex items-center gap-1">
                <Flame className="w-4 h-4" />
                <span>{meal.calories} kcal</span>
              </div>
            )}
          </div>

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
