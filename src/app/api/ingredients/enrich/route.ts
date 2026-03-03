import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getIngredientsByUserId, updateIngredient } from "@/lib/services/ingredients";
import { enrichIngredients } from "@/lib/services/ai";
import type { Ingredient } from "@/types";

function isIncomplete(ing: Ingredient): boolean {
  return (
    ing.category === "Inne" ||
    ing.caloriesPer100g == null ||
    ing.proteinPer100g == null ||
    ing.carbsPer100g == null ||
    ing.fatPer100g == null
  );
}

export async function POST() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const allIngredients = await getIngredientsByUserId(userId);
  const incomplete = allIngredients.filter(isIncomplete);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      send("start", { total: incomplete.length });

      const batchSize = 20;
      let processed = 0;

      for (let i = 0; i < incomplete.length; i += batchSize) {
        const batch = incomplete.slice(i, i + batchSize);
        const names = batch.map((ing) => ing.name);

        try {
          const enriched = await enrichIngredients(names);

          for (let j = 0; j < batch.length; j++) {
            const ing = batch[j];
            const data = enriched[j];
            await updateIngredient(ing.id, userId, {
              category: data.category,
              defaultUnit: data.defaultUnit,
              caloriesPer100g: data.caloriesPer100g,
              proteinPer100g: data.proteinPer100g,
              carbsPer100g: data.carbsPer100g,
              fatPer100g: data.fatPer100g,
            });
          }

          processed += batch.length;
          send("progress", { processed, total: incomplete.length });
        } catch (error) {
          send("error", {
            message: `Błąd przetwarzania partii: ${error instanceof Error ? error.message : "Nieznany błąd"}`,
            processed,
            total: incomplete.length,
          });
        }
      }

      send("complete", { processed, total: incomplete.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
