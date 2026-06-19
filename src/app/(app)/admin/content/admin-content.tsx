"use client";

import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import {
  adminDeleteIngredientAction,
  adminDeleteMealAction,
} from "@/app/actions/admin";
import { Card, CardContent } from "@/components/ui";
import type { AdminContentMeal } from "@/lib/services/admin";

function ContentList({
  title,
  items,
  onDelete,
  linkBase,
}: {
  title: string;
  items: AdminContentMeal[];
  onDelete: (id: string) => Promise<void>;
  linkBase?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [list, setList] = useState(items);

  const handle = async (id: string) => {
    setBusy(id);
    try {
      await onDelete(id);
      setList((prev) => prev.filter((i) => i.id !== id));
      toast.success("Usunięto");
    } catch (e) {
      toast.error((e as Error).message || "Nie udało się usunąć");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <h2 className="border-b border-border px-4 py-3 font-semibold text-foreground">
          {title}{" "}
          <span className="font-normal text-muted-foreground">
            ({list.length})
          </span>
        </h2>
        <div className="divide-y divide-border">
          {list.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Brak
            </p>
          ) : (
            list.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate font-medium text-foreground">
                    {linkBase ? (
                      <Link
                        href={`${linkBase}/${item.id}`}
                        className="truncate hover:text-primary"
                      >
                        {item.name}
                      </Link>
                    ) : (
                      item.name
                    )}
                    {linkBase && (
                      <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground/50" />
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.ownerEmail ?? "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handle(item.id)}
                  disabled={busy === item.id}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminContent({
  meals,
  ingredients,
}: {
  meals: AdminContentMeal[];
  ingredients: AdminContentMeal[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2 items-start">
      <ContentList
        title="Ostatnie dania"
        items={meals}
        onDelete={adminDeleteMealAction}
        linkBase="/meals"
      />
      <ContentList
        title="Ostatnie składniki"
        items={ingredients}
        onDelete={adminDeleteIngredientAction}
      />
    </div>
  );
}
