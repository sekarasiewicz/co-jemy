import { GoogleGenerativeAI } from "@google/generative-ai";
import { INGREDIENT_CATEGORIES, UNITS } from "@/types";
import type { IngredientCategory, Unit } from "@/types";
import { recordAiUsage } from "./ai-usage";

const validCategories = new Set<string>(INGREDIENT_CATEGORIES);
const validUnits = new Set<string>(UNITS);

export interface EnrichedIngredient {
  name: string;
  category: IngredientCategory;
  defaultUnit: Unit;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  weightPerUnit: number | null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function validateEnriched(
  raw: Record<string, unknown>,
  originalName: string,
): EnrichedIngredient {
  const category = validCategories.has(raw.category as string)
    ? (raw.category as IngredientCategory)
    : "Inne";
  const defaultUnit = validUnits.has(raw.defaultUnit as string)
    ? (raw.defaultUnit as Unit)
    : "g";

  const rawWeight = Number(raw.weightPerUnit);
  const weightPerUnit =
    rawWeight > 0 && rawWeight <= 5000 ? rawWeight : null;

  return {
    name: originalName,
    category,
    defaultUnit,
    caloriesPer100g: clamp(Number(raw.caloriesPer100g) || 0, 0, 900),
    proteinPer100g: clamp(Number(raw.proteinPer100g) || 0, 0, 100),
    carbsPer100g: clamp(Number(raw.carbsPer100g) || 0, 0, 100),
    fatPer100g: clamp(Number(raw.fatPer100g) || 0, 0, 100),
    weightPerUnit,
  };
}

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenerativeAI(apiKey);
}

export async function enrichIngredients(
  names: string[],
  forceUnit?: string,
  userId?: string | null,
): Promise<EnrichedIngredient[]> {
  if (names.length === 0) return [];

  const modelName = "gemini-2.5-flash";
  const client = getClient();
  const model = client.getGenerativeModel({ model: modelName });
  const categoriesList = INGREDIENT_CATEGORIES.join(", ");
  const unitsList = UNITS.join(", ");

  const prompt = `Jesteś ekspertem od żywności i dietetyki. Dla każdego składnika podaj dane odżywcze na 100g, kategorię i domyślną jednostkę.

Składniki: ${JSON.stringify(names)}

Dozwolone kategorie: ${categoriesList}
Dozwolone jednostki: ${unitsList}

Odpowiedz WYŁĄCZNIE poprawnym JSON-em (tablica obiektów), bez żadnego innego tekstu:
[
  {
    "name": "nazwa składnika (dokładnie jak podano)",
    "category": "jedna z dozwolonych kategorii",
    "defaultUnit": "jedna z dozwolonych jednostek",
    "caloriesPer100g": liczba,
    "proteinPer100g": liczba,
    "carbsPer100g": liczba,
    "fatPer100g": liczba,
    "weightPerUnit": liczba lub null
  }
]

WAŻNE — weightPerUnit:
- Jeśli defaultUnit to g, kg, ml lub l → ustaw null
- Dla KAŻDEJ innej jednostki MUSISZ podać wagę w gramach 1 sztuki tej jednostki. Przykłady:
  - jajko (defaultUnit: szt) → weightPerUnit: 60
  - cebula (defaultUnit: szt) → weightPerUnit: 150
  - czosnek (defaultUnit: ząbek) → weightPerUnit: 5
  - drożdże prasowane (defaultUnit: kostka) → weightPerUnit: 100
  - pomidor (defaultUnit: szt) → weightPerUnit: 150
  - puszka pomidorów (defaultUnit: puszka) → weightPerUnit: 400
- Nigdy nie zwracaj null dla jednostek takich jak szt, kostka, puszka, ząbek, kromka, plaster, opakowanie itp.

Jeśli składnik jest przyprawą/ziołem, ustaw defaultUnit na odpowiednią jednostkę (np. szczypta, łyżeczka).
Wartości odżywcze muszą być na 100g masy produktu, niezależnie od defaultUnit.${forceUnit ? `\n\nUżytkownik wybrał jednostkę "${forceUnit}". MUSISZ użyć "${forceUnit}" jako defaultUnit i podać odpowiedni weightPerUnit dla tej jednostki.` : ""}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  await recordAiUsage({
    userId,
    operation: "enrich_ingredients",
    model: modelName,
    usage: result.response.usageMetadata,
  });

  // Extract JSON array from response (handle markdown code blocks)
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error("Nie udało się sparsować odpowiedzi AI");
  }

  const parsed: Record<string, unknown>[] = JSON.parse(jsonMatch[0]);

  // Map results back to original names, preserving order
  const resultMap = new Map<string, Record<string, unknown>>();
  for (const item of parsed) {
    resultMap.set(String(item.name).toLowerCase(), item);
  }

  return names.map((name) => {
    const raw = resultMap.get(name.toLowerCase()) || {};
    return validateEnriched(raw, name);
  });
}

export async function enrichSingleIngredient(
  name: string,
  currentUnit?: string,
  userId?: string | null,
): Promise<EnrichedIngredient> {
  const results = await enrichIngredients([name], currentUnit, userId);
  return results[0];
}

// ============================================
// Diet PDF import
// ============================================

export interface ExtractedDietIngredient {
  name: string;
  amount: number;
  unit: Unit;
  grams: number; // total grams for this line, from the "(Ng)" hint; 0 if absent
}

export interface ExtractedDietMeal {
  name: string;
  mealTypeName: string;
  instructions: string;
  ingredients: ExtractedDietIngredient[];
}

export interface ExtractedDietPlanItem {
  mealTypeName: string;
  mealName: string;
}

export interface ExtractedDietPlanDay {
  dayIndex: number; // 0 = Monday
  meals: ExtractedDietPlanItem[];
}

export interface ExtractedDiet {
  meals: ExtractedDietMeal[];
  plan: ExtractedDietPlanDay[];
}

const MEAL_TYPE_NAMES = [
  "Śniadanie",
  "II śniadanie",
  "Obiad",
  "Kolacja",
  "Przekąska",
];

function normalizeMealTypeName(raw: unknown): string {
  const value = String(raw || "").trim().toLowerCase();
  const match = MEAL_TYPE_NAMES.find((n) => n.toLowerCase() === value);
  return match ?? "Przekąska";
}

function normalizeUnit(raw: unknown): Unit {
  const value = String(raw || "").trim().toLowerCase();
  const match = UNITS.find((u) => u.toLowerCase() === value);
  return (match as Unit) ?? "g";
}

export async function extractDietFromPdf(
  base64Pdf: string,
  mimeType = "application/pdf",
  userId?: string | null,
): Promise<ExtractedDiet> {
  const modelName = "gemini-2.5-pro";
  const client = getClient();
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      // Force valid JSON and allow a large response so big weekly diets
      // (many meals + 7 days) are never truncated mid-object.
      responseMimeType: "application/json",
      maxOutputTokens: 32768,
      temperature: 0.1,
    },
  });
  const unitsList = UNITS.join(", ");
  const mealTypesList = MEAL_TYPE_NAMES.join(", ");

  const prompt = `Jesteś ekspertem od analizy jadłospisów dietetycznych. Otrzymujesz PDF z planem żywieniowym (dni tygodnia, posiłki o określonych porach oraz przepisy "PRZEPIS" ze składnikami i sposobem przygotowania).

Wyodrębnij WSZYSTKIE dania oraz pełny plan tygodnia.

ZASADY:
- "meals" to lista UNIKALNYCH dań (po nazwie). Każde danie referowane w planie MUSI tu wystąpić.
- Jeśli danie ma blok PRZEPIS — użyj jego składników (nazwa, ilość, jednostka) oraz sposobu przygotowania jako "instructions".
- Jeśli danie nie ma przepisu (np. "Jabłko 1 sztuka", "Mandarynki", gotowy produkt) — utwórz danie z JEDNYM składnikiem (sam produkt z podaną ilością) i pustym "instructions".
- Ilości zamień na liczby (np. "1 i 1/2" → 1.5, "3/4" → 0.75, "1/3" → 0.33).
- Jeśli w nawiasie jest gramatura (np. "(120g)"), NIE używaj jej jako jednostki — użyj jednostki głównej (sztuka→szt, łyżka, garść itp.).
- "plan" to lista dni (dayIndex: 0=poniedziałek, 1=wtorek, ... 6=niedziela). Dla każdego dnia lista posiłków z typem i nazwą dania (mealName musi dokładnie odpowiadać nazwie z "meals").

Dozwolone jednostki: ${unitsList}
Dozwolone typy posiłków: ${mealTypesList}

Odpowiedz WYŁĄCZNIE poprawnym JSON-em, bez żadnego innego tekstu:
{
  "meals": [
    {
      "name": "nazwa dania",
      "mealTypeName": "jeden z dozwolonych typów",
      "instructions": "sposób przygotowania lub pusty string",
      "ingredients": [
        { "name": "nazwa składnika", "amount": liczba, "unit": "jedna z dozwolonych jednostek", "grams": liczba gramów z nawiasu np. "(75g)" → 75, lub 0 gdy brak }
      ]
    }
  ],
  "plan": [
    {
      "dayIndex": liczba 0-6,
      "meals": [
        { "mealTypeName": "jeden z dozwolonych typów", "mealName": "nazwa dania z listy meals" }
      ]
    }
  ]
}`;

  const result = await model.generateContent([
    { inlineData: { data: base64Pdf, mimeType } },
    { text: prompt },
  ]);
  const text = result.response.text();

  await recordAiUsage({
    userId,
    operation: "extract_diet",
    model: modelName,
    usage: result.response.usageMetadata,
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Nie udało się sparsować odpowiedzi AI z PDF");
  }

  const parsed = JSON.parse(jsonMatch[0]) as {
    meals?: unknown[];
    plan?: unknown[];
  };

  const meals: ExtractedDietMeal[] = (parsed.meals ?? []).map((m) => {
    const raw = m as Record<string, unknown>;
    const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients : [];
    return {
      name: String(raw.name || "").trim(),
      mealTypeName: normalizeMealTypeName(raw.mealTypeName),
      instructions: String(raw.instructions || "").trim(),
      ingredients: ingredients
        .map((i) => {
          const ri = i as Record<string, unknown>;
          return {
            name: String(ri.name || "").trim(),
            amount: Number(ri.amount) || 0,
            unit: normalizeUnit(ri.unit),
            grams: Math.max(0, Number(ri.grams) || 0),
          };
        })
        .filter((i) => i.name.length > 0),
    };
  });

  const plan: ExtractedDietPlanDay[] = (parsed.plan ?? []).map((d) => {
    const raw = d as Record<string, unknown>;
    const dayMeals = Array.isArray(raw.meals) ? raw.meals : [];
    return {
      dayIndex: clamp(Number(raw.dayIndex) || 0, 0, 6),
      meals: dayMeals
        .map((i) => {
          const ri = i as Record<string, unknown>;
          return {
            mealTypeName: normalizeMealTypeName(ri.mealTypeName),
            mealName: String(ri.mealName || "").trim(),
          };
        })
        .filter((i) => i.mealName.length > 0),
    };
  });

  return {
    meals: meals.filter((m) => m.name.length > 0),
    plan,
  };
}
