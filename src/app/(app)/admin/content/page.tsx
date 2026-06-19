import { getRecentIngredients, getRecentMeals } from "@/lib/services/admin";
import { AdminContent } from "./admin-content";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const [meals, ingredients] = await Promise.all([
    getRecentMeals(50),
    getRecentIngredients(50),
  ]);

  return <AdminContent meals={meals} ingredients={ingredients} />;
}
