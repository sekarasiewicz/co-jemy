import { Calendar, Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { getProfilesAction } from "@/app/actions/profiles";
import { getShoppingListsAction } from "@/app/actions/shopping";
import { Button, Card, CardContent } from "@/components/ui";
import { formatDateShort } from "@/lib/utils";
import { GenerateListButton } from "./generate-list-button";

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
            <Link key={list.id} href={`/shopping/${list.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {list.name}
                      </h3>
                      {list.dateFrom && list.dateTo && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Calendar className="w-4 h-4" />
                          {formatDateShort(new Date(list.dateFrom))} -{" "}
                          {formatDateShort(new Date(list.dateTo))}
                        </p>
                      )}
                    </div>
                    <ShoppingCart className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
