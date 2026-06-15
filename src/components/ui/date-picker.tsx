"use client";

import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // yyyy-mm-dd
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const MONTHS = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

const MONTHS_GENITIVE = [
  "stycznia",
  "lutego",
  "marca",
  "kwietnia",
  "maja",
  "czerwca",
  "lipca",
  "sierpnia",
  "września",
  "października",
  "listopada",
  "grudnia",
];

const WEEKDAYS = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseIso(value: string): { year: number; month: number; day: number } {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
      day: now.getDate(),
    };
  }
  return { year: y, month: m - 1, day: d };
}

/** Monday-based weekday index (0 = Monday ... 6 = Sunday). */
function mondayIndex(jsDay: number): number {
  return (jsDay + 6) % 7;
}

export function DatePicker({
  value,
  onChange,
  label,
  className,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = parseIso(value);
  const [viewYear, setViewYear] = useState(selected.year);
  const [viewMonth, setViewMonth] = useState(selected.month);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep the visible month in sync when the value changes externally.
  useEffect(() => {
    setViewYear(selected.year);
    setViewMonth(selected.month);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const firstDayOffset = mondayIndex(new Date(viewYear, viewMonth, 1).getDay());
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelect = (day: number) => {
    onChange(toIso(viewYear, viewMonth, day));
    setIsOpen(false);
  };

  const displayValue = `${selected.day} ${MONTHS_GENITIVE[selected.month]} ${selected.year}`;

  return (
    <div className={cn("w-full", className)} ref={containerRef}>
      {label && (
        <span className="block text-sm font-medium text-foreground mb-1">
          {label}
        </span>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((o) => !o)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2 border rounded-lg bg-background text-foreground border-input",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
          )}
        >
          <span>{displayValue}</span>
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </button>

        {isOpen && (
          <div className="absolute z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-background p-3 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Poprzedni miesiąc"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium text-foreground">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Następny miesiąc"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="text-center text-xs font-medium text-muted-foreground py-1"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, i) => {
                if (day === null) {
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed blank cells
                  return <div key={`blank-${i}`} />;
                }
                const isSelected =
                  day === selected.day &&
                  viewMonth === selected.month &&
                  viewYear === selected.year;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => handleSelect(day)}
                    className={cn(
                      "h-9 rounded-md text-sm transition-colors",
                      isSelected
                        ? "bg-emerald-500 text-white font-medium hover:bg-emerald-600"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
