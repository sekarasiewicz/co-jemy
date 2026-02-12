import { UNITS } from "@/types";

export interface ParsedIngredient {
  amount: number;
  unit: string;
  name: string;
}

export interface ParsedMeal {
  name: string;
  description?: string;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  mealTypeNames: string[];
  tagNames: string[];
  ingredients: ParsedIngredient[];
  instructions?: string;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isQuick: boolean;
  isMealPrep: boolean;
  isChildFriendly: boolean;
}

const FEATURE_MAP: Record<string, keyof ParsedMeal> = {
  wegetariańskie: "isVegetarian",
  wegańskie: "isVegan",
  bezglutenowe: "isGlutenFree",
  "bez laktozy": "isLactoseFree",
  szybkie: "isQuick",
  "meal prep": "isMealPrep",
  "dla dzieci": "isChildFriendly",
};

// Map Polish unit variants to canonical form
const UNIT_ALIASES: Record<string, string> = {
  // szt variants
  sztuki: "szt",
  sztuk: "szt",
  sztuka: "szt",
  // łyżka variants
  łyżki: "łyżka",
  łyżek: "łyżka",
  // łyżeczka variants
  łyżeczki: "łyżeczka",
  łyżeczek: "łyżeczka",
  // szklanka variants
  szklanki: "szklanka",
  szklankę: "szklanka",
  // ząbek variants
  ząbki: "ząbek",
  ząbków: "ząbek",
  ząbka: "ząbek",
  // plaster variants
  plastry: "plaster",
  plasterki: "plaster",
  plasterków: "plaster",
  plastra: "plaster",
  plastrów: "plaster",
  // kromka variants
  kromki: "kromka",
  kromek: "kromka",
  // pęczek variants
  pęczki: "pęczek",
  pęczków: "pęczek",
  // opakowanie variants
  opakowania: "opakowanie",
  opakowań: "opakowanie",
  // kostka variants
  kostki: "kostka",
  kostek: "kostka",
  // garść variants
  garści: "garść",
  // szczypta variants
  szczypty: "szczypta",
  szczypt: "szczypta",
  // listek variants
  listki: "listek",
  listków: "listek",
  liście: "listek",
  liści: "listek",
  liść: "listek",
  // gałązka variants
  gałązki: "gałązka",
  gałązek: "gałązka",
  // łodyga variants
  łodygi: "łodyga",
  łodyg: "łodyga",
  // puszka variants
  puszki: "puszka",
  puszek: "puszka",
  // słoik variants
  słoiki: "słoik",
  słoików: "słoik",
  // woreczek variants
  woreczka: "woreczek",
  woreczki: "woreczek",
  woreczków: "woreczek",
  // porcja variants
  porcja: "porcja",
  porcje: "porcja",
  porcji: "porcja",
};

function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase();
  return UNIT_ALIASES[lower] || lower;
}

function stripParenthetical(name: string): string {
  // Remove parenthetical weight/volume info like (5g), (ok. 200g), (15ml), (ok. 50ml)
  return name.replace(/\s*\((?:ok\.\s*)?\d+\s*(?:g|ml)\)\s*/gi, " ").trim();
}

// Build regex for units dynamically from UNITS constant + aliases (longer first)
const allUnitForms = [...UNITS.map((u) => u as string), ...Object.keys(UNIT_ALIASES)]
  .sort((a, b) => b.length - a.length);
const UNITS_PATTERN = allUnitForms
  .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

// Number pattern: handles decimals (1.5, 1,5), fractions (1/3), mixed with space (1 1/2), mixed with "i" (2 i 1/2)
const NUMBER_PATTERN = `(\\d+(?:[.,]\\d+)?\\s+i\\s+\\d+/\\d+|\\d+(?:[.,]\\d+)?\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:[.,]\\d+)?)`;

const INGREDIENT_REGEX = new RegExp(
  `^${NUMBER_PATTERN}\\s*(${UNITS_PATTERN})?\\s+(.+)$`,
  "i"
);

// Reversed format: "Name - amount unit (weight)" or "Name - (weight)"
const REVERSED_INGREDIENT_REGEX = new RegExp(
  `^(.+?)\\s*[-–—]\\s*${NUMBER_PATTERN}\\s*(${UNITS_PATTERN})?\\s*(?:\\(.*\\))?\\s*$`,
  "i"
);

// Reversed format without amount: "Name - (200g)" — just parenthetical weight, no separate amount
const REVERSED_NO_AMOUNT_REGEX = new RegExp(
  `^(.+?)\\s*[-–—]\\s*\\(\\s*(\\d+(?:[.,]\\d+)?)\\s*(g|kg|ml|l)\\s*\\)\\s*$`,
  "i"
);

function parseAmount(raw: string): number {
  const trimmed = raw.trim();
  // Mixed fraction with "i": "2 i 1/2"
  const mixedPolishMatch = trimmed.match(/^(\d+)\s+i\s+(\d+)\/(\d+)$/);
  if (mixedPolishMatch) {
    return parseInt(mixedPolishMatch[1]) + parseInt(mixedPolishMatch[2]) / parseInt(mixedPolishMatch[3]);
  }
  // Mixed fraction with space: "1 1/2"
  const mixedMatch = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    return parseInt(mixedMatch[1]) + parseInt(mixedMatch[2]) / parseInt(mixedMatch[3]);
  }
  // Simple fraction: "1/3"
  const fracMatch = trimmed.match(/^(\d+)\/(\d+)$/);
  if (fracMatch) {
    return parseInt(fracMatch[1]) / parseInt(fracMatch[2]);
  }
  // Decimal
  return parseFloat(trimmed.replace(",", "."));
}

export function parseIngredient(line: string): ParsedIngredient | null {
  const trimmed = line.replace(/^[-*]\s*/, "").trim();
  if (!trimmed) return null;

  // Reversed format: "Chleb żytni razowy - 2 i 1/2 kromki (100g)"
  // Try this first since the user's data is primarily in this format
  const reversedMatch = trimmed.match(REVERSED_INGREDIENT_REGEX);
  if (reversedMatch) {
    const name = stripParenthetical(reversedMatch[1].trim());
    const amount = parseAmount(reversedMatch[2]);
    const unit = normalizeUnit(reversedMatch[3] || "szt");
    return { amount, unit, name };
  }

  // Reversed with no amount, just parenthetical weight: "Warzywa na patelnię - (200g)"
  const reversedNoAmountMatch = trimmed.match(REVERSED_NO_AMOUNT_REGEX);
  if (reversedNoAmountMatch) {
    const name = stripParenthetical(reversedNoAmountMatch[1].trim());
    const amount = parseFloat(reversedNoAmountMatch[2].replace(",", "."));
    const unit = reversedNoAmountMatch[3].toLowerCase();
    return { amount, unit, name };
  }

  // Standard format: "500g mielona wołowina" or "1/3 sztuki awokado"
  const match = trimmed.match(INGREDIENT_REGEX);
  if (match) {
    const amount = parseAmount(match[1]);
    const unit = normalizeUnit(match[2] || "szt");
    const name = stripParenthetical(match[3].trim());
    return { amount, unit, name };
  }

  // Fallback: try to parse without strict format (e.g., "sól do smaku")
  // Treat as 1 szt
  return { amount: 1, unit: "szt", name: stripParenthetical(trimmed) };
}

function parseMinutes(value: string): number | undefined {
  const match = value.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : undefined;
}

function parseSection(content: string, sectionName: string): string | null {
  const regex = new RegExp(`##\\s*${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n##|$)`, "i");
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}

function parseListItems(section: string | null): string[] {
  if (!section) return [];
  return section
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

export function parseSingleMeal(markdown: string): ParsedMeal | null {
  // Extract name from # heading
  const nameMatch = markdown.match(/^#\s+(.+)$/m);
  if (!nameMatch) return null;

  const name = nameMatch[1].trim();

  // Default values
  const meal: ParsedMeal = {
    name,
    servings: 1,
    mealTypeNames: [],
    tagNames: [],
    ingredients: [],
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    isQuick: false,
    isMealPrep: false,
    isChildFriendly: false,
  };

  // Parse Info section
  const infoSection = parseSection(markdown, "Info");
  if (infoSection) {
    const lines = parseListItems(infoSection);
    for (const line of lines) {
      const [key, ...valueParts] = line.split(":");
      const keyLower = key.toLowerCase().trim();
      const value = valueParts.join(":").trim();

      if (keyLower === "porcje") {
        meal.servings = parseInt(value, 10) || 1;
      } else if (keyLower === "przygotowanie") {
        meal.prepTimeMinutes = parseMinutes(value);
      } else if (keyLower === "gotowanie") {
        meal.cookTimeMinutes = parseMinutes(value);
      } else if (keyLower === "typ") {
        meal.mealTypeNames = value.split(",").map((t) => t.trim()).filter(Boolean);
      } else if (keyLower === "tagi") {
        meal.tagNames = value.split(",").map((t) => t.trim()).filter(Boolean);
      } else if (keyLower === "opis") {
        meal.description = value;
      }
    }
  }

  // Parse Składniki section
  const ingredientsSection = parseSection(markdown, "Składniki");
  if (ingredientsSection) {
    const lines = ingredientsSection.split("\n");
    for (const line of lines) {
      const parsed = parseIngredient(line);
      if (parsed) {
        meal.ingredients.push(parsed);
      }
    }
  }

  // Parse Instrukcje section
  const instructionsSection = parseSection(markdown, "Instrukcje");
  if (instructionsSection) {
    meal.instructions = instructionsSection;
  }

  // Parse Cechy section
  const cechySection = parseSection(markdown, "Cechy");
  if (cechySection) {
    const features = parseListItems(cechySection);
    for (const feature of features) {
      const featureLower = feature.toLowerCase();
      const mappedKey = FEATURE_MAP[featureLower];
      if (mappedKey) {
        (meal[mappedKey] as boolean) = true;
      }
    }
  }

  return meal;
}

export function parseMarkdownMeals(markdown: string): ParsedMeal[] {
  // Split by --- separator
  const sections = markdown.split(/\n---+\n/).map((s) => s.trim()).filter(Boolean);

  const meals: ParsedMeal[] = [];
  for (const section of sections) {
    const meal = parseSingleMeal(section);
    if (meal) {
      meals.push(meal);
    }
  }

  return meals;
}
