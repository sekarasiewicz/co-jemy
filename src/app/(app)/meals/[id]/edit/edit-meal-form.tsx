"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateMealAction } from "@/app/actions/meals";
import { MealForm, type MealFormData } from "@/components/meals/meal-form";
import type { MealType, MealWithRelations, Tag } from "@/types";

interface EditMealFormProps {
  meal: MealWithRelations;
  mealTypes: MealType[];
  tags: Tag[];
}

export function EditMealForm({ meal, mealTypes, tags }: EditMealFormProps) {
  const router = useRouter();

  const handleSubmit = async (data: MealFormData) => {
    try {
      await updateMealAction(meal.id, data);
      toast.success("Zmiany zapisane");
      router.push(`/meals/${meal.id}`);
      router.refresh();
    } catch {
      toast.error("Nie udało się zapisać zmian");
      throw new Error("Nie udało się zapisać zmian");
    }
  };

  return (
    <MealForm
      meal={meal}
      mealTypes={mealTypes}
      tags={tags}
      onSubmit={handleSubmit}
    />
  );
}
