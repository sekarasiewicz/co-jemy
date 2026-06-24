import { getMealTypesAction } from "@/app/actions/tags";
import { TodayView } from "./today-view";

export default async function TodayPage() {
  const mealTypes = await getMealTypesAction();

  return <TodayView mealTypes={mealTypes} />;
}
