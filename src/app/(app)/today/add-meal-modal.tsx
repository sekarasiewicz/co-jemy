"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { searchMealsForTypeAction } from "@/app/actions/meals";
import { Badge, Button, Input, Modal } from "@/components/ui";
import type { MealSummary } from "@/lib/services/meals";
import type { MealType } from "@/types";

const PAGE_SIZE = 20;

interface AddMealModalProps {
  mealType: MealType | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (mealId: string) => Promise<void> | void;
}

export function AddMealModal({
  mealType,
  isOpen,
  onClose,
  onSelect,
}: AddMealModalProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<MealSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);

  const mealTypeId = mealType?.id ?? null;

  // Debounce the search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Reset state when the modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setDebouncedQuery("");
      setResults([]);
      setHasMore(false);
    }
  }, [isOpen]);

  // First page: on open, meal type change, or query change
  useEffect(() => {
    if (!isOpen || !mealTypeId) return;
    let cancelled = false;

    setLoading(true);
    searchMealsForTypeAction({
      mealTypeId,
      query: debouncedQuery,
      limit: PAGE_SIZE,
      offset: 0,
    })
      .then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, mealTypeId, debouncedQuery]);

  const loadMore = useCallback(async () => {
    if (!mealTypeId || loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const rows = await searchMealsForTypeAction({
        mealTypeId,
        query: debouncedQuery,
        limit: PAGE_SIZE,
        offset: results.length,
      });
      setResults((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [mealTypeId, debouncedQuery, results.length, hasMore, loadingMore, loading]);

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "120px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleSelect = async (mealId: string) => {
    setAdding(mealId);
    try {
      await onSelect(mealId);
    } finally {
      setAdding(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Dodaj ${mealType?.name || ""}`}
      size="lg"
    >
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Szukaj dania..."
            className="pl-9"
            autoFocus
          />
        </div>

        <div className="space-y-2 h-96 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
              Ładowanie...
            </div>
          ) : results.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-muted-foreground mb-4">
                {debouncedQuery
                  ? "Brak dań pasujących do wyszukiwania"
                  : "Brak dań dla tego typu posiłku"}
              </p>
              <Link href="/meals/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Dodaj nowe danie
                </Button>
              </Link>
            </div>
          ) : (
            <>
              {results.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  disabled={adding !== null}
                  onClick={() => handleSelect(meal.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-orange-500 hover:bg-orange-500/10 transition-colors text-left disabled:opacity-50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground break-words">
                      {meal.name}
                    </p>
                    <div className="flex gap-2 mt-1">
                      {meal.calories != null && (
                        <span className="text-xs text-muted-foreground">
                          {meal.calories} kcal
                        </span>
                      )}
                      {meal.isVegetarian && (
                        <Badge size="sm" variant="fit">
                          Wege
                        </Badge>
                      )}
                      {meal.isChildFriendly && (
                        <Badge size="sm" variant="info">
                          Dla dzieci
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
              <div ref={sentinelRef} />
              {loadingMore && (
                <div className="text-center py-2 text-muted-foreground text-xs">
                  Ładowanie...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
