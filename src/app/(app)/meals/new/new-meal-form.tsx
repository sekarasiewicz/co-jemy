"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { MealDraft } from "@/app/actions/meal-ai";
import { createMealAction } from "@/app/actions/meals";
import { MealForm, type MealFormData } from "@/components/meals/meal-form";
import type { Ingredient, Meal, MealIngredient, MealType, Tag } from "@/types";
import { AiMealGenerator } from "./ai-meal-generator";
import { ProductImporter } from "./product-importer";

interface NewMealFormProps {
  mealTypes: MealType[];
  tags: Tag[];
  ingredients: Ingredient[];
}

type DraftMeal = Meal & {
  mealTypes: MealType[];
  tags: Tag[];
  ingredients: (MealIngredient & { ingredient: Ingredient })[];
};

export function NewMealForm({
  mealTypes,
  tags,
  ingredients,
}: NewMealFormProps) {
  const router = useRouter();
  // Ingredients created by AI extraction get merged in so the form can label
  // and calculate with them.
  const [extraIngredients, setExtraIngredients] = useState<Ingredient[]>([]);
  const [draft, setDraft] = useState<DraftMeal | undefined>(undefined);
  // Remounts MealForm so its useState re-initialises from the new draft.
  const [draftKey, setDraftKey] = useState(0);

  const allIngredients = [...ingredients, ...extraIngredients];

  const handleDraft = (d: MealDraft) => {
    const merged = [...extraIngredients];
    for (const ing of d.newIngredients) {
      if (!merged.some((m) => m.id === ing.id)) merged.push(ing);
    }
    setExtraIngredients(merged);

    const lookup = [...ingredients, ...merged];
    const ingredientEntries = d.ingredients
      .map((e) => {
        const ingredient = lookup.find((i) => i.id === e.ingredientId);
        if (!ingredient) return null;
        return {
          id: `draft-${e.ingredientId}`,
          mealId: "",
          ingredientId: e.ingredientId,
          amount: e.amount,
          unit: e.unit,
          ingredient,
        };
      })
      .filter((e): e is MealIngredient & { ingredient: Ingredient } =>
        Boolean(e),
      );

    setDraft({
      id: "",
      userId: "",
      name: d.name,
      description: d.description || null,
      instructions: d.instructions || null,
      imageUrl: null,
      servings: d.servings,
      prepTimeMinutes: d.prepTimeMinutes,
      cookTimeMinutes: d.cookTimeMinutes,
      calories: d.calories || null,
      protein: d.protein || null,
      carbs: d.carbs || null,
      fat: d.fat || null,
      isVegetarian: d.isVegetarian,
      isVegan: d.isVegan,
      isGlutenFree: d.isGlutenFree,
      isLactoseFree: d.isLactoseFree,
      isQuick: d.isQuick,
      isMealPrep: d.isMealPrep,
      isChildFriendly: d.isChildFriendly,
      createdAt: new Date(),
      updatedAt: new Date(),
      mealTypes: mealTypes.filter((mt) => d.mealTypeIds.includes(mt.id)),
      tags: [],
      ingredients: ingredientEntries,
    });
    setDraftKey((k) => k + 1);
  };

  const handleSubmit = async (data: MealFormData) => {
    try {
      await createMealAction(data);
      toast.success("Danie dodane");
      router.push("/meals");
      router.refresh();
    } catch {
      toast.error("Nie udało się dodać dania");
      throw new Error("Failed to create meal");
    }
  };

  return (
    <div className="space-y-6">
      <AiMealGenerator onDraft={handleDraft} />
      <ProductImporter onDraft={handleDraft} />
      <MealForm
        key={draftKey}
        meal={draft}
        mealTypes={mealTypes}
        tags={tags}
        ingredients={allIngredients}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
