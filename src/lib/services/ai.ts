import { GoogleGenerativeAI } from "@google/generative-ai";
import { INGREDIENT_CATEGORIES, UNITS } from "@/types";
import type { IngredientCategory, Unit } from "@/types";

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
): Promise<EnrichedIngredient[]> {
  if (names.length === 0) return [];

  const client = getClient();
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });
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
): Promise<EnrichedIngredient> {
  const results = await enrichIngredients([name], currentUnit);
  return results[0];
}
