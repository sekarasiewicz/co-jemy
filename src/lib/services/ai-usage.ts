import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { generateId } from "@/lib/utils";

// Gemini pricing in USD per 1M tokens. Estimates — adjust to match the
// current Google pricing page if needed.
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model] ?? { input: 0, output: 0 };
  return (
    (promptTokens / 1_000_000) * p.input +
    (outputTokens / 1_000_000) * p.output
  );
}

interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

/**
 * Records one AI call for admin cost tracking. Never throws — a logging
 * failure must not break the user-facing operation.
 */
export async function recordAiUsage(data: {
  userId?: string | null;
  operation: string;
  model: string;
  usage?: UsageMetadata | null;
  success?: boolean;
}): Promise<void> {
  const promptTokens = data.usage?.promptTokenCount ?? 0;
  const outputTokens = data.usage?.candidatesTokenCount ?? 0;
  const totalTokens =
    data.usage?.totalTokenCount ?? promptTokens + outputTokens;

  try {
    await db.insert(aiUsage).values({
      id: generateId(),
      userId: data.userId ?? null,
      operation: data.operation,
      model: data.model,
      promptTokens,
      outputTokens,
      totalTokens,
      costUsd: estimateCost(data.model, promptTokens, outputTokens),
      success: data.success ?? true,
    });
  } catch (err) {
    console.error("Failed to record AI usage", err);
  }
}
