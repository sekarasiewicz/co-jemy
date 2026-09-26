import { getRecentIngredients, getRecentMeals } from "@/lib/services/admin";
import { AdminContent } from "./admin-content";
import { ensureAdminPage } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  await ensureAdminPage();
  const [meals, ingredients] = await Promise.all([
    getRecentMeals(50),
    getRecentIngredients(50),
  ]);

  return <AdminContent meals={meals} ingredients={ingredients} />;
}
