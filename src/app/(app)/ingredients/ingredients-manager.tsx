"use client";

import { AlertTriangle, GitMerge, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  createIngredientAction,
  deleteIngredientAction,
  mergeIngredientsAction,
  updateIngredientAction,
} from "@/app/actions/ingredients";
import {
  Button,
  Card,
  CardContent,
  Input,
  Modal,
  Select,
} from "@/components/ui";
import type { Ingredient } from "@/types";
import { INGREDIENT_CATEGORIES, UNITS } from "@/types";

interface IngredientsManagerProps {
  initialIngredients: Ingredient[];
}

interface IngredientFormData {
  name: string;
  category: string;
  defaultUnit: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
}

interface DuplicateGroup {
  normalizedName: string;
  ingredients: Ingredient[];
  selectedTargetId: string;
}

const emptyForm: IngredientFormData = {
  name: "",
  category: "Inne",
  defaultUnit: "g",
  caloriesPer100g: "",
  proteinPer100g: "",
  carbsPer100g: "",
  fatPer100g: "",
};

function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();
  // Strip parenthetical weight/volume info like (5g), (ok. 200g), (15ml)
  normalized = normalized.replace(/\s*\((?:ok\.\s*)?\d+\s*(?:g|ml)\)\s*/gi, " ").trim();
  // Strip leading unit words that may have leaked into the name
  const unitWords = [
    "kostki", "kostek", "kostka",
    "garści", "garść",
    "szczypty", "szczypt", "szczypta",
    "listki", "listków", "listek",
    "gałązki", "gałązek", "gałązka",
    "łodygi", "łodyg", "łodyga",
    "puszki", "puszek", "puszka",
    "słoiki", "słoików", "słoik",
    "łyżki", "łyżek", "łyżka",
    "łyżeczki", "łyżeczek", "łyżeczka",
    "szklanki", "szklankę", "szklanka",
    "ząbki", "ząbków", "ząbek",
    "plastry", "plasterki", "plasterków", "plaster",
    "kromki", "kromek", "kromka",
    "pęczki", "pęczków", "pęczek",
    "opakowania", "opakowań", "opakowanie",
  ];
  for (const word of unitWords) {
    if (normalized.startsWith(word + " ")) {
      normalized = normalized.slice(word.length).trim();
      break;
    }
  }
  return normalized;
}

export function IngredientsManager({
  initialIngredients,
}: IngredientsManagerProps) {
  const [ingredients, setIngredients] =
    useState<Ingredient[]>(initialIngredients);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IngredientFormData>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const duplicateGroups = useMemo(() => {
    const groups = new Map<string, Ingredient[]>();
    for (const ing of ingredients) {
      const key = normalizeIngredientName(ing.name);
      const group = groups.get(key);
      if (group) {
        group.push(ing);
      } else {
        groups.set(key, [ing]);
      }
    }
    const result: DuplicateGroup[] = [];
    for (const [normalizedName, ings] of groups) {
      if (ings.length >= 2) {
        // Default target: shortest name (most likely the clean one)
        const sorted = [...ings].sort((a, b) => a.name.length - b.name.length);
        result.push({
          normalizedName,
          ingredients: ings,
          selectedTargetId: sorted[0].id,
        });
      }
    }
    return result.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName, "pl"));
  }, [ingredients]);

  const [mergeSelections, setMergeSelections] = useState<Record<string, string>>({});

  const getTargetId = (group: DuplicateGroup) =>
    mergeSelections[group.normalizedName] || group.selectedTargetId;

  const filteredIngredients = ingredients.filter(
    (ing) =>
      ing.name.toLowerCase().includes(search.toLowerCase()) ||
      ing.category.toLowerCase().includes(search.toLowerCase())
  );

  const groupedIngredients = filteredIngredients.reduce(
    (acc, ing) => {
      if (!acc[ing.category]) {
        acc[ing.category] = [];
      }
      acc[ing.category].push(ing);
      return acc;
    },
    {} as Record<string, Ingredient[]>
  );

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setIsModalOpen(true);
  };

  const openEditModal = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setForm({
      name: ingredient.name,
      category: ingredient.category,
      defaultUnit: ingredient.defaultUnit || "g",
      caloriesPer100g: ingredient.caloriesPer100g?.toString() || "",
      proteinPer100g: ingredient.proteinPer100g?.toString() || "",
      carbsPer100g: ingredient.carbsPer100g?.toString() || "",
      fatPer100g: ingredient.fatPer100g?.toString() || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openMergeModal = () => {
    setMergeSelections({});
    setIsMergeModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        defaultUnit: form.defaultUnit,
        caloriesPer100g: form.caloriesPer100g
          ? Number(form.caloriesPer100g)
          : undefined,
        proteinPer100g: form.proteinPer100g
          ? Number(form.proteinPer100g)
          : undefined,
        carbsPer100g: form.carbsPer100g
          ? Number(form.carbsPer100g)
          : undefined,
        fatPer100g: form.fatPer100g ? Number(form.fatPer100g) : undefined,
      };

      if (editingId) {
        const updated = await updateIngredientAction(editingId, data);
        setIngredients(
          ingredients.map((ing) => (ing.id === editingId ? updated : ing))
        );
        toast.success("Składnik zaktualizowany");
      } else {
        const created = await createIngredientAction(data);
        setIngredients([...ingredients, created]);
        toast.success("Składnik dodany");
      }
      closeModal();
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteIngredientAction(id);
      setIngredients(ingredients.filter((ing) => ing.id !== id));
      toast.success("Składnik usunięty");
    } catch {
      toast.error("Nie można usunąć składnika");
    } finally {
      setDeleting(null);
    }
  };

  const handleMerge = async () => {
    setMerging(true);
    let merged = 0;
    try {
      for (const group of duplicateGroups) {
        const targetId = getTargetId(group);
        const sourceIds = group.ingredients
          .filter((ing) => ing.id !== targetId)
          .map((ing) => ing.id);
        if (sourceIds.length === 0) continue;
        await mergeIngredientsAction(sourceIds, targetId);
        merged++;
      }
      // Remove merged-away ingredients from local state
      const allSourceIds = new Set<string>();
      for (const group of duplicateGroups) {
        const targetId = getTargetId(group);
        for (const ing of group.ingredients) {
          if (ing.id !== targetId) {
            allSourceIds.add(ing.id);
          }
        }
      }
      setIngredients(ingredients.filter((ing) => !allSourceIds.has(ing.id)));
      setIsMergeModalOpen(false);
      toast.success(`Scalono ${merged} grup duplikatów`);
    } catch {
      toast.error("Wystąpił błąd podczas scalania");
    } finally {
      setMerging(false);
    }
  };

  return (
    <>
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj składników..."
            className="pl-10"
          />
        </div>
        {duplicateGroups.length > 0 && (
          <Button variant="outline" onClick={openMergeModal}>
            <GitMerge className="w-4 h-4 mr-2" />
            Scal duplikaty ({duplicateGroups.length})
          </Button>
        )}
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Dodaj składnik
        </Button>
      </div>

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
          {Object.entries(groupedIngredients)
            .sort(([a], [b]) => a.localeCompare(b, "pl"))
            .map(([category, items]) => (
              <Card key={category}>
                <CardContent className="pt-4">
                  <h2 className="font-semibold text-foreground mb-3">
                    {category}{" "}
                    <span className="text-muted-foreground font-normal">
                      ({items.length})
                    </span>
                  </h2>
                  <div className="divide-y divide-border">
                    {items
                      .sort((a, b) => a.name.localeCompare(b.name, "pl"))
                      .map((ing) => (
                        <div
                          key={ing.id}
                          className="flex items-center gap-4 py-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">
                              {ing.name}
                            </p>
                            {(ing.caloriesPer100g ||
                              ing.proteinPer100g ||
                              ing.carbsPer100g ||
                              ing.fatPer100g) ? (
                              <p className="text-sm text-muted-foreground">
                                {ing.caloriesPer100g && (
                                  <span>{ing.caloriesPer100g} kcal</span>
                                )}
                                {ing.proteinPer100g && (
                                  <span className="ml-2">
                                    B: {ing.proteinPer100g}g
                                  </span>
                                )}
                                {ing.carbsPer100g && (
                                  <span className="ml-2">
                                    W: {ing.carbsPer100g}g
                                  </span>
                                )}
                                {ing.fatPer100g && (
                                  <span className="ml-2">
                                    T: {ing.fatPer100g}g
                                  </span>
                                )}
                                <span className="ml-1 text-muted-foreground/60">
                                  / 100{ing.defaultUnit || "g"}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                                <AlertTriangle className="w-3 h-3" />
                                Brak wartości odżywczych
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(ing)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(ing.id)}
                              loading={deleting === ing.id}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? "Edytuj składnik" : "Nowy składnik"}
            </h2>
            <button
              type="button"
              onClick={closeModal}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Input
            label="Nazwa"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="np. Pierś kurczaka"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Kategoria"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              options={INGREDIENT_CATEGORIES.map((c) => ({
                value: c,
                label: c,
              }))}
            />
            <Select
              label="Jednostka domyślna"
              value={form.defaultUnit}
              onChange={(e) =>
                setForm({ ...form, defaultUnit: e.target.value })
              }
              options={UNITS.map((u) => ({ value: u, label: u }))}
            />
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-3">
              Wartości odżywcze (na 100g)
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Kalorie (kcal)"
                type="number"
                value={form.caloriesPer100g}
                onChange={(e) =>
                  setForm({ ...form, caloriesPer100g: e.target.value })
                }
                min={0}
              />
              <Input
                label="Białko (g)"
                type="number"
                value={form.proteinPer100g}
                onChange={(e) =>
                  setForm({ ...form, proteinPer100g: e.target.value })
                }
                min={0}
                step={0.1}
              />
              <Input
                label="Węglowodany (g)"
                type="number"
                value={form.carbsPer100g}
                onChange={(e) =>
                  setForm({ ...form, carbsPer100g: e.target.value })
                }
                min={0}
                step={0.1}
              />
              <Input
                label="Tłuszcze (g)"
                type="number"
                value={form.fatPer100g}
                onChange={(e) =>
                  setForm({ ...form, fatPer100g: e.target.value })
                }
                min={0}
                step={0.1}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={closeModal}
              className="flex-1"
            >
              Anuluj
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              {editingId ? "Zapisz" : "Dodaj"}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">
              Scal duplikaty ({duplicateGroups.length} grup)
            </h2>
            <button
              type="button"
              onClick={() => setIsMergeModalOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-muted-foreground">
            Wybierz który składnik zachować w każdej grupie. Pozostałe zostaną
            scalone — ich powiązania z daniami i listami zakupów zostaną
            przeniesione.
          </p>

          <div className="max-h-[60vh] overflow-y-auto space-y-4">
            {duplicateGroups.map((group) => (
              <Card key={group.normalizedName}>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    &quot;{group.normalizedName}&quot;
                  </p>
                  <div className="space-y-2">
                    {group.ingredients.map((ing) => {
                      const targetId = getTargetId(group);
                      return (
                        <label
                          key={ing.id}
                          className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 hover:bg-muted/50"
                        >
                          <input
                            type="radio"
                            name={`merge-${group.normalizedName}`}
                            checked={targetId === ing.id}
                            onChange={() =>
                              setMergeSelections({
                                ...mergeSelections,
                                [group.normalizedName]: ing.id,
                              })
                            }
                            className="accent-emerald-600"
                          />
                          <span className="text-foreground">{ing.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({ing.category})
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setIsMergeModalOpen(false)}
              className="flex-1"
            >
              Anuluj
            </Button>
            <Button
              onClick={handleMerge}
              loading={merging}
              className="flex-1"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              Scal wybrane
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
