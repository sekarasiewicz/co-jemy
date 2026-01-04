"use client";

import { Check, Clock, Flame, Plus, Shuffle, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { addMealToPlanAction } from "@/app/actions/daily-plans";
import { randomizeMealAction } from "@/app/actions/meals";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Checkbox,
  Select,
} from "@/components/ui";
import { useActiveProfile } from "@/contexts/profile-context";
import { cn, formatMinutes } from "@/lib/utils";
import type {
  MealType,
  MealWithRelations,
  RandomizerFilters,
  Tag,
} from "@/types";

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
  const [addedToPlan, setAddedToPlan] = useState(false);

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
    setAddedToPlan(false);

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

  const handleAddToPlan = async () => {
    if (!result || !activeProfile) return;

    // Use selected mealTypeId from filter, or first type from meal, or first available type
    const typeId =
      mealTypeId ||
      result.mealTypes[0]?.id ||
      mealTypes[0]?.id;

    if (!typeId) return;

    setAddingToPlan(true);
    try {
      await addMealToPlanAction({
        profileId: activeProfile.id,
        date: new Date(),
        mealId: result.id,
        mealTypeId: typeId,
        servings: result.servings,
      });
      setAddedToPlan(true);
    } finally {
      setAddingToPlan(false);
    }
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

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
                  onClick={handleAddToPlan}
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
    </div>
  );
}
