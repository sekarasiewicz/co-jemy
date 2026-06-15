"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { deleteShoppingListAction } from "@/app/actions/shopping";
import { Button, Modal } from "@/components/ui";

interface DeleteListButtonProps {
  listId: string;
  name: string;
  /** Where to go after deletion. Omit to just refresh the current page. */
  redirectTo?: string;
}

export function DeleteListButton({
  listId,
  name,
  redirectTo,
}: DeleteListButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteShoppingListAction(listId);
      toast.success("Lista zakupów usunięta");
      setIsOpen(false);
      if (redirectTo) {
        router.push(redirectTo);
      } else {
        router.refresh();
      }
    } catch {
      toast.error("Nie udało się usunąć listy");
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(true);
        }}
        title="Usuń listę"
      >
        <Trash2 className="w-4 h-4 text-destructive" />
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => !loading && setIsOpen(false)}
        title="Usuń listę zakupów"
      >
        <p className="text-muted-foreground mb-6">
          Czy na pewno chcesz usunąć listę{" "}
          <strong className="text-foreground">{name}</strong>? Tej operacji nie
          można cofnąć.
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={loading}
            className="flex-1"
          >
            Anuluj
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1"
          >
            {loading ? "Usuwanie..." : "Usuń"}
          </Button>
        </div>
      </Modal>
    </>
  );
}
