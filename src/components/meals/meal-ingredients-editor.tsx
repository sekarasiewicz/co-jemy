"use client";

import { Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import {
  createIngredientAction,
  searchIngredientsAction,
} from "@/app/actions/ingredients";
import {
  Button,
  Card,
  CardContent,
  Combobox,
  Input,
  Select,
} from "@/components/ui";
import type { Ingredient } from "@/types";
import { UNITS } from "@/types";

export interface IngredientRow {
  // Stable React key, so removing a row doesn't shift the comboboxes' state
  // onto the rows below it.
  rowKey: string;
  ingredientId: string;
  amount: number;
  unit: string;
}

export function newIngredientRow(
  entry: Omit<IngredientRow, "rowKey"> = {
    ingredientId: "",
    amount: 100,
    unit: "g",
  },
): IngredientRow {
  return { ...entry, rowKey: crypto.randomUUID() };
}

interface MealIngredientsEditorProps {
  rows: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
  // Ingredients loaded so far, by id: rows read their names from here.
  knownIngredients: Map<string, Ingredient>;
  // Reports ingredients found by a search or just created.
  onIngredientsSeen: (ingredients: Ingredient[]) => void;
}

// The recipe's ingredient rows. The combobox searches ingredients on the
// server instead of loading the whole list.
export function MealIngredientsEditor({
  rows,
  onChange,
  knownIngredients,
  onIngredientsSeen,
}: MealIngredientsEditorProps) {
  const searchOptions = useCallback(
    async (query: string) => {
      const found = await searchIngredientsAction(query);
      onIngredientsSeen(found);
      return found.map((ing) => ({ value: ing.id, label: ing.name }));
    },
    [onIngredientsSeen],
  );

  const createIngredient = async (name: string) => {
    const created = await createIngredientAction({ name, category: "Inne" });
    onIngredientsSeen([created]);
    return { value: created.id, label: created.name };
  };

  const updateRow = (index: number, changes: Partial<IngredientRow>) =>
    onChange(
      rows.map((row, i) => (i === index ? { ...row, ...changes } : row)),
    );

  const pickIngredient = (index: number, ingredientId: string) =>
    updateRow(index, {
      ingredientId,
      unit: knownIngredients.get(ingredientId)?.defaultUnit || rows[index].unit,
    });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Składniki</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange([...rows, newIngredientRow()])}
          >
            <Plus className="w-4 h-4 mr-1" />
            Dodaj składnik
          </Button>
        </div>

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Kliknij "Dodaj składnik", aby dodać składniki do dania.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row, index) => (
              <div
                key={row.rowKey}
                className="flex items-center gap-2 p-3 rounded-lg bg-muted/50"
              >
                <div className="flex-1">
                  <Combobox
                    value={row.ingredientId}
                    onChange={(value) => pickIngredient(index, value)}
                    onCreateNew={createIngredient}
                    onSearch={searchOptions}
                    selectedLabel={knownIngredients.get(row.ingredientId)?.name}
                    placeholder="Wpisz nazwę składnika..."
                  />
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    aria-label="Ilość"
                    value={row.amount}
                    onChange={(e) =>
                      updateRow(index, { amount: Number(e.target.value) })
                    }
                    min={0}
                    step="any"
                  />
                </div>
                <div className="w-24">
                  <Select
                    aria-label="Jednostka"
                    value={row.unit}
                    onChange={(e) => updateRow(index, { unit: e.target.value })}
                    options={UNITS.map((u) => ({ value: u, label: u }))}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onChange(rows.filter((_, i) => i !== index))}
                  aria-label="Usuń składnik"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
