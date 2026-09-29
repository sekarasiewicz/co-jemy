"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createMealFromIngredientAction } from "@/app/actions/meal-ai";
import { Button, Input, Modal } from "@/components/ui";
import { unwrap } from "@/lib/action-result";
import type { Ingredient } from "@/types";

interface MealFromIngredientModalProps {
  ingredient: Ingredient;
  onClose: () => void;
}

export function MealFromIngredientModal({
  ingredient,
  onClose,
}: MealFromIngredientModalProps) {
  const [name, setName] = useState(ingredient.name);
  const [converting, setConverting] = useState(false);

  const handleConfirm = async () => {
    setConverting(true);
    try {
      const meal = unwrap(
        await createMealFromIngredientAction(
          ingredient.id,
          name.trim() || undefined,
        ),
      );
      toast.success(`Utworzono danie: ${meal.name}`);
      onClose();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Nie udało się utworzyć dania",
      );
    } finally {
      setConverting(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !converting && onClose()}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">
          Zrób danie ze składnika
        </h2>
        <p className="text-sm text-muted-foreground">
          Powstanie danie (1 porcja, typ „Przekąska") z wartościami odżywczymi
          tego składnika. Nazwę możesz zmienić.
        </p>
        <Input
          label="Nazwa dania"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="np. Baton proteinowy"
          required
        />
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={converting}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            loading={converting}
            disabled={!name.trim()}
            className="flex-1"
          >
            Utwórz danie
          </Button>
        </div>
      </div>
    </Modal>
  );
}
