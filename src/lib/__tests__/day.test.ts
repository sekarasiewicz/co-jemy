import { describe, expect, it } from "vitest";
import {
  addDays,
  assertDayKey,
  isDayKey,
  parseDayKey,
  startOfWeek,
  toDayKey,
} from "@/lib/day";

describe("day keys", () => {
  it("formats the local calendar date, also right after midnight", () => {
    expect(toDayKey(new Date(2026, 8, 28, 0, 30))).toBe("2026-09-28");
    expect(toDayKey(new Date(2026, 8, 28, 23, 59))).toBe("2026-09-28");
  });

  it("round-trips through parseDayKey", () => {
    expect(toDayKey(parseDayKey("2024-02-29"))).toBe("2024-02-29");
  });

  it("adds days across month, year and DST boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("starts the week on Monday, also on Sunday", () => {
    expect(startOfWeek("2026-09-27")).toBe("2026-09-21"); // Sunday
    expect(startOfWeek("2026-09-28")).toBe("2026-09-28"); // Monday
    expect(startOfWeek("2026-10-03")).toBe("2026-09-28"); // Saturday
  });

  it("rejects malformed and impossible dates", () => {
    expect(isDayKey("2026-02-30")).toBe(false);
    expect(isDayKey("2026-9-1")).toBe(false);
    expect(isDayKey("2026-09-28T00:00:00Z")).toBe(false);
    expect(isDayKey(20260928)).toBe(false);
    expect(() => assertDayKey("nope")).toThrow("Nieprawidłowa data");
  });
});
