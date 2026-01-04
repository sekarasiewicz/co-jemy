"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Input,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type { Meal, MealType, Tag } from "@/types";

interface MealFormProps {
  meal?: Meal & { mealTypes: MealType[]; tags: Tag[] };
  mealTypes: MealType[];
  tags: Tag[];
  onSubmit: (data: MealFormData) => Promise<void>;
}

export interface MealFormData {
  name: string;
  description?: string;
  instructions?: string;
  imageUrl?: string;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isQuick: boolean;
  isMealPrep: boolean;
  isChildFriendly: boolean;
  mealTypeIds: string[];
  tagIds: string[];
}

export function MealForm({ meal, mealTypes, tags, onSubmit }: MealFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(meal?.name || "");
  const [description, setDescription] = useState(meal?.description || "");
  const [instructions, setInstructions] = useState(meal?.instructions || "");
  const [imageUrl, setImageUrl] = useState(meal?.imageUrl || "");
  const [servings, setServings] = useState(meal?.servings || 2);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    meal?.prepTimeMinutes || "",
  );
  const [cookTimeMinutes, setCookTimeMinutes] = useState(
    meal?.cookTimeMinutes || "",
  );
  const [calories, setCalories] = useState(meal?.calories || "");
  const [protein, setProtein] = useState(meal?.protein || "");
  const [carbs, setCarbs] = useState(meal?.carbs || "");
  const [fat, setFat] = useState(meal?.fat || "");
  const [isVegetarian, setIsVegetarian] = useState(meal?.isVegetarian || false);
  const [isVegan, setIsVegan] = useState(meal?.isVegan || false);
  const [isGlutenFree, setIsGlutenFree] = useState(meal?.isGlutenFree || false);
  const [isLactoseFree, setIsLactoseFree] = useState(
    meal?.isLactoseFree || false,
  );
  const [isQuick, setIsQuick] = useState(meal?.isQuick || false);
  const [isMealPrep, setIsMealPrep] = useState(meal?.isMealPrep || false);
  const [isChildFriendly, setIsChildFriendly] = useState(
    meal?.isChildFriendly || false,
  );
  const [selectedMealTypeIds, setSelectedMealTypeIds] = useState<string[]>(
    meal?.mealTypes.map((mt) => mt.id) || [],
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    meal?.tags.map((t) => t.id) || [],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSubmit({
        name,
        description: description || undefined,
        instructions: instructions || undefined,
        imageUrl: imageUrl || undefined,
        servings,
        prepTimeMinutes: prepTimeMinutes ? Number(prepTimeMinutes) : undefined,
        cookTimeMinutes: cookTimeMinutes ? Number(cookTimeMinutes) : undefined,
        calories: calories ? Number(calories) : undefined,
        protein: protein ? Number(protein) : undefined,
        carbs: carbs ? Number(carbs) : undefined,
        fat: fat ? Number(fat) : undefined,
        isVegetarian,
        isVegan,
        isGlutenFree,
        isLactoseFree,
        isQuick,
        isMealPrep,
        isChildFriendly,
        mealTypeIds: selectedMealTypeIds,
        tagIds: selectedTagIds,
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMealType = (id: string) => {
    setSelectedMealTypeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-foreground">
            Podstawowe informacje
          </h2>

          <Input
            label="Nazwa dania"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="np. Spaghetti Bolognese"
            required
          />

          <Textarea
            label="Opis"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Krótki opis dania..."
            rows={2}
          />

          <Input
            label="URL zdjęcia"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Porcje"
              type="number"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              min={1}
              required
            />
            <Input
              label="Przygotowanie (min)"
              type="number"
              value={prepTimeMinutes}
              onChange={(e) => setPrepTimeMinutes(e.target.value)}
              min={0}
            />
            <Input
              label="Gotowanie (min)"
              type="number"
              value={cookTimeMinutes}
              onChange={(e) => setCookTimeMinutes(e.target.value)}
              min={0}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-foreground">
            Wartości odżywcze (na porcję)
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label="Kalorie (kcal)"
              type="number"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              min={0}
            />
            <Input
              label="Białko (g)"
              type="number"
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              min={0}
              step={0.1}
            />
            <Input
              label="Węglowodany (g)"
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              min={0}
              step={0.1}
            />
            <Input
              label="Tłuszcze (g)"
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              min={0}
              step={0.1}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-foreground">Typ posiłku</h2>

          <div className="flex flex-wrap gap-2">
            {mealTypes.map((mt) => (
              <button
                key={mt.id}
                type="button"
                onClick={() => toggleMealType(mt.id)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-colors",
                  selectedMealTypeIds.includes(mt.id)
                    ? "bg-emerald-600 text-white dark:bg-emerald-500"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {mt.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-foreground">Cechy dania</h2>

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
              label="Szybkie (&lt;30 min)"
              checked={isQuick}
              onChange={(e) => setIsQuick(e.target.checked)}
            />
            <Checkbox
              label="Meal prep"
              checked={isMealPrep}
              onChange={(e) => setIsMealPrep(e.target.checked)}
            />
            <Checkbox
              label="Dla dzieci"
              checked={isChildFriendly}
              onChange={(e) => setIsChildFriendly(e.target.checked)}
            />
          </div>
        </CardContent>
      </Card>

      {tags.length > 0 && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <h2 className="font-semibold text-foreground">Tagi</h2>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                    selectedTagIds.includes(tag.id)
                      ? "ring-2 ring-offset-2 ring-offset-background"
                      : "opacity-60 hover:opacity-100",
                  )}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                    ...(selectedTagIds.includes(tag.id) && {
                      ringColor: tag.color,
                    }),
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <h2 className="font-semibold text-foreground">Przepis</h2>

          <Textarea
            label="Instrukcje przygotowania"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="1. Pokrój warzywa...&#10;2. Podgrzej patelnię...&#10;3. ..."
            rows={8}
          />
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="flex-1"
        >
          Anuluj
        </Button>
        <Button type="submit" loading={loading} className="flex-1">
          {meal ? "Zapisz zmiany" : "Dodaj danie"}
        </Button>
      </div>
    </form>
  );
}
