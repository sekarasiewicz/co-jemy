"use client";

import {
  AlertTriangle,
  ImageIcon,
  Pencil,
  Sparkles,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui";
import type { Ingredient } from "@/types";

interface IngredientRowProps {
  ingredient: Ingredient;
  enriching: boolean;
  deleting: boolean;
  onEnrich: () => void;
  onMakeMeal: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function IngredientRow({
  ingredient: ing,
  enriching,
  deleting,
  onEnrich,
  onMakeMeal,
  onEdit,
  onDelete,
}: IngredientRowProps) {
  const hasNutrition =
    ing.caloriesPer100g ||
    ing.proteinPer100g ||
    ing.carbsPer100g ||
    ing.fatPer100g;

  return (
    <div className="flex items-center gap-4 py-3">
      {ing.image ? (
        <Image
          src={ing.image}
          alt={ing.name}
          width={44}
          height={44}
          className="h-11 w-11 flex-shrink-0 rounded-lg object-cover border border-border"
        />
      ) : (
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground/50">
          <ImageIcon className="h-5 w-5" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{ing.name}</p>
        {hasNutrition ? (
          <p className="text-sm text-muted-foreground">
            {ing.caloriesPer100g && <span>{ing.caloriesPer100g} kcal</span>}
            {ing.proteinPer100g && (
              <span className="ml-2">B: {ing.proteinPer100g}g</span>
            )}
            {ing.carbsPer100g && (
              <span className="ml-2">W: {ing.carbsPer100g}g</span>
            )}
            {ing.fatPer100g && (
              <span className="ml-2">T: {ing.fatPer100g}g</span>
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
          onClick={onEnrich}
          loading={enriching}
          title="Uzupełnij dane AI"
          aria-label={`Uzupełnij dane AI: ${ing.name}`}
          className="text-orange-600 hover:text-orange-700"
        >
          <Sparkles className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onMakeMeal}
          title="Zrób z tego danie"
          aria-label={`Zrób danie: ${ing.name}`}
          className="text-sky-600 hover:text-sky-700"
        >
          <UtensilsCrossed className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label={`Edytuj: ${ing.name}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          loading={deleting}
          aria-label={`Usuń: ${ing.name}`}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
