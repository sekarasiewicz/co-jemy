import { ShoppingCart } from "lucide-react";
import { getProfilesAction } from "@/app/actions/profiles";
import { getShoppingListsAction } from "@/app/actions/shopping";
import { Card, CardContent } from "@/components/ui";
import { GenerateListButton } from "./generate-list-button";
import { ShoppingListRow } from "./shopping-list-row";

export default async function ShoppingPage() {
  const [lists, profiles] = await Promise.all([
    getShoppingListsAction(),
    getProfilesAction(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Listy zakupów</h1>
          <p className="text-muted-foreground">
            Generuj listy na podstawie zaplanowanych posiłków
          </p>
        </div>
        <GenerateListButton profiles={profiles} />
      </div>

      {lists.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingCart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Nie masz jeszcze żadnych list zakupów.
            </p>
            <p className="text-sm text-muted-foreground/70">
              Zaplanuj posiłki w planerze, a następnie wygeneruj listę zakupów.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => (
            <ShoppingListRow key={list.id} list={list} />
          ))}
        </div>
      )}
    </div>
  );
}
