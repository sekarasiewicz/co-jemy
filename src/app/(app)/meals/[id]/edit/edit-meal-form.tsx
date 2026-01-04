"use client";

import { useRouter } from "next/navigation";
import { updateMealAction } from "@/app/actions/meals";
import { MealForm, type MealFormData } from "@/components/meals/meal-form";
import type { Ingredient, MealType, MealWithRelations, Tag } from "@/types";

interface EditMealFormProps {
  meal: MealWithRelations;
  mealTypes: MealType[];
  tags: Tag[];
  ingredients: Ingredient[];
}

export function EditMealForm({
  meal,
  mealTypes,
  tags,
  ingredients,
}: EditMealFormProps) {
  const router = useRouter();

  const handleSubmit = async (data: MealFormData) => {
    await updateMealAction(meal.id, data);
    router.push(`/meals/${meal.id}`);
    router.refresh();
  };

  return (
    <MealForm
      meal={meal}
      mealTypes={mealTypes}
      tags={tags}
      ingredients={ingredients}
      onSubmit={handleSubmit}
    />
  );
}
