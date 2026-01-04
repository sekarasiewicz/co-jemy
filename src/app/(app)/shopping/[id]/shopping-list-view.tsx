"use client";

import { Check, Home, ShoppingBag } from "lucide-react";
import { useState } from "react";
import { toggleShoppingItemAction } from "@/app/actions/shopping";
import { Card, CardContent } from "@/components/ui";
import { cn, groupByCategory } from "@/lib/utils";
import type { ShoppingListWithItems } from "@/types";

interface ShoppingListViewProps {
  list: ShoppingListWithItems;
}

export function ShoppingListView({ list: initialList }: ShoppingListViewProps) {
  const [list, setList] = useState(initialList);

  const handleToggle = async (
    itemId: string,
    field: "checked" | "inPantry",
  ) => {
    // Optimistic update
    setList((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === itemId ? { ...item, [field]: !item[field] } : item,
      ),
    }));

    try {
      await toggleShoppingItemAction(itemId, field);
    } catch {
      // Revert on error
      setList(initialList);
    }
  };

  const groupedItems = groupByCategory(list.items);
  const checkedCount = list.items.filter((item) => item.checked).length;
  const totalCount = list.items.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {checkedCount} z {totalCount} pozycji
        </span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Check className="w-4 h-4 text-emerald-500" />
            Kupione
          </span>
          <span className="flex items-center gap-1">
            <Home className="w-4 h-4 text-blue-500" />W domu
          </span>
        </div>
      </div>

      {list.items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ShoppingBag className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-muted-foreground">
              Lista jest pusta. Zaplanuj posiłki w planerze, aby wygenerować
              listę zakupów.
            </p>
          </CardContent>
        </Card>
      ) : (
        Array.from(groupedItems.entries()).map(([category, items]) => (
          <Card key={category}>
            <CardContent className="py-4">
              <h3 className="font-semibold text-foreground mb-3">{category}</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg transition-colors",
                      item.checked && "bg-emerald-500/10",
                      item.inPantry && "bg-blue-500/10",
                    )}
                  >
                    <button
                      onClick={() => handleToggle(item.id, "checked")}
                      className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                        item.checked
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-border hover:border-emerald-500",
                      )}
                    >
                      {item.checked && <Check className="w-4 h-4 text-white" />}
                    </button>

                    <div className="flex-1">
                      <span
                        className={cn(
                          "text-foreground",
                          (item.checked || item.inPantry) &&
                            "line-through text-muted-foreground",
                        )}
                      >
                        {item.ingredient?.name || item.customName}
                      </span>
                      {item.amount && item.unit && (
                        <span className="text-muted-foreground ml-2">
                          {item.amount} {item.unit}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => handleToggle(item.id, "inPantry")}
                      className={cn(
                        "p-1.5 rounded-lg transition-colors",
                        item.inPantry
                          ? "bg-blue-500 text-white"
                          : "text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10",
                      )}
                      title="Mam w domu"
                    >
                      <Home className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
