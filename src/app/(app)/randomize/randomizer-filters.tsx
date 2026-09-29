"use client";

import { Card, CardContent, Checkbox, Select } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MealType, RandomizerFilters, Tag } from "@/types";

const DIET_FLAGS = [
  ["isVegetarian", "Wegetariańskie"],
  ["isVegan", "Wegańskie"],
  ["isGlutenFree", "Bezglutenowe"],
  ["isLactoseFree", "Bez laktozy"],
  ["isQuick", "Szybkie"],
  ["isChildFriendly", "Dla dzieci"],
] as const;

type DietFlag = (typeof DIET_FLAGS)[number][0];

export type FilterState = Record<DietFlag, boolean> & {
  // "" = any meal type.
  mealTypeId: string;
  tagIds: string[];
};

export function initialFilterState(isChild: boolean): FilterState {
  return {
    mealTypeId: "",
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    isQuick: false,
    isChildFriendly: isChild,
    tagIds: [],
  };
}

// Diet and tag filters, without the meal type (callers pick it per slot).
export function toBaseFilters(
  state: FilterState,
): Omit<RandomizerFilters, "mealTypeId" | "excludeMealIds"> {
  const filters: Omit<RandomizerFilters, "mealTypeId" | "excludeMealIds"> = {
    tagIds: state.tagIds.length > 0 ? state.tagIds : undefined,
  };
  for (const [flag] of DIET_FLAGS) {
    if (state[flag]) filters[flag] = true;
  }
  return filters;
}

interface RandomizerFiltersCardProps {
  value: FilterState;
  onChange: (value: FilterState) => void;
  mealTypes: MealType[];
  tags: Tag[];
}

export function RandomizerFiltersCard({
  value,
  onChange,
  mealTypes,
  tags,
}: RandomizerFiltersCardProps) {
  const toggleTag = (id: string) =>
    onChange({
      ...value,
      tagIds: value.tagIds.includes(id)
        ? value.tagIds.filter((i) => i !== id)
        : [...value.tagIds, id],
    });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <h2 className="font-semibold text-foreground">Filtry</h2>

        <Select
          label="Typ posiłku"
          value={value.mealTypeId}
          onChange={(e) => onChange({ ...value, mealTypeId: e.target.value })}
          options={[
            { value: "", label: "Wszystkie" },
            ...mealTypes.map((mt) => ({ value: mt.id, label: mt.name })),
          ]}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {DIET_FLAGS.map(([flag, label]) => (
            <Checkbox
              key={flag}
              label={label}
              checked={value[flag]}
              onChange={(e) => onChange({ ...value, [flag]: e.target.checked })}
            />
          ))}
        </div>

        {tags.length > 0 && (
          <div>
            <p className="block text-sm font-medium text-foreground mb-2">
              Tagi
            </p>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={value.tagIds.includes(tag.id)}
                  onClick={() => toggleTag(tag.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-opacity",
                    value.tagIds.includes(tag.id)
                      ? "opacity-100 ring-2 ring-offset-2 ring-offset-background"
                      : "opacity-50 hover:opacity-75",
                  )}
                  style={{
                    backgroundColor: `${tag.color}20`,
                    color: tag.color,
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
