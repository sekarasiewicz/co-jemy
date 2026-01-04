import { getMealsAction } from "@/app/actions/meals";
import { getMealTypesAction } from "@/app/actions/tags";
import { WeekPlanner } from "./week-planner";

export default async function PlannerPage() {
  const [mealTypes, meals] = await Promise.all([
    getMealTypesAction(),
    getMealsAction(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Planer posiłków</h1>
        <p className="text-muted-foreground">Zaplanuj posiłki na cały tydzień</p>
      </div>

      <WeekPlanner mealTypes={mealTypes} meals={meals} />
    </div>
  );
}
