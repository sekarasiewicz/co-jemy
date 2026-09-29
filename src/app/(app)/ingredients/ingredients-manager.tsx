"use client";

import { GitMerge, Plus, Search, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  deleteIngredientAction,
  enrichIngredientAction,
} from "@/app/actions/ingredients";
import { Button, Card, CardContent, Input } from "@/components/ui";
import { unwrap } from "@/lib/action-result";
import { groupByCategory } from "@/lib/utils";
import type { Ingredient } from "@/types";
import { findDuplicateGroups } from "./ingredient-duplicates";
import { IngredientFormModal } from "./ingredient-form-modal";
import { IngredientRow } from "./ingredient-row";
import { MealFromIngredientModal } from "./meal-from-ingredient-modal";
import { MergeDuplicatesModal } from "./merge-duplicates-modal";
import { useBulkEnrich } from "./use-bulk-enrich";

interface IngredientsManagerProps {
  initialIngredients: Ingredient[];
}

// Which modal is open. The modals render only while open, so each opening
// starts with fresh state.
type OpenModal =
  | { kind: "form"; ingredient: Ingredient | null }
  | { kind: "merge" }
  | { kind: "meal"; ingredient: Ingredient }
  | null;

const isIncomplete = (ing: Ingredient) =>
  ing.caloriesPer100g == null &&
  ing.proteinPer100g == null &&
  ing.carbsPer100g == null &&
  ing.fatPer100g == null;

export function IngredientsManager({
  initialIngredients,
}: IngredientsManagerProps) {
  const [ingredients, setIngredients] =
    useState<Ingredient[]>(initialIngredients);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<OpenModal>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const bulkEnrich = useBulkEnrich(setIngredients);

  const incompleteCount = useMemo(
    () => ingredients.filter(isIncomplete).length,
    [ingredients],
  );
  const duplicateGroups = useMemo(
    () => findDuplicateGroups(ingredients),
    [ingredients],
  );

  const searchLower = search.toLowerCase();
  const filteredIngredients = ingredients.filter(
    (ing) =>
      ing.name.toLowerCase().includes(searchLower) ||
      ing.category.toLowerCase().includes(searchLower),
  );
  const categories = [...groupByCategory(filteredIngredients)].sort(
    ([a], [b]) => a.localeCompare(b, "pl"),
  );

  const replaceIngredient = (updated: Ingredient) =>
    setIngredients((prev) =>
      prev.some((i) => i.id === updated.id)
        ? prev.map((i) => (i.id === updated.id ? updated : i))
        : [...prev, updated],
    );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      unwrap(await deleteIngredientAction(id));
      setIngredients((prev) => prev.filter((ing) => ing.id !== id));
      toast.success("Składnik usunięty");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie można usunąć składnika",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleEnrich = async (ing: Ingredient) => {
    setEnrichingId(ing.id);
    try {
      replaceIngredient(unwrap(await enrichIngredientAction(ing.id)));
      toast.success(`Uzupełniono dane: ${ing.name}`);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie udało się uzupełnić danych",
      );
    } finally {
      setEnrichingId(null);
    }
  };

  const { progress } = bulkEnrich;

  return (
    <>
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj składników..."
            aria-label="Szukaj składników"
            className="pl-10"
          />
        </div>
        {duplicateGroups.length > 0 && (
          <Button variant="outline" onClick={() => setModal({ kind: "merge" })}>
            <GitMerge className="w-4 h-4 mr-2" />
            Scal duplikaty ({duplicateGroups.length})
          </Button>
        )}
        {incompleteCount > 0 && (
          <Button
            variant="outline"
            onClick={bulkEnrich.start}
            disabled={bulkEnrich.running}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Uzupełnij AI ({incompleteCount})
          </Button>
        )}
        <Button onClick={() => setModal({ kind: "form", ingredient: null })}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj składnik
        </Button>
      </div>

      {bulkEnrich.running && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-pulse text-orange-500" />
              Uzupełnianie danych AI...
            </span>
            <span>
              {progress.processed} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div
              className="bg-orange-500 h-2 rounded-full transition-all duration-300"
              style={{
                width:
                  progress.total > 0
                    ? `${(progress.processed / progress.total) * 100}%`
                    : "0%",
              }}
            />
          </div>
        </div>
      )}

      {filteredIngredients.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {search
                ? "Nie znaleziono składników"
                : "Nie masz jeszcze żadnych składników"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {categories.map(([category, items]) => (
            <Card key={category}>
              <CardContent className="pt-4">
                <h2 className="font-semibold text-foreground mb-3">
                  {category}{" "}
                  <span className="text-muted-foreground font-normal">
                    ({items.length})
                  </span>
                </h2>
                <div className="divide-y divide-border">
                  {[...items]
                    .sort((a, b) => a.name.localeCompare(b.name, "pl"))
                    .map((ing) => (
                      <IngredientRow
                        key={ing.id}
                        ingredient={ing}
                        enriching={enrichingId === ing.id}
                        deleting={deletingId === ing.id}
                        onEnrich={() => handleEnrich(ing)}
                        onMakeMeal={() =>
                          setModal({ kind: "meal", ingredient: ing })
                        }
                        onEdit={() =>
                          setModal({ kind: "form", ingredient: ing })
                        }
                        onDelete={() => handleDelete(ing.id)}
                      />
                    ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {modal?.kind === "form" && (
        <IngredientFormModal
          ingredient={modal.ingredient}
          onClose={() => setModal(null)}
          onSaved={replaceIngredient}
        />
      )}
      {modal?.kind === "merge" && (
        <MergeDuplicatesModal
          groups={duplicateGroups}
          onClose={() => setModal(null)}
          onMerged={(removedIds) =>
            setIngredients((prev) =>
              prev.filter((ing) => !removedIds.has(ing.id)),
            )
          }
        />
      )}
      {modal?.kind === "meal" && (
        <MealFromIngredientModal
          ingredient={modal.ingredient}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
