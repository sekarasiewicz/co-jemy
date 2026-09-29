import type { Ingredient } from "@/types";

export interface DuplicateGroup {
  normalizedName: string;
  ingredients: Ingredient[];
  // Default ingredient to keep: the shortest name, most likely the clean one.
  defaultTargetId: string;
}

export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();
  // Strip parenthetical weight/volume info like (5g), (ok. 200g), (15ml)
  normalized = normalized
    .replace(/\s*\((?:ok\.\s*)?\d+\s*(?:g|ml)\)\s*/gi, " ")
    .trim();
  // Strip leading unit words that may have leaked into the name
  const unitWords = [
    "kostki",
    "kostek",
    "kostka",
    "garści",
    "garść",
    "szczypty",
    "szczypt",
    "szczypta",
    "listki",
    "listków",
    "listek",
    "gałązki",
    "gałązek",
    "gałązka",
    "łodygi",
    "łodyg",
    "łodyga",
    "puszki",
    "puszek",
    "puszka",
    "słoiki",
    "słoików",
    "słoik",
    "łyżki",
    "łyżek",
    "łyżka",
    "łyżeczki",
    "łyżeczek",
    "łyżeczka",
    "szklanki",
    "szklankę",
    "szklanka",
    "ząbki",
    "ząbków",
    "ząbek",
    "plastry",
    "plasterki",
    "plasterków",
    "plaster",
    "kromki",
    "kromek",
    "kromka",
    "pęczki",
    "pęczków",
    "pęczek",
    "opakowania",
    "opakowań",
    "opakowanie",
  ];
  for (const word of unitWords) {
    if (normalized.startsWith(`${word} `)) {
      normalized = normalized.slice(word.length).trim();
      break;
    }
  }
  return normalized;
}

// Ingredients whose names normalise to the same text, sorted by that text.
export function findDuplicateGroups(
  ingredients: Ingredient[],
): DuplicateGroup[] {
  const groups = new Map<string, Ingredient[]>();
  for (const ing of ingredients) {
    const key = normalizeIngredientName(ing.name);
    const group = groups.get(key);
    if (group) {
      group.push(ing);
    } else {
      groups.set(key, [ing]);
    }
  }
  const result: DuplicateGroup[] = [];
  for (const [normalizedName, ings] of groups) {
    if (ings.length >= 2) {
      const shortest = [...ings].sort((a, b) => a.name.length - b.name.length);
      result.push({
        normalizedName,
        ingredients: ings,
        defaultTargetId: shortest[0].id,
      });
    }
  }
  return result.sort((a, b) =>
    a.normalizedName.localeCompare(b.normalizedName, "pl"),
  );
}
