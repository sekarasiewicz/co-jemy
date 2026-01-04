"use client";

import { useRouter } from "next/navigation";
import { createMealAction } from "@/app/actions/meals";
import { MealForm, type MealFormData } from "@/components/meals/meal-form";
import type { MealType, Tag } from "@/types";

interface NewMealFormProps {
  mealTypes: MealType[];
  tags: Tag[];
}

export function NewMealForm({ mealTypes, tags }: NewMealFormProps) {
  const router = useRouter();

  const handleSubmit = async (data: MealFormData) => {
    await createMealAction(data);
    router.push("/meals");
    router.refresh();
  };

  return <MealForm mealTypes={mealTypes} tags={tags} onSubmit={handleSubmit} />;
}
