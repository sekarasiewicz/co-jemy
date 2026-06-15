"use client";

import { Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui";
import { formatDateShort } from "@/lib/utils";
import type { ShoppingList } from "@/types";
import { DeleteListButton } from "./delete-list-button";

export function ShoppingListRow({ list }: { list: ShoppingList }) {
  const router = useRouter();

  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/shopping/${list.id}`)}
    >
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-foreground">{list.name}</h3>
            {list.dateFrom && list.dateTo && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Calendar className="w-4 h-4" />
                {formatDateShort(new Date(list.dateFrom))} -{" "}
                {formatDateShort(new Date(list.dateTo))}
              </p>
            )}
          </div>
          <DeleteListButton listId={list.id} name={list.name} />
        </div>
      </CardContent>
    </Card>
  );
}
