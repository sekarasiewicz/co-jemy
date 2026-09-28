import { describe, expect, it } from "vitest";
import { parseIngredient } from "@/lib/markdown-parser";

describe("parseIngredient", () => {
  it.each([
    ["- 500g mielona wołowina", 500, "g", "mielona wołowina"],
    ["1/3 sztuki awokado", 1 / 3, "szt", "awokado"],
    ["1 1/2 łyżki oliwy", 1.5, "łyżka", "oliwy"],
    ["0,5 l mleka", 0.5, "l", "mleka"],
  ])("standard format: %s", (line, amount, unit, name) => {
    const parsed = parseIngredient(line);
    expect(parsed?.amount).toBeCloseTo(amount);
    expect(parsed?.unit).toBe(unit);
    expect(parsed?.name).toBe(name);
  });

  it("reversed format with a Polish mixed fraction", () => {
    const parsed = parseIngredient(
      "Chleb żytni razowy - 2 i 1/2 kromki (100g)",
    );
    expect(parsed?.name).toBe("Chleb żytni razowy");
    expect(parsed?.amount).toBeCloseTo(2.5);
  });

  it("reversed format with only a weight", () => {
    expect(parseIngredient("Warzywa na patelnię - (200g)")).toEqual({
      amount: 200,
      unit: "g",
      name: "Warzywa na patelnię",
    });
  });

  it("falls back to one piece when there is no amount", () => {
    expect(parseIngredient("sól do smaku")).toEqual({
      amount: 1,
      unit: "szt",
      name: "sól do smaku",
    });
  });
});
