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

// Build regex for units dynamically from UNITS constant
const UNITS_PATTERN = UNITS.map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
const INGREDIENT_REGEX = new RegExp(
  `^(\\d+(?:[.,]\\d+)?)\\s*(${UNITS_PATTERN})?\\s+(.+)$`,
  "i"
);

export function parseIngredient(line: string): ParsedIngredient | null {
  const trimmed = line.replace(/^[-*]\s*/, "").trim();
  if (!trimmed) return null;

  const match = trimmed.match(INGREDIENT_REGEX);
  if (match) {
    const amount = parseFloat(match[1].replace(",", "."));
    const unit = match[2]?.toLowerCase() || "szt";
    const name = match[3].trim();
    return { amount, unit, name };
  }

  // Fallback: try to parse without strict format (e.g., "sól do smaku")
  // Treat as 1 szt
  return { amount: 1, unit: "szt", name: trimmed };
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
