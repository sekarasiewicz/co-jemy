"use server";

import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import {
  type ExtractedMeal,
  enrichIngredients,
  extractBarcodeFromImage,
  extractMealFromImage,
  extractMealFromText,
  extractProductFromImage,
  generateMealImage,
} from "@/lib/services/ai";
import {
  createIngredient,
  getIngredientsByUserId,
} from "@/lib/services/ingredients";
import { addMissingDefaultMealTypes } from "@/lib/services/meal-types";
import { createMeal } from "@/lib/services/meals";
import { fetchProductByBarcode } from "@/lib/services/open-food-facts";
import { convertToGrams, generateId } from "@/lib/utils";
import type { Ingredient } from "@/types";
import { requireAuth } from "./auth";

export interface MealDraft {
  name: string;
  description: string;
  instructions: string;
  servings: number;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isVegetarian: boolean;
  isVegan: boolean;
  isGlutenFree: boolean;
  isLactoseFree: boolean;
  isQuick: boolean;
  isMealPrep: boolean;
  isChildFriendly: boolean;
  mealTypeIds: string[];
  ingredients: { ingredientId: string; amount: number; unit: string }[];
  // Ingredients created during extraction — merged into the form's option list.
  newIngredients: Ingredient[];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

// Units where convertToGrams resolves grams via weightPerUnit (not fixed-gram).
const WEIGHT_PER_UNIT_UNITS = new Set([
  "szt",
  "opakowanie",
  "pęczek",
  "ząbek",
  "plaster",
  "kromka",
  "kostka",
  "listek",
  "gałązka",
  "łodyga",
  "puszka",
  "słoik",
  "woreczek",
  "porcja",
]);

async function buildMealDraft(
  userId: string,
  extracted: ExtractedMeal,
): Promise<MealDraft> {
  const mealTypes = await addMissingDefaultMealTypes(userId);
  const existing = await getIngredientsByUserId(userId);
  const ingredientByName = new Map<string, Ingredient>(
    existing.map((i) => [i.name.toLowerCase(), i]),
  );

  // 1. Find missing ingredients, enrich them for macros, create.
  const neededByName = new Map<
    string,
    { name: string; unit: string; amount: number; grams: number }
  >();
  for (const ing of extracted.ingredients) {
    const key = ing.name.toLowerCase();
    if (ingredientByName.has(key)) continue;
    const prev = neededByName.get(key);
    if (!prev || (prev.grams <= 0 && ing.grams > 0)) {
      neededByName.set(key, {
        name: ing.name,
        unit: ing.unit,
        amount: ing.amount,
        grams: ing.grams,
      });
    }
  }

  const newIngredients: Ingredient[] = [];
  if (neededByName.size > 0) {
    const enrichedByName = new Map<
      string,
      Awaited<ReturnType<typeof enrichIngredients>>[number]
    >();
    try {
      const enriched = await enrichIngredients(
        [...neededByName.values()].map((n) => n.name),
        undefined,
        userId,
      );
      for (const e of enriched) {
        enrichedByName.set(e.name.toLowerCase(), e);
      }
    } catch {
      // Fall back to creating ingredients without macros.
    }

    const created = await Promise.all(
      [...neededByName.values()].map(({ name, unit, amount, grams }) => {
        const e = enrichedByName.get(name.toLowerCase());
        const hintWeightPerUnit =
          grams > 0 && amount > 0 && WEIGHT_PER_UNIT_UNITS.has(unit)
            ? round(grams / amount)
            : null;
        return createIngredient(userId, {
          name,
          category: e?.category ?? "Inne",
          defaultUnit: hintWeightPerUnit ? unit : (e?.defaultUnit ?? unit),
          caloriesPer100g: e?.caloriesPer100g ?? null,
          proteinPer100g: e?.proteinPer100g ?? null,
          carbsPer100g: e?.carbsPer100g ?? null,
          fatPer100g: e?.fatPer100g ?? null,
          weightPerUnit: hintWeightPerUnit ?? e?.weightPerUnit ?? null,
        });
      }),
    );
    for (const ing of created) {
      ingredientByName.set(ing.name.toLowerCase(), ing);
      newIngredients.push(ing);
    }
  }

  // 2. Build ingredient entries + compute total macros.
  const ingredients: MealDraft["ingredients"] = [];
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fat = 0;
  for (const ing of extracted.ingredients) {
    const ingredient = ingredientByName.get(ing.name.toLowerCase());
    if (!ingredient) continue;
    ingredients.push({
      ingredientId: ingredient.id,
      amount: ing.amount,
      unit: ing.unit,
    });
    const grams = convertToGrams(
      ing.amount,
      ing.unit,
      ingredient.weightPerUnit,
      ingredient.defaultUnit,
    );
    const factor = grams / 100;
    calories += (ingredient.caloriesPer100g ?? 0) * factor;
    protein += (ingredient.proteinPer100g ?? 0) * factor;
    carbs += (ingredient.carbsPer100g ?? 0) * factor;
    fat += (ingredient.fatPer100g ?? 0) * factor;
  }

  // Form stores nutrition per serving.
  const perServing = Math.max(1, extracted.servings);

  // 3. Resolve meal type names → ids.
  const mealTypeIds = extracted.mealTypeNames
    .map(
      (name) =>
        mealTypes.find((mt) => mt.name.toLowerCase() === name.toLowerCase())
          ?.id,
    )
    .filter((id): id is string => Boolean(id));

  return {
    name: extracted.name,
    description: extracted.description,
    instructions: extracted.instructions,
    servings: perServing,
    prepTimeMinutes: extracted.prepTimeMinutes,
    cookTimeMinutes: extracted.cookTimeMinutes,
    calories: Math.round(calories / perServing),
    protein: round(protein / perServing),
    carbs: round(carbs / perServing),
    fat: round(fat / perServing),
    isVegetarian: extracted.isVegetarian,
    isVegan: extracted.isVegan,
    isGlutenFree: extracted.isGlutenFree,
    isLactoseFree: extracted.isLactoseFree,
    isQuick: extracted.isQuick,
    isMealPrep: extracted.isMealPrep,
    isChildFriendly: extracted.isChildFriendly,
    mealTypeIds,
    ingredients,
    newIngredients,
  };
}

export async function createMealDraftFromTextAction(
  recipeText: string,
): Promise<MealDraft> {
  const session = await requireAuth();
  const text = recipeText.trim();
  if (!text) throw new Error("Pusty tekst przepisu");
  const extracted = await extractMealFromText(text, session.user.id);
  if (!extracted.name) throw new Error("AI nie rozpoznało dania z tekstu");
  return buildMealDraft(session.user.id, extracted);
}

export async function createMealDraftFromImageAction(input: {
  base64: string;
  mimeType: string;
}): Promise<MealDraft> {
  const session = await requireAuth();
  if (!input.base64) throw new Error("Brak zdjęcia");
  const extracted = await extractMealFromImage(
    input.base64,
    input.mimeType,
    session.user.id,
  );
  if (!extracted.name) throw new Error("AI nie rozpoznało dania ze zdjęcia");
  return buildMealDraft(session.user.id, extracted);
}

// A packaged product (from a barcode lookup or a label photo). Same shape
// for both sources.
interface ProductInfo {
  name: string;
  brand: string | null;
  servingGrams: number | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
}

async function buildProductDraft(
  userId: string,
  product: ProductInfo,
): Promise<MealDraft> {
  // Default the product-meal to a meal type so it shows up in the day picker
  // (the picker filters by meal type). "Przekąska" fits most ready products.
  const mealTypes = await addMissingDefaultMealTypes(userId);
  const defaultType =
    mealTypes.find((mt) => mt.name.toLowerCase() === "przekąska") ??
    mealTypes[0];

  const existing = await getIngredientsByUserId(userId);
  const key = product.name.toLowerCase();
  let ingredient = existing.find((i) => i.name.toLowerCase() === key);
  const newIngredients: Ingredient[] = [];

  if (!ingredient) {
    ingredient = await createIngredient(userId, {
      name: product.name,
      category: "Inne",
      defaultUnit: "g",
      caloriesPer100g: product.caloriesPer100g,
      proteinPer100g: product.proteinPer100g,
      carbsPer100g: product.carbsPer100g,
      fatPer100g: product.fatPer100g,
      weightPerUnit: null,
    });
    newIngredients.push(ingredient);
  }

  // One serving of the product. Default to 100 g when the serving is unknown.
  const amount =
    product.servingGrams && product.servingGrams > 0
      ? product.servingGrams
      : 100;
  const factor = amount / 100;

  const displayName =
    product.brand && !key.includes(product.brand.toLowerCase())
      ? `${product.brand} ${product.name}`
      : product.name;

  return {
    name: displayName,
    description: "",
    instructions: "",
    servings: 1,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    calories: Math.round((product.caloriesPer100g ?? 0) * factor),
    protein: round((product.proteinPer100g ?? 0) * factor),
    carbs: round((product.carbsPer100g ?? 0) * factor),
    fat: round((product.fatPer100g ?? 0) * factor),
    isVegetarian: false,
    isVegan: false,
    isGlutenFree: false,
    isLactoseFree: false,
    isQuick: false,
    isMealPrep: false,
    isChildFriendly: false,
    mealTypeIds: defaultType ? [defaultType.id] : [],
    ingredients: [{ ingredientId: ingredient.id, amount, unit: "g" }],
    newIngredients,
  };
}

export interface SavedMeal {
  id: string;
  name: string;
}

// Persist a product draft straight to a saved meal (1-click product add).
async function saveProductAsMeal(
  userId: string,
  product: ProductInfo,
): Promise<SavedMeal> {
  const draft = await buildProductDraft(userId, product);
  const meal = await createMeal(userId, {
    name: draft.name,
    servings: draft.servings,
    calories: draft.calories || null,
    protein: draft.protein || null,
    carbs: draft.carbs || null,
    fat: draft.fat || null,
    isVegetarian: draft.isVegetarian,
    isVegan: draft.isVegan,
    isGlutenFree: draft.isGlutenFree,
    isLactoseFree: draft.isLactoseFree,
    isQuick: draft.isQuick,
    isMealPrep: draft.isMealPrep,
    isChildFriendly: draft.isChildFriendly,
    mealTypeIds: draft.mealTypeIds,
    ingredientsList: draft.ingredients,
  });
  revalidatePath("/meals");
  revalidatePath("/today");
  return { id: meal.id, name: meal.name };
}

export async function createMealFromBarcodeAction(input: {
  base64: string;
  mimeType: string;
}): Promise<SavedMeal> {
  const session = await requireAuth();
  if (!input.base64) throw new Error("Brak zdjęcia");

  const barcode = await extractBarcodeFromImage(
    input.base64,
    input.mimeType,
    session.user.id,
  );

  if (barcode.length >= 8) {
    const product = await fetchProductByBarcode(barcode);
    if (product) return saveProductAsMeal(session.user.id, product);
  }

  // No code read or product not in Open Food Facts — fall back to reading the
  // packaging/label directly from the same photo.
  const fromLabel = await extractProductFromImage(
    input.base64,
    input.mimeType,
    session.user.id,
  );
  if (!fromLabel.name) {
    throw new Error("Nie rozpoznano produktu — spróbuj zdjęcia etykiety");
  }
  return saveProductAsMeal(session.user.id, fromLabel);
}

export async function createMealFromBarcodeNumberAction(
  barcode: string,
): Promise<SavedMeal> {
  const session = await requireAuth();
  const ean = barcode.replace(/\D/g, "");
  if (ean.length < 8) throw new Error("Nieprawidłowy kod kreskowy");

  const product = await fetchProductByBarcode(ean);
  if (!product) {
    throw new Error("Nie znaleziono produktu dla tego kodu");
  }
  return saveProductAsMeal(session.user.id, product);
}

export async function createMealFromProductImageAction(input: {
  base64: string;
  mimeType: string;
}): Promise<SavedMeal> {
  const session = await requireAuth();
  if (!input.base64) throw new Error("Brak zdjęcia");
  const product = await extractProductFromImage(
    input.base64,
    input.mimeType,
    session.user.id,
  );
  if (!product.name) throw new Error("Nie rozpoznano produktu ze zdjęcia");
  return saveProductAsMeal(session.user.id, product);
}

export async function generateMealImageAction(input: {
  name: string;
  description?: string;
  ingredientNames?: string[];
}): Promise<{ url: string }> {
  const session = await requireAuth();
  if (!input.name?.trim()) throw new Error("Najpierw podaj nazwę dania");

  const image = await generateMealImage(input, session.user.id);
  const buffer = Buffer.from(image.base64, "base64");
  const ext = image.mimeType.includes("png")
    ? "png"
    : image.mimeType.includes("webp")
      ? "webp"
      : "jpg";

  const blob = await put(`meals/ai-${generateId()}.${ext}`, buffer, {
    access: "public",
    contentType: image.mimeType,
  });

  return { url: blob.url };
}
