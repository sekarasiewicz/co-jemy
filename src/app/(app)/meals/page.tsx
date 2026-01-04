import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { getMealsAction } from "@/app/actions/meals";
import { getMealTypesAction, getTagsAction } from "@/app/actions/tags";
import { Button } from "@/components/ui";
import { MealsList } from "./meals-list";

export default async function MealsPage() {
  const [meals, mealTypes, tags] = await Promise.all([
    getMealsAction(),
    getMealTypesAction(),
    getTagsAction(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dania</h1>
        </div>
        <div className="flex gap-2">
          <Link href="/meals/import">
            <Button variant="outline">
              <FileText className="w-4 h-4 mr-2" />
              Importuj
            </Button>
          </Link>
          <Link href="/meals/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj danie
            </Button>
          </Link>
        </div>
      </div>

      <MealsList meals={meals} mealTypes={mealTypes} tags={tags} />
    </div>
  );
}
