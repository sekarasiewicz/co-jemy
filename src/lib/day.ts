import { UserError } from "@/lib/action-result";

/**
 * Calendar days as "YYYY-MM-DD" keys — the format of the `date` columns.
 *
 * A day is a calendar date, not an instant: keys are built from the user's
 * local date in the browser and compared as plain strings on the server, so
 * the server's timezone never shifts a plan to another day.
 */
export type DayKey = string;

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isDayKey(value: unknown): value is DayKey {
  if (typeof value !== "string" || !DAY_KEY_RE.test(value)) return false;
  return toDayKey(parseDayKey(value)) === value;
}

/** Throws on anything that isn't a real calendar day (runtime input check). */
export function assertDayKey(value: unknown): DayKey {
  if (!isDayKey(value)) {
    throw new UserError("Nieprawidłowa data");
  }
  return value;
}

/** Local calendar date of `date` as a key. */
export function toDayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Key → local Date at noon (safe for display and day arithmetic). */
export function parseDayKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function todayKey(): DayKey {
  return toDayKey(new Date());
}

export function addDays(key: DayKey, days: number): DayKey {
  const date = parseDayKey(key);
  date.setDate(date.getDate() + days);
  return toDayKey(date);
}

/** Monday of the week containing `key`. */
export function startOfWeek(key: DayKey): DayKey {
  const mondayIndex = (parseDayKey(key).getDay() + 6) % 7;
  return addDays(key, -mondayIndex);
}
