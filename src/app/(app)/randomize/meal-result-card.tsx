"use client";

import { Check, Clock, Flame, Plus, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge, Button, Card, CardContent } from "@/components/ui";
import { cn, formatMinutes } from "@/lib/utils";
import type { MealWithRelations } from "@/types";

interface MealResultCardProps {
  meal: MealWithRelations;
  isAnimating: boolean;
  added: boolean;
  adding: boolean;
  canAdd: boolean;
  onAdd: () => void;
}

export function MealResultCard({
  meal,
  isAnimating,
  added,
  adding,
  canAdd,
  onAdd,
}: MealResultCardProps) {
  const totalTime = (meal.prepTimeMinutes || 0) + (meal.cookTimeMinutes || 0);

  return (
    <Card
      className={cn(
        "overflow-hidden shadow-warm-lg ring-1 ring-primary/15 transition-all duration-300",
        isAnimating ? "opacity-50 scale-95" : "animate-pop-in",
      )}
    >
      {meal.imageUrl && (
        <div className="relative aspect-video w-full overflow-hidden rounded-t-2xl bg-muted">
          <Image
            src={meal.imageUrl}
            alt={meal.name}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
          />
        </div>
      )}
      <CardContent className={meal.imageUrl ? "pt-4" : "pt-6"}>
        <h3 className="text-xl font-bold text-foreground mb-3">{meal.name}</h3>

        <div className="flex flex-wrap gap-2 mb-4">
          {meal.isChildFriendly && <Badge variant="info">Dla dzieci</Badge>}
          {meal.isVegetarian && <Badge variant="fit">Wege</Badge>}
          {meal.isVegan && <Badge variant="fit">Vegan</Badge>}
          {meal.isQuick && <Badge>Szybkie</Badge>}
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
            <span>{meal.servings} porcji</span>
          </div>
          {!!meal.calories && (
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5" />
              <span>{meal.calories} kcal</span>
            </div>
          )}
        </div>

        {meal.description && (
          <p className="text-muted-foreground mb-4">{meal.description}</p>
        )}

        <div className="flex gap-3">
          <Link href={`/meals/${meal.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Zobacz przepis
            </Button>
          </Link>
          {added ? (
            <Button variant="outline" className="flex-1" disabled>
              <Check className="w-4 h-4 mr-2 text-orange-500" />
              Dodano do planu
            </Button>
          ) : (
            <Button
              variant="primary"
              className="flex-1"
              onClick={onAdd}
              loading={adding}
              disabled={!canAdd}
            >
              <Plus className="w-4 h-4 mr-2" />
              Dodaj do planu
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
