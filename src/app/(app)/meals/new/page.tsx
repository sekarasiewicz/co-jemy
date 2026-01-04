import { getIngredientsAction } from "@/app/actions/ingredients";
import { getMealTypesAction, getTagsAction } from "@/app/actions/tags";
import { NewMealForm } from "./new-meal-form";

export default async function NewMealPage() {
  const [mealTypes, tags, ingredients] = await Promise.all([
    getMealTypesAction(),
    getTagsAction(),
    getIngredientsAction(),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Nowe danie</h1>
      <NewMealForm mealTypes={mealTypes} tags={tags} ingredients={ingredients} />
    </div>
  );
}
