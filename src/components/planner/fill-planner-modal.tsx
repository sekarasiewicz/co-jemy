"use client";

import { Check, Shuffle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { fillPlannerAction } from "@/app/actions/daily-plans";
import { Button, Checkbox, Modal } from "@/components/ui";
import {
  FILL_RANGE_LABELS,
  type FillRange,
  getDaysForRange,
} from "@/lib/fill-range";
import { cn } from "@/lib/utils";
import type { MealType, RandomizerFilters } from "@/types";

interface FillPlannerModalProps {
  profileId: string;
  filters: RandomizerFilters;
  mealTypes: MealType[];
  title?: string;
  // Offer a link to /planner once done (off when already on the planner).
  showPlannerLink?: boolean;
  onFilled?: () => void;
  onClose: () => void;
}

// Randomly fills empty plan days in a range. Rendered only while open.
export function FillPlannerModal({
  profileId,
  filters,
  mealTypes,
  title = "Wypełnij planer",
  showPlannerLink = true,
  onFilled,
  onClose,
}: FillPlannerModalProps) {
  const [range, setRange] = useState<FillRange>("week");
  const [skipExisting, setSkipExisting] = useState(true);
  const [filling, setFilling] = useState(false);
  const [result, setResult] = useState<{
    daysFilledCount: number;
    mealsAddedCount: number;
  } | null>(null);

  const days = getDaysForRange(range);

  const handleFill = async () => {
    setFilling(true);
    try {
      const filled = await fillPlannerAction({
        profileId,
        days,
        filters,
        mealTypeIds: mealTypes.map((mt) => mt.id),
        skipExistingDays: skipExisting,
      });
      setResult(filled);
      toast.success(`Dodano ${filled.mealsAddedCount} posiłków do planera`);
      onFilled?.();
    } catch {
      toast.error("Nie udało się wypełnić planera");
    } finally {
      setFilling(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={title}>
      {result ? (
        <div className="space-y-4 text-center">
          <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-orange-500/10">
            <Check className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground">
              Dodano {result.mealsAddedCount} posiłków na{" "}
              {result.daysFilledCount} dni
            </p>
            {result.mealsAddedCount === 0 && (
              <p className="text-sm text-muted-foreground mt-1">
                Wszystkie dni w wybranym zakresie mają już posiłki lub brak dań
                spełniających kryteria.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            {showPlannerLink && (
              <Link href="/planner" className="flex-1">
                <Button variant="primary" className="w-full">
                  Przejdź do planera
                </Button>
              </Link>
            )}
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Zamknij
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="block text-sm font-medium text-foreground mb-2">
              Zakres dat
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(FILL_RANGE_LABELS) as [FillRange, string][]).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={range === value}
                    onClick={() => setRange(value)}
                    className={cn(
                      "p-3 rounded-lg border text-sm text-left transition-colors",
                      range === value
                        ? "border-orange-500 bg-orange-500/10 text-foreground"
                        : "border-border text-muted-foreground hover:border-orange-500/50",
                    )}
                  >
                    {label}
                  </button>
                ),
              )}
            </div>
          </div>

          <Checkbox
            label="Pomiń dni które już mają posiłki"
            checked={skipExisting}
            onChange={(e) => setSkipExisting(e.target.checked)}
          />

          <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
            Wylosuję posiłki na{" "}
            <span className="font-medium text-foreground">
              {days.length} dni
            </span>{" "}
            ({mealTypes.length} posiłków dziennie)
          </div>

          <Button
            onClick={handleFill}
            loading={filling}
            variant="primary"
            className="w-full"
          >
            <Shuffle className="w-4 h-4 mr-2" />
            Losuj i dodaj do planera
          </Button>
        </div>
      )}
    </Modal>
  );
}
