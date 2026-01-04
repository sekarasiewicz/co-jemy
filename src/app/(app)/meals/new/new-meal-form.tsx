"use client";

import { useRouter } from "next/navigation";
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
    await createMealAction(data);
    router.push("/meals");
    router.refresh();
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
