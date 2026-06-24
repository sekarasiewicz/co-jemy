// Open Food Facts product lookup by barcode (EAN/UPC).
// Free, no API key. Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/

export interface OffProduct {
  name: string;
  brand: string | null;
  servingGrams: number | null;
  caloriesPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
}

function num(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function fetchProductByBarcode(
  barcode: string,
): Promise<OffProduct | null> {
  const ean = barcode.replace(/\D/g, "");
  if (ean.length < 8) return null;

  const url = `https://world.openfoodfacts.org/api/v2/product/${ean}.json?fields=product_name,product_name_pl,brands,nutriments,serving_quantity`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "co-jemy/1.0 (meal planner)" },
      // Product data is stable enough to cache for a day.
      next: { revalidate: 86400 },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  const data = (await res.json()) as {
    status?: number;
    product?: {
      product_name?: string;
      product_name_pl?: string;
      brands?: string;
      serving_quantity?: number | string;
      nutriments?: Record<string, unknown>;
    };
  };

  if (data.status !== 1 || !data.product) return null;
  const p = data.product;
  const n = p.nutriments ?? {};

  const name = (p.product_name_pl || p.product_name || "").trim();
  if (!name) return null;

  return {
    name,
    brand: p.brands ? p.brands.split(",")[0].trim() : null,
    servingGrams: num(p.serving_quantity),
    caloriesPer100g: num(n["energy-kcal_100g"]),
    proteinPer100g: num(n.proteins_100g),
    carbsPer100g: num(n.carbohydrates_100g),
    fatPer100g: num(n.fat_100g),
  };
}
