import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMealAction } from "@/app/actions/meals";
import { getMealTypesAction, getTagsAction } from "@/app/actions/tags";
import { EditMealForm } from "./edit-meal-form";

export default async function EditMealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [meal, mealTypes, tags] = await Promise.all([
    getMealAction(id),
    getMealTypesAction(),
    getTagsAction(),
  ]);

  if (!meal) {
    notFound();
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link
        href={`/meals/${id}`}
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Powrót do dania
      </Link>

      <h1 className="text-2xl font-bold text-foreground mb-6">Edytuj danie</h1>

      <EditMealForm meal={meal} mealTypes={mealTypes} tags={tags} />
    </div>
  );
}
