"use client";

import { Calculator, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createIngredientAction } from "@/app/actions/ingredients";
import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Combobox,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
  Ingredient,
  Meal,
  MealIngredient,
  MealType,
  Tag,
} from "@/types";
import { UNITS } from "@/types";

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
  ingredients: Ingredient[];
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

export function MealForm({
  meal,
  mealTypes,
  tags,
  ingredients,
  onSubmit,
}: MealFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
  const [selectedIngredients, setSelectedIngredients] = useState<
    IngredientEntry[]
  >(
    meal?.ingredients.map((mi) => ({
      ingredientId: mi.ingredientId,
      amount: mi.amount,
      unit: mi.unit,
    })) || [],
  );

  // Keep track of available ingredients (can grow when user creates new ones)
  const [availableIngredients, setAvailableIngredients] =
    useState<Ingredient[]>(ingredients);

  const ingredientOptions = availableIngredients.map((ing) => ({
    value: ing.id,
    label: ing.name,
  }));

  const addIngredient = () => {
    setSelectedIngredients([
      ...selectedIngredients,
      {
        ingredientId: "",
        amount: 100,
        unit: "g",
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const updateIngredientField = (
    index: number,
    field: keyof IngredientEntry,
    value: string | number,
  ) => {
    setSelectedIngredients(
      selectedIngredients.map((ing, i) => {
        if (i === index) {
          if (field === "ingredientId") {
            const newIng = availableIngredients.find((ig) => ig.id === value);
            return {
              ...ing,
              ingredientId: String(value),
              unit: newIng?.defaultUnit || ing.unit,
            };
          }
          if (field === "amount") {
            return { ...ing, amount: Number(value) };
          }
          return { ...ing, unit: String(value) };
        }
        return ing;
      }),
    );
  };

  const handleCreateIngredient = async (name: string) => {
    const newIngredient = await createIngredientAction({
      name,
      category: "Inne",
    });
    setAvailableIngredients([...availableIngredients, newIngredient]);
    return { value: newIngredient.id, label: newIngredient.name };
  };

  // Calculate nutritional values from ingredients
  const calculateNutrition = () => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let hasData = false;

    for (const si of selectedIngredients) {
      if (!si.ingredientId) continue;

      const ingredient = availableIngredients.find(
        (ing) => ing.id === si.ingredientId,
      );
      if (!ingredient) continue;

      // Convert amount to grams for calculation
      let amountInGrams = si.amount;
      if (si.unit === "kg") {
        amountInGrams = si.amount * 1000;
      } else if (si.unit !== "g") {
        // Skip non-gram units for now (can't accurately convert)
        continue;
      }

      const multiplier = amountInGrams / 100;

      if (ingredient.caloriesPer100g) {
        totalCalories += ingredient.caloriesPer100g * multiplier;
        hasData = true;
      }
      if (ingredient.proteinPer100g) {
        totalProtein += ingredient.proteinPer100g * multiplier;
        hasData = true;
      }
      if (ingredient.carbsPer100g) {
        totalCarbs += ingredient.carbsPer100g * multiplier;
        hasData = true;
      }
      if (ingredient.fatPer100g) {
        totalFat += ingredient.fatPer100g * multiplier;
        hasData = true;
      }
    }

    if (!hasData) {
      return;
    }

    // Calculate per serving
    const perServing = servings || 1;
    setCalories(Math.round(totalCalories / perServing));
    setProtein(Math.round((totalProtein / perServing) * 10) / 10);
    setCarbs(Math.round((totalCarbs / perServing) * 10) / 10);
    setFat(Math.round((totalFat / perServing) * 10) / 10);
  };

  const hasIngredientsWithNutrition = selectedIngredients.some((si) => {
    const ing = availableIngredients.find((i) => i.id === si.ingredientId);
    return (
      ing &&
      (ing.caloriesPer100g ||
        ing.proteinPer100g ||
        ing.carbsPer100g ||
        ing.fatPer100g)
    );
  });

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
        ingredientsList: selectedIngredients.filter((si) => si.ingredientId),
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
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Składniki</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addIngredient}
            >
              <Plus className="w-4 h-4 mr-1" />
              Dodaj składnik
            </Button>
          </div>

          {selectedIngredients.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Kliknij "Dodaj składnik", aby dodać składniki do dania.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedIngredients.map((si, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1">
                    <Combobox
                      value={si.ingredientId}
                      onChange={(value) =>
                        updateIngredientField(index, "ingredientId", value)
                      }
                      onCreateNew={handleCreateIngredient}
                      options={ingredientOptions}
                      placeholder="Wpisz nazwę składnika..."
                    />
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      value={si.amount}
                      onChange={(e) =>
                        updateIngredientField(
                          index,
                          "amount",
                          Number(e.target.value),
                        )
                      }
                      min={0}
                      step={0.1}
                    />
                  </div>
                  <div className="w-24">
                    <Select
                      value={si.unit}
                      onChange={(e) =>
                        updateIngredientField(index, "unit", e.target.value)
                      }
                      options={UNITS.map((u) => ({ value: u, label: u }))}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
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
