import { and, eq, gte, sum } from "drizzle-orm";
import { db } from "@/db";
import { aiUsage } from "@/db/schema";
import { generateId } from "@/lib/utils";

// Gemini pricing in USD per 1M tokens. Estimates — adjust to match the
// current Google pricing page if needed.
const PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  // Image output billed at ~$30/1M tokens (~1290 tokens/image ≈ $0.039).
  "gemini-2.5-flash-image": { input: 0.3, output: 30 },
};

export function estimateCost(
  model: string,
  promptTokens: number,
  outputTokens: number,
): number {
  const p = PRICING[model] ?? { input: 0, output: 0 };
  return (
    (promptTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output
  );
}

interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

// Per-user daily spend cap. Every AI call is billed, so without it one account
// (or a script) could run up an unbounded Gemini bill.
const DEFAULT_DAILY_BUDGET_USD = 2;

function dailyBudgetUsd(): number {
  const fromEnv = Number(process.env.AI_DAILY_BUDGET_USD);
  return Number.isFinite(fromEnv) && fromEnv > 0
    ? fromEnv
    : DEFAULT_DAILY_BUDGET_USD;
}

/** Throws when the user has already spent today's AI budget (UTC day). */
export async function assertAiBudget(
  userId: string | null | undefined,
): Promise<void> {
  if (!userId) return;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [row] = await db
    .select({ spent: sum(aiUsage.costUsd).mapWith(Number) })
    .from(aiUsage)
    .where(and(eq(aiUsage.userId, userId), gte(aiUsage.createdAt, startOfDay)));

  if ((row?.spent ?? 0) >= dailyBudgetUsd()) {
    throw new Error(
      "Wykorzystano dzienny limit funkcji AI. Spróbuj ponownie jutro.",
    );
  }
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
