"use client";

import { Modal } from "@/components/ui";
import { addDays, parseDayKey, todayKey } from "@/lib/day";
import { cn } from "@/lib/utils";

function dayLabel(date: Date, index: number): string {
  if (index === 0) return "Dziś";
  if (index === 1) return "Jutro";
  return date.toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

interface DayPickerModalProps {
  title: string;
  // Called with the picked day's key (YYYY-MM-DD).
  onPick: (day: string) => void;
  onClose: () => void;
}

// Today plus the next 7 days. Rendered only while open.
export function DayPickerModal({
  title,
  onPick,
  onClose,
}: DayPickerModalProps) {
  const today = todayKey();
  const days = Array.from({ length: 8 }, (_, i) => addDays(today, i));

  return (
    <Modal isOpen onClose={onClose} title={title}>
      <div className="space-y-2">
        {days.map((day, index) => {
          const date = parseDayKey(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              className={cn(
                "w-full p-3 rounded-lg border text-left transition-colors",
                "hover:border-orange-500 hover:bg-orange-500/10",
                index === 0 && "border-orange-500 bg-orange-500/10",
              )}
            >
              <span className="font-medium text-foreground capitalize">
                {dayLabel(date, index)}
              </span>
              {index > 1 && (
                <span className="text-muted-foreground ml-2">
                  ({date.getDate()}.
                  {(date.getMonth() + 1).toString().padStart(2, "0")})
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
