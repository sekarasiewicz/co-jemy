"use client";

import { useState } from "react";
import { toast } from "sonner";
import { swapDailyPlansAction } from "@/app/actions/daily-plans";
import { Button, DatePicker, Modal } from "@/components/ui";
import { addDays, type DayKey } from "@/lib/day";

interface SwapDayModalProps {
  profileId: string;
  day: DayKey;
  dayLabel: string;
  onSwapped: () => void;
  onClose: () => void;
}

// Swaps the plans of `day` and a picked day. Rendered only while open.
export function SwapDayModal({
  profileId,
  day,
  dayLabel,
  onSwapped,
  onClose,
}: SwapDayModalProps) {
  const [otherDay, setOtherDay] = useState(() => addDays(day, 1));
  const [swapping, setSwapping] = useState(false);

  const handleSwap = async () => {
    if (!otherDay) return;
    setSwapping(true);
    try {
      await swapDailyPlansAction({ profileId, dayA: day, dayB: otherDay });
      toast.success("Zamieniono dni");
      onSwapped();
      onClose();
    } catch {
      toast.error("Nie udało się zamienić dni");
    } finally {
      setSwapping(false);
    }
  };

  return (
    <Modal isOpen onClose={() => !swapping && onClose()} title="Zamień dzień">
      <p className="text-muted-foreground mb-4">
        Plan z <strong className="text-foreground">{dayLabel}</strong> zostanie
        zamieniony miejscami z wybranym dniem.
      </p>
      <DatePicker
        label="Zamień z dniem"
        value={otherDay}
        onChange={setOtherDay}
        className="mb-6"
      />
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={swapping}
          className="flex-1"
        >
          Anuluj
        </Button>
        <Button
          onClick={handleSwap}
          disabled={swapping || !otherDay}
          className="flex-1"
        >
          {swapping ? "Zamiana..." : "Zamień"}
        </Button>
      </div>
    </Modal>
  );
}
