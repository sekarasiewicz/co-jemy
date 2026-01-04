import { Plus } from "lucide-react";
import Link from "next/link";
import { getMealsAction } from "@/app/actions/meals";
import { MealCard } from "@/components/meals/meal-card";
import { Button } from "@/components/ui";

export default async function MealsPage() {
  const meals = await getMealsAction();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dania</h1>
          <p className="text-muted-foreground">
            {meals.length} {meals.length === 1 ? "danie" : "dań"} w kolekcji
          </p>
        </div>
        <Link href="/meals/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Dodaj danie
          </Button>
        </Link>
      </div>

      {meals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            Nie masz jeszcze żadnych dań. Dodaj swoje pierwsze!
          </p>
          <Link href="/meals/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Dodaj pierwsze danie
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
