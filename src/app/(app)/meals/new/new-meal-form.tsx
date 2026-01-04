"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createMealAction } from "@/app/actions/meals";
import { MealForm, type MealFormData } from "@/components/meals/meal-form";
import type { Ingredient, MealType, Tag } from "@/types";

interface NewMealFormProps {
  mealTypes: MealType[];
  tags: Tag[];
  ingredients: Ingredient[];
}

export function NewMealForm({ mealTypes, tags, ingredients }: NewMealFormProps) {
  const router = useRouter();

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
    <MealForm
      mealTypes={mealTypes}
      tags={tags}
      ingredients={ingredients}
      onSubmit={handleSubmit}
    />
  );
}
