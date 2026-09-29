"use client";

import { Calculator, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { generateMealImageAction } from "@/app/actions/meal-ai";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  ImageUpload,
  Input,
  Textarea,
} from "@/components/ui";
import {
  recipeNutrition,
  roundNutrition,
  scaleNutrition,
} from "@/lib/nutrition";
import { cn } from "@/lib/utils";
import type { Ingredient, Meal, MealIngredient, MealType, Tag } from "@/types";
import { unwrap } from "@/lib/action-result";
import {
  type IngredientRow,
  MealIngredientsEditor,
  newIngredientRow,
} from "./meal-ingredients-editor";

const MEAL_FLAGS = [
  ["isVegetarian", "Wegetariańskie"],
  ["isVegan", "Wegańskie"],
  ["isGlutenFree", "Bezglutenowe"],
  ["isLactoseFree", "Bez laktozy"],
  ["isQuick", "Szybkie (<30 min)"],
  ["isMealPrep", "Meal prep"],
  ["isChildFriendly", "Dla dzieci"],
] as const;

type MealFlag = (typeof MEAL_FLAGS)[number][0];

interface IngredientEntry {
  ingredientId: string;
  amount: number;
  unit: string;
}

interface MealFormProps {
  meal?: Meal & {
    mealTypes: MealType[];
    tags: Tag[];
    ingredients: (MealIngredient & { ingredient: Ingredient })[];
  };
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
  ingredientsList: IngredientEntry[];
}

export function MealForm({ meal, mealTypes, tags, onSubmit }: MealFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const [name, setName] = useState(meal?.name || "");
  const [description, setDescription] = useState(meal?.description || "");
  const [instructions, setInstructions] = useState(meal?.instructions || "");
  const [imageUrl, setImageUrl] = useState(meal?.imageUrl || "");
  const [servings, setServings] = useState(meal?.servings || 1);
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
  const [flags, setFlags] = useState<Record<MealFlag, boolean>>(() => ({
    isVegetarian: meal?.isVegetarian || false,
    isVegan: meal?.isVegan || false,
    isGlutenFree: meal?.isGlutenFree || false,
    isLactoseFree: meal?.isLactoseFree || false,
    isQuick: meal?.isQuick || false,
    isMealPrep: meal?.isMealPrep || false,
    isChildFriendly: meal?.isChildFriendly || false,
  }));
  const [selectedMealTypeIds, setSelectedMealTypeIds] = useState<string[]>(
    meal?.mealTypes.map((mt) => mt.id) || [],
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    meal?.tags.map((t) => t.id) || [],
  );
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(
    () =>
      meal?.ingredients.map((mi) =>
        newIngredientRow({
          ingredientId: mi.ingredientId,
          amount: mi.amount,
          unit: mi.unit,
        }),
      ) ?? [],
  );

  // Ingredients seen so far (the meal's own, search results, newly created),
  // by id. Rows read names and macros from here.
  const [knownIngredients, setKnownIngredients] = useState(
    () =>
      new Map<string, Ingredient>(
        meal?.ingredients.map((mi) => [mi.ingredientId, mi.ingredient]) ?? [],
      ),
  );

  const rememberIngredients = useCallback((found: Ingredient[]) => {
    if (found.length === 0) return;
    setKnownIngredients((prev) => {
      const next = new Map(prev);
      for (const ing of found) next.set(ing.id, ing);
      return next;
    });
  }, []);

  // Rows with a picked ingredient whose data is loaded.
  const ingredientLines = ingredientRows.flatMap((row) => {
    const ingredient = knownIngredients.get(row.ingredientId);
    return ingredient
      ? [{ amount: row.amount, unit: row.unit, ingredient }]
      : [];
  });

  const handleGenerateImage = async () => {
    if (!name.trim()) {
      toast.error("Najpierw podaj nazwę dania");
      return;
    }
    setGeneratingImage(true);
    try {
      const ingredientNames = ingredientLines.map((l) => l.ingredient.name);
      const { url } = unwrap(
        await generateMealImageAction({
          name,
          description: description || undefined,
          ingredientNames,
        }),
      );
      setImageUrl(url);
      toast.success("Zdjęcie wygenerowane");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie udało się wygenerować zdjęcia",
      );
    } finally {
      setGeneratingImage(false);
    }
  };

  // Fill the per-portion macro fields from the recipe's ingredients.
  const calculateNutrition = () => {
    const perPortion = roundNutrition(
      scaleNutrition(
        recipeNutrition(ingredientLines),
        1 / Math.max(1, servings || 1),
      ),
    );
    setCalories(perPortion.calories);
    setProtein(perPortion.protein);
    setCarbs(perPortion.carbs);
    setFat(perPortion.fat);
  };

  const hasIngredientsWithNutrition = ingredientLines.some(
    ({ ingredient: ing }) =>
      ing.caloriesPer100g ||
      ing.proteinPer100g ||
      ing.carbsPer100g ||
      ing.fatPer100g,
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
        ...flags,
        mealTypeIds: selectedMealTypeIds,
        tagIds: selectedTagIds,
        ingredientsList: ingredientRows
          .filter((row) => row.ingredientId)
          .map(({ rowKey: _rowKey, ...entry }) => entry),
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

          <div className="space-y-2">
            <ImageUpload
              label="Zdjęcie dania"
              value={imageUrl}
              onChange={setImageUrl}
              folder="meals"
              aspect="video"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerateImage}
              loading={generatingImage}
              disabled={!name.trim()}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Wygeneruj zdjęcie z AI
            </Button>
          </div>

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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">
              Wartości odżywcze (na porcję)
            </h2>
            {hasIngredientsWithNutrition && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={calculateNutrition}
              >
                <Calculator className="w-4 h-4 mr-1" />
                Oblicz ze składników
              </Button>
            )}
          </div>

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
              step="any"
            />
            <Input
              label="Węglowodany (g)"
              type="number"
              value={carbs}
              onChange={(e) => setCarbs(e.target.value)}
              min={0}
              step="any"
            />
            <Input
              label="Tłuszcze (g)"
              type="number"
              value={fat}
              onChange={(e) => setFat(e.target.value)}
              min={0}
              step="any"
            />
          </div>
        </CardContent>
      </Card>

      <MealIngredientsEditor
        rows={ingredientRows}
        onChange={setIngredientRows}
        knownIngredients={knownIngredients}
        onIngredientsSeen={rememberIngredients}
      />

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
                    ? "bg-orange-600 text-white dark:bg-orange-500"
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
            {MEAL_FLAGS.map(([flag, label]) => (
              <Checkbox
                key={flag}
                label={label}
                checked={flags[flag]}
                onChange={(e) =>
                  setFlags((prev) => ({ ...prev, [flag]: e.target.checked }))
                }
              />
            ))}
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
