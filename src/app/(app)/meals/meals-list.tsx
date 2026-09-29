"use client";

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { MealCard } from "@/components/meals/meal-card";
import { Button, Checkbox, Input } from "@/components/ui";
import {
  hasMealListFilters,
  MEAL_FLAGS,
  type MealFlag,
  type MealListQuery,
  mealListSearch,
} from "@/lib/meal-list-query";
import type { MealListPage } from "@/lib/services/meals";
import { cn } from "@/lib/utils";
import type { MealType, Tag } from "@/types";

interface MealsListProps {
  list: MealListPage;
  query: MealListQuery;
  mealTypes: MealType[];
  tags: Tag[];
}

const EMPTY_QUERY: MealListQuery = {
  q: "",
  mealTypeIds: [],
  tagIds: [],
  flags: [],
  page: 1,
};

function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item)
    ? items.filter((i) => i !== item)
    : [...items, item];
}

// Filters live in the URL; the server filters and paginates. Changing a
// filter replaces the URL and the page re-renders with the new results.
export function MealsList({ list, query, mealTypes, tags }: MealsListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(query.q);
  const [showFilters, setShowFilters] = useState(false);

  const navigate = (next: MealListQuery) => {
    startTransition(() => {
      router.replace(`/meals${mealListSearch(next)}`, { scroll: false });
    });
  };

  // Changing a filter starts again from page 1.
  const applyFilters = (changes: Partial<MealListQuery>) =>
    navigate({ ...query, ...changes, page: 1 });

  // Debounced search: typing updates the URL after a short pause.
  useEffect(() => {
    const q = search.trim();
    if (q === query.q) return;
    const timer = setTimeout(() => {
      startTransition(() => {
        router.replace(`/meals${mealListSearch({ ...query, q, page: 1 })}`, {
          scroll: false,
        });
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query, router]);

  const activeFiltersCount =
    query.mealTypeIds.length + query.tagIds.length + query.flags.length;

  const clearFilters = () => {
    setSearch("");
    navigate(EMPTY_QUERY);
  };

  const pageHref = (page: number) =>
    `/meals${mealListSearch({ ...query, page })}`;

  return (
    <div>
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Szukaj dań, składników, tagów..."
            aria-label="Szukaj dań"
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
            {hasMealListFilters(query) && (
              <button
                type="button"
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
                    type="button"
                    key={mt.id}
                    aria-pressed={query.mealTypeIds.includes(mt.id)}
                    onClick={() =>
                      applyFilters({
                        mealTypeIds: toggle(query.mealTypeIds, mt.id),
                      })
                    }
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-colors",
                      query.mealTypeIds.includes(mt.id)
                        ? "bg-orange-600 text-white"
                        : "bg-muted text-muted-foreground hover:bg-muted/80",
                    )}
                  >
                    {mt.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(MEAL_FLAGS) as MealFlag[]).map((flag) => (
              <Checkbox
                key={flag}
                label={MEAL_FLAGS[flag].label}
                checked={query.flags.includes(flag)}
                onChange={() =>
                  applyFilters({ flags: toggle(query.flags, flag) })
                }
              />
            ))}
          </div>

          {tags.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Tagi</p>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    type="button"
                    key={tag.id}
                    aria-pressed={query.tagIds.includes(tag.id)}
                    onClick={() =>
                      applyFilters({ tagIds: toggle(query.tagIds, tag.id) })
                    }
                    className={cn(
                      "px-3 py-1 rounded-full text-sm transition-opacity",
                      query.tagIds.includes(tag.id)
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
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-4">
        {list.total === list.totalAll
          ? `${list.totalAll} ${list.totalAll === 1 ? "danie" : "dań"} w kolekcji`
          : `${list.total} z ${list.totalAll} dań`}
      </p>

      <div
        aria-busy={isPending}
        className={cn("transition-opacity", isPending && "opacity-60")}
      >
        {list.meals.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {list.totalAll === 0
                ? "Nie masz jeszcze żadnych dań. Dodaj swoje pierwsze!"
                : "Nie znaleziono dań pasujących do filtrów"}
            </p>
            {list.totalAll === 0 && (
              <Link href="/meals/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj pierwsze danie
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {list.meals.map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        )}
      </div>

      {list.pageCount > 1 && (
        <nav
          aria-label="Strony listy dań"
          className="mt-8 flex items-center justify-center gap-4"
        >
          {list.page > 1 ? (
            <Link
              href={pageHref(list.page - 1)}
              className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary"
            >
              <ChevronLeft className="w-4 h-4" />
              Poprzednia
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground/50">
              <ChevronLeft className="w-4 h-4" />
              Poprzednia
            </span>
          )}
          <span className="text-sm text-muted-foreground">
            Strona {list.page} z {list.pageCount}
          </span>
          {list.page < list.pageCount ? (
            <Link
              href={pageHref(list.page + 1)}
              className="inline-flex items-center gap-1 text-sm text-foreground hover:text-primary"
            >
              Następna
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground/50">
              Następna
              <ChevronRight className="w-4 h-4" />
            </span>
          )}
        </nav>
      )}
    </div>
  );
}
