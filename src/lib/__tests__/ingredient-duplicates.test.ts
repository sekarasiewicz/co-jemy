import { describe, expect, it } from "vitest";
import {
  findDuplicateGroups,
  normalizeIngredientName,
} from "@/app/(app)/ingredients/ingredient-duplicates";
import type { Ingredient } from "@/types";

const ing = (id: string, name: string) => ({ id, name }) as Ingredient;

describe("normalizeIngredientName", () => {
  it("drops weights in parentheses and leading unit words", () => {
    expect(normalizeIngredientName("Masło (ok. 10g)")).toBe("masło");
    expect(normalizeIngredientName("ząbki czosnku")).toBe("czosnku");
    expect(normalizeIngredientName("  Mleko ")).toBe("mleko");
  });
});

describe("findDuplicateGroups", () => {
  it("groups same-name ingredients and keeps the shortest name", () => {
    const groups = findDuplicateGroups([
      ing("1", "Masło (10g)"),
      ing("2", "Mleko"),
      ing("3", "masło"),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].normalizedName).toBe("masło");
    expect(groups[0].defaultTargetId).toBe("3");
    expect(groups[0].ingredients.map((i) => i.id)).toEqual(["1", "3"]);
  });
});
