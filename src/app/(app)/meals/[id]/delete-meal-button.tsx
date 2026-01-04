"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteMealAction } from "@/app/actions/meals";
import { Button, Modal } from "@/components/ui";

interface DeleteMealButtonProps {
  mealId: string;
  mealName: string;
}

export function DeleteMealButton({ mealId, mealName }: DeleteMealButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteMealAction(mealId);
      toast.success("Danie usunięte");
      router.push("/meals");
      router.refresh();
    } catch {
      toast.error("Nie udało się usunąć dania");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        <Trash2 className="w-4 h-4 text-red-500" />
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Usuń danie"
      >
        <p className="text-muted-foreground mb-6">
          Czy na pewno chcesz usunąć danie <strong>{mealName}</strong>? Tej
          operacji nie można cofnąć.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={loading}
            className="flex-1"
          >
            Usuń
          </Button>
        </div>
      </Modal>
    </>
  );
}
