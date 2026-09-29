"use client";

import { GitMerge, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { mergeIngredientsAction } from "@/app/actions/ingredients";
import { Button, Card, CardContent, Modal } from "@/components/ui";
import type { DuplicateGroup } from "./ingredient-duplicates";

interface MergeDuplicatesModalProps {
  groups: DuplicateGroup[];
  onClose: () => void;
  // Ids of the ingredients merged away into the kept ones.
  onMerged: (removedIds: Set<string>) => void;
}

export function MergeDuplicatesModal({
  groups,
  onClose,
  onMerged,
}: MergeDuplicatesModalProps) {
  // Picked ingredient to keep, per group; unset groups keep their default.
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [merging, setMerging] = useState(false);

  const targetIdOf = (group: DuplicateGroup) =>
    selections[group.normalizedName] || group.defaultTargetId;

  const handleMerge = async () => {
    setMerging(true);
    const removedIds = new Set<string>();
    let merged = 0;
    try {
      for (const group of groups) {
        const targetId = targetIdOf(group);
        const sourceIds = group.ingredients
          .filter((ing) => ing.id !== targetId)
          .map((ing) => ing.id);
        if (sourceIds.length === 0) continue;
        await mergeIngredientsAction(sourceIds, targetId);
        for (const id of sourceIds) removedIds.add(id);
        merged++;
      }
      toast.success(`Scalono ${merged} grup duplikatów`);
      onMerged(removedIds);
      onClose();
    } catch {
      // Groups merged before the failure are already gone on the server.
      if (removedIds.size > 0) onMerged(removedIds);
      toast.error("Wystąpił błąd podczas scalania");
    } finally {
      setMerging(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            Scal duplikaty ({groups.length} grup)
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Zamknij"
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
          {groups.map((group) => (
            <Card key={group.normalizedName}>
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  &quot;{group.normalizedName}&quot;
                </p>
                <div className="space-y-2">
                  {group.ingredients.map((ing) => (
                    <label
                      key={ing.id}
                      className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2 hover:bg-muted/50"
                    >
                      <input
                        type="radio"
                        name={`merge-${group.normalizedName}`}
                        checked={targetIdOf(group) === ing.id}
                        onChange={() =>
                          setSelections({
                            ...selections,
                            [group.normalizedName]: ing.id,
                          })
                        }
                        className="accent-orange-600"
                      />
                      <span className="text-foreground">{ing.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({ing.category})
                      </span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Anuluj
          </Button>
          <Button onClick={handleMerge} loading={merging} className="flex-1">
            <GitMerge className="w-4 h-4 mr-2" />
            Scal wybrane
          </Button>
        </div>
      </div>
    </Modal>
  );
}
