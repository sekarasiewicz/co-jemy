"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { generateShoppingListAction } from "@/app/actions/shopping";
import { ProfileAvatar } from "@/components/profiles/profile-avatar";
import { Button, Checkbox, Input, Modal } from "@/components/ui";
import type { Profile } from "@/types";

interface GenerateListButtonProps {
  profiles: Profile[];
}

export function GenerateListButton({ profiles }: GenerateListButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("Lista zakupów");
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>(
    profiles.map((p) => p.id),
  );
  const [dateFrom, setDateFrom] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [dateTo, setDateTo] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split("T")[0];
  });

  const toggleProfile = (id: string) => {
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProfileIds.length === 0) return;

    setLoading(true);

    try {
      const list = await generateShoppingListAction({
        profileIds: selectedProfileIds,
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
        name,
      });

      toast.success("Lista zakupów wygenerowana");
      router.push(`/shopping/${list.id}`);
      router.refresh();
    } catch {
      toast.error("Nie udało się wygenerować listy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Generuj listę
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Generuj listę zakupów"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nazwa listy"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Dla kogo?
            </label>
            <div className="space-y-2">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  onClick={() => toggleProfile(profile.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedProfileIds.includes(profile.id)
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <ProfileAvatar
                    name={profile.name}
                    avatar={profile.avatar}
                    color={profile.color}
                    size="sm"
                  />
                  <span className="font-medium text-foreground">
                    {profile.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Od dnia"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              required
            />
            <Input
              label="Do dnia"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              loading={loading}
              disabled={selectedProfileIds.length === 0}
              className="flex-1"
            >
              Generuj
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
