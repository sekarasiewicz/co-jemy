"use client";

import { Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  createIngredientAction,
  enrichByNameAction,
  generateIngredientImageAction,
  updateIngredientAction,
} from "@/app/actions/ingredients";
import { Button, ImageUpload, Input, Modal, Select } from "@/components/ui";
import { unwrap } from "@/lib/action-result";
import type { Ingredient } from "@/types";
import { INGREDIENT_CATEGORIES, UNITS } from "@/types";

interface IngredientFormData {
  name: string;
  category: string;
  image: string;
  defaultUnit: string;
  caloriesPer100g: string;
  proteinPer100g: string;
  carbsPer100g: string;
  fatPer100g: string;
  weightPerUnit: string;
}

function toForm(ingredient: Ingredient | null): IngredientFormData {
  return {
    name: ingredient?.name ?? "",
    category: ingredient?.category ?? "Inne",
    image: ingredient?.image || "",
    defaultUnit: ingredient?.defaultUnit || "g",
    caloriesPer100g: ingredient?.caloriesPer100g?.toString() || "",
    proteinPer100g: ingredient?.proteinPer100g?.toString() || "",
    carbsPer100g: ingredient?.carbsPer100g?.toString() || "",
    fatPer100g: ingredient?.fatPer100g?.toString() || "",
    weightPerUnit: ingredient?.weightPerUnit?.toString() || "",
  };
}

const optionalNumber = (value: string) => (value ? Number(value) : null);

interface IngredientFormModalProps {
  // The ingredient being edited, or null to add a new one.
  ingredient: Ingredient | null;
  onClose: () => void;
  onSaved: (saved: Ingredient) => void;
}

// Rendered only while open, so every opening starts from a fresh form.
export function IngredientFormModal({
  ingredient,
  onClose,
  onSaved,
}: IngredientFormModalProps) {
  const [form, setForm] = useState(() => toForm(ingredient));
  const [loading, setLoading] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const handleEnrich = async () => {
    setLoading(true);
    try {
      const enriched = unwrap(
        await enrichByNameAction(form.name.trim(), form.defaultUnit),
      );
      setForm((prev) => ({
        ...prev,
        caloriesPer100g: enriched.caloriesPer100g?.toString() || "",
        proteinPer100g: enriched.proteinPer100g?.toString() || "",
        carbsPer100g: enriched.carbsPer100g?.toString() || "",
        fatPer100g: enriched.fatPer100g?.toString() || "",
        weightPerUnit: enriched.weightPerUnit?.toString() || "",
      }));
      toast.success("Uzupełniono dane AI");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie udało się uzupełnić danych",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!form.name.trim()) {
      toast.error("Najpierw podaj nazwę składnika");
      return;
    }
    setGeneratingImage(true);
    try {
      const { url } = unwrap(
        await generateIngredientImageAction(form.name.trim()),
      );
      setForm((prev) => ({ ...prev, image: url }));
      toast.success("Zdjęcie wygenerowane");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie udało się wygenerować zdjęcia",
      );
    } finally {
      setGeneratingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    setLoading(true);
    try {
      const data = {
        name: form.name.trim(),
        category: form.category,
        image: form.image || null,
        defaultUnit: form.defaultUnit,
        caloriesPer100g: optionalNumber(form.caloriesPer100g),
        proteinPer100g: optionalNumber(form.proteinPer100g),
        carbsPer100g: optionalNumber(form.carbsPer100g),
        fatPer100g: optionalNumber(form.fatPer100g),
        weightPerUnit: optionalNumber(form.weightPerUnit),
      };

      if (ingredient) {
        onSaved(await updateIngredientAction(ingredient.id, data));
        toast.success("Składnik zaktualizowany");
      } else {
        onSaved(await createIngredientAction(data));
        toast.success("Składnik dodany");
      }
      onClose();
    } catch {
      toast.error("Wystąpił błąd");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {ingredient ? "Edytuj składnik" : "Nowy składnik"}
          </h2>
          <div className="flex items-center gap-2">
            {form.name.trim() && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEnrich}
                loading={loading}
                title="Uzupełnij dane AI"
                className="text-orange-600 hover:text-orange-700"
              >
                <Sparkles className="w-4 h-4" />
              </Button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <Input
          label="Nazwa"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="np. Pierś kurczaka"
          required
        />

        <div className="space-y-2">
          <ImageUpload
            label="Zdjęcie"
            value={form.image}
            onChange={(url) => setForm({ ...form, image: url })}
            folder="ingredients"
            aspect="square"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleGenerateImage}
            loading={generatingImage}
            disabled={!form.name.trim()}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Wygeneruj zdjęcie z AI
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 items-end">
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
            onChange={(e) => setForm({ ...form, defaultUnit: e.target.value })}
            options={UNITS.map((u) => ({ value: u, label: u }))}
          />
          <Input
            label="Waga 1 szt (g)"
            type="number"
            value={form.weightPerUnit}
            onChange={(e) =>
              setForm({ ...form, weightPerUnit: e.target.value })
            }
            min={0}
            step="any"
            placeholder="np. 60"
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
              onChange={(e) => setForm({ ...form, fatPer100g: e.target.value })}
              min={0}
              step={0.1}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            {ingredient ? "Zapisz" : "Dodaj"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
