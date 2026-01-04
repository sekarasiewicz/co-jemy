"use client";

import { Filter, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { MealCard } from "@/components/meals/meal-card";
import { Badge, Button, Checkbox, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { MealType, MealWithRelations, Tag } from "@/types";

interface MealsListProps {
  meals: MealWithRelations[];
  mealTypes: MealType[];
  tags: Tag[];
}

export function MealsList({ meals, mealTypes, tags }: MealsListProps) {
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedMealTypeIds, setSelectedMealTypeIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    isQuick: false,
    isChildFriendly: false,
  });

  const activeFiltersCount =
    selectedMealTypeIds.length +
    selectedTagIds.length +
    Object.values(filters).filter(Boolean).length;

  const filteredMeals = meals.filter((meal) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const matchesName = meal.name.toLowerCase().includes(searchLower);
      const matchesDescription = meal.description
        ?.toLowerCase()
        .includes(searchLower);
      const matchesTags = meal.tags.some((t) =>
        t.name.toLowerCase().includes(searchLower)
      );
      const matchesIngredients = meal.ingredients.some((i) =>
        i.ingredient.name.toLowerCase().includes(searchLower)
      );
      if (
        !matchesName &&
        !matchesDescription &&
        !matchesTags &&
        !matchesIngredients
      ) {
        return false;
      }
    }

    // Meal type filter
    if (selectedMealTypeIds.length > 0) {
      const hasMealType = meal.mealTypes.some((mt) =>
        selectedMealTypeIds.includes(mt.id)
      );
      if (!hasMealType) return false;
    }

    // Tag filter
    if (selectedTagIds.length > 0) {
      const hasTag = meal.tags.some((t) => selectedTagIds.includes(t.id));
      if (!hasTag) return false;
    }

    // Boolean filters
    if (filters.isVegetarian && !meal.isVegetarian) return false;
    if (filters.isVegan && !meal.isVegan) return false;
    if (filters.isGlutenFree && !meal.isGlutenFree) return false;
    if (filters.isLactoseFree && !meal.isLactoseFree) return false;
    if (filters.isQuick && !meal.isQuick) return false;
    if (filters.isChildFriendly && !meal.isChildFriendly) return false;

    return true;
  });

  const toggleMealType = (id: string) => {
    setSelectedMealTypeIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleTag = (id: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const clearFilters = () => {
    setSelectedMealTypeIds([]);
    setSelectedTagIds([]);
    setFilters({
      isVegetarian: false,
      isVegan: false,
      isGlutenFree: false,
      isLactoseFree: false,
      isQuick: false,
      isChildFriendly: false,
    });
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj dań, składników, tagów..."
            className="pl-10"
          />
        </div>
        <Button
          variant={showFilters ? "primary" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="w-4 h-4 mr-2" />
          Filtry
          {activeFiltersCount > 0 && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-white/20 rounded">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </div>

      {showFilters && (
        <div className="mb-6 p-4 bg-muted/50 rounded-lg space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Filtry</span>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Wyczyść
              </button>
            )}
          </div>

          {mealTypes.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Typ posiłku</p>
              <div className="flex flex-wrap gap-2">
                {mealTypes.map((mt) => (
                  <button
                    key={mt.id}
                    onClick={() => toggleMealType(mt.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-colors",
                      selectedMealTypeIds.includes(mt.id)
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {mt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Checkbox
              label="Wegetariańskie"
              checked={filters.isVegetarian}
              onChange={(e) =>
                setFilters({ ...filters, isVegetarian: e.target.checked })
              }
            />
            <Checkbox
              label="Wegańskie"
              checked={filters.isVegan}
              onChange={(e) =>
                setFilters({ ...filters, isVegan: e.target.checked })
              }
            />
            <Checkbox
              label="Bezglutenowe"
              checked={filters.isGlutenFree}
              onChange={(e) =>
                setFilters({ ...filters, isGlutenFree: e.target.checked })
              }
            />
            <Checkbox
              label="Bez laktozy"
              checked={filters.isLactoseFree}
              onChange={(e) =>
                setFilters({ ...filters, isLactoseFree: e.target.checked })
              }
            />
            <Checkbox
              label="Szybkie"
              checked={filters.isQuick}
              onChange={(e) =>
                setFilters({ ...filters, isQuick: e.target.checked })
              }
            />
            <Checkbox
              label="Dla dzieci"
              checked={filters.isChildFriendly}
              onChange={(e) =>
                setFilters({ ...filters, isChildFriendly: e.target.checked })
              }
            />
          </div>

          {tags.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tagi</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-opacity",
                      selectedTagIds.includes(tag.id)
                        ? "opacity-100 ring-2 ring-offset-2 ring-offset-background"
                        : "opacity-50 hover:opacity-75"
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
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4">
        {filteredMeals.length === meals.length
          ? `${meals.length} ${meals.length === 1 ? "danie" : "dań"} w kolekcji`
          : `${filteredMeals.length} z ${meals.length} dań`}
      </p>

      {filteredMeals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {meals.length === 0
              ? "Nie masz jeszcze żadnych dań. Dodaj swoje pierwsze!"
              : "Nie znaleziono dań pasujących do filtrów"}
          </p>
          {meals.length === 0 && (
            <Link href="/meals/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Dodaj pierwsze danie
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeals.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  );
}
