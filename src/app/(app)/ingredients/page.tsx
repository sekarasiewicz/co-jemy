import { getIngredientsAction } from "@/app/actions/ingredients";
import { IngredientsManager } from "./ingredients-manager";

export default async function IngredientsPage() {
  const ingredients = await getIngredientsAction();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Składniki</h1>
        <p className="text-muted-foreground">
          Zarządzaj składnikami i ich wartościami odżywczymi
        </p>
      </div>

      <IngredientsManager initialIngredients={ingredients} />
    </div>
  );
}
