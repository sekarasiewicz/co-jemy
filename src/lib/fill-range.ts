import { addDays, type DayKey, startOfWeek, todayKey } from "@/lib/day";

export type FillRange = "week" | "next-week" | "2weeks" | "month";

export const FILL_RANGE_LABELS: Record<FillRange, string> = {
  week: "Ten tydzień (pon-nd)",
  "next-week": "Następny tydzień",
  "2weeks": "Najbliższe 2 tygodnie",
  month: "Miesiąc (30 dni)",
};

function daysFrom(start: DayKey, count: number): DayKey[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

/** Days the "fill planner" action covers for a range, starting from today. */
export function getDaysForRange(range: FillRange): DayKey[] {
  const today = todayKey();
  const monday = startOfWeek(today);

  switch (range) {
    case "week": {
      // From today to the end of this week (Sunday).
      const sunday = addDays(monday, 6);
      return daysFrom(today, daysBetween(today, sunday) + 1);
    }
    case "next-week":
      return daysFrom(addDays(monday, 7), 7);
    case "2weeks":
      return daysFrom(today, 14);
    case "month":
      return daysFrom(today, 30);
  }
}

function daysBetween(from: DayKey, to: DayKey): number {
  let count = 0;
  for (let day = from; day < to; day = addDays(day, 1)) count++;
  return count;
}
