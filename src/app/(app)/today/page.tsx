import { getMealsAction } from "@/app/actions/meals";
import { getMealTypesAction } from "@/app/actions/tags";
import { TodayView } from "./today-view";

export default async function TodayPage() {
  const [mealTypes, meals] = await Promise.all([
    getMealTypesAction(),
    getMealsAction(),
  ]);

  return <TodayView mealTypes={mealTypes} meals={meals} />;
}
