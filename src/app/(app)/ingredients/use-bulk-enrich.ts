"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getIngredientsAction } from "@/app/actions/ingredients";
import type { Ingredient } from "@/types";

export interface BulkEnrichProgress {
  processed: number;
  total: number;
}

// Runs the streamed bulk AI enrichment (/api/ingredients/enrich, SSE) and
// hands back the refreshed ingredient list when it finishes.
export function useBulkEnrich(onDone: (ingredients: Ingredient[]) => void) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<BulkEnrichProgress>({
    processed: 0,
    total: 0,
  });

  const start = async () => {
    setRunning(true);
    setProgress({ processed: 0, total: 0 });

    try {
      const response = await fetch("/api/ingredients/enrich", {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Błąd serwera");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Brak strumienia");

      const decoder = new TextDecoder();
      let buffer = "";
      let event = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            event = line.slice(7);
          } else if (line.startsWith("data: ")) {
            const data = JSON.parse(line.slice(6));
            if (event === "start") {
              setProgress({ processed: 0, total: data.total });
            } else if (event === "progress" || event === "complete") {
              setProgress({ processed: data.processed, total: data.total });
            }
          }
        }
      }

      onDone(await getIngredientsAction());
      toast.success("Uzupełniono dane składników");
    } catch {
      toast.error("Wystąpił błąd podczas uzupełniania");
    } finally {
      setRunning(false);
    }
  };

  return { running, progress, start };
}
