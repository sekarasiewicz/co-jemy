import { count, desc, eq, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  aiUsage,
  dailyPlans,
  ingredients,
  meals,
  profiles,
  shoppingLists,
  tags,
  users,
} from "@/db/schema";

export interface AdminStats {
  users: number;
  admins: number;
  profiles: number;
  meals: number;
  ingredients: number;
  tags: number;
  shoppingLists: number;
  dailyPlans: number;
  aiCalls: number;
  aiTokens: number;
  aiCostUsd: number;
  newUsers7d: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [
    usersRow,
    adminsRow,
    profilesRow,
    mealsRow,
    ingredientsRow,
    tagsRow,
    shoppingRow,
    plansRow,
    aiAgg,
    newUsersRow,
  ] = await Promise.all([
    db.select({ c: count() }).from(users),
    db.select({ c: count() }).from(users).where(eq(users.role, "admin")),
    db.select({ c: count() }).from(profiles),
    db.select({ c: count() }).from(meals),
    db.select({ c: count() }).from(ingredients),
    db.select({ c: count() }).from(tags),
    db.select({ c: count() }).from(shoppingLists),
    db.select({ c: count() }).from(dailyPlans),
    db
      .select({
        calls: count(),
        tokens: sum(aiUsage.totalTokens),
        cost: sum(aiUsage.costUsd),
      })
      .from(aiUsage),
    db
      .select({ c: count() })
      .from(users)
      .where(sql`${users.createdAt} > now() - interval '7 days'`),
  ]);

  return {
    users: usersRow[0]?.c ?? 0,
    admins: adminsRow[0]?.c ?? 0,
    profiles: profilesRow[0]?.c ?? 0,
    meals: mealsRow[0]?.c ?? 0,
    ingredients: ingredientsRow[0]?.c ?? 0,
    tags: tagsRow[0]?.c ?? 0,
    shoppingLists: shoppingRow[0]?.c ?? 0,
    dailyPlans: plansRow[0]?.c ?? 0,
    aiCalls: aiAgg[0]?.calls ?? 0,
    aiTokens: Number(aiAgg[0]?.tokens ?? 0),
    aiCostUsd: Number(aiAgg[0]?.cost ?? 0),
    newUsers7d: newUsersRow[0]?.c ?? 0,
  };
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: Date;
  profiles: number;
  meals: number;
  ingredients: number;
  aiCostUsd: number;
}

export async function listUsers(): Promise<AdminUserRow[]> {
  const [allUsers, profileCounts, mealCounts, ingredientCounts, aiCosts] =
    await Promise.all([
      db.select().from(users).orderBy(desc(users.createdAt)),
      db
        .select({ userId: profiles.userId, c: count() })
        .from(profiles)
        .groupBy(profiles.userId),
      db
        .select({ userId: meals.userId, c: count() })
        .from(meals)
        .groupBy(meals.userId),
      db
        .select({ userId: ingredients.userId, c: count() })
        .from(ingredients)
        .groupBy(ingredients.userId),
      db
        .select({ userId: aiUsage.userId, cost: sum(aiUsage.costUsd) })
        .from(aiUsage)
        .groupBy(aiUsage.userId),
    ]);

  const profileMap = new Map(profileCounts.map((r) => [r.userId, r.c]));
  const mealMap = new Map(mealCounts.map((r) => [r.userId, r.c]));
  const ingredientMap = new Map(ingredientCounts.map((r) => [r.userId, r.c]));
  const aiMap = new Map(aiCosts.map((r) => [r.userId, Number(r.cost ?? 0)]));

  return allUsers.map((u) => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    createdAt: u.createdAt,
    profiles: profileMap.get(u.id) ?? 0,
    meals: mealMap.get(u.id) ?? 0,
    ingredients: ingredientMap.get(u.id) ?? 0,
    aiCostUsd: aiMap.get(u.id) ?? 0,
  }));
}

export async function setUserRole(
  userId: string,
  role: "user" | "admin",
): Promise<void> {
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUserById(userId: string): Promise<void> {
  // FK cascades remove profiles, meals, ingredients, plans, sessions, etc.
  await db.delete(users).where(eq(users.id, userId));
}

export interface AiUsageRow {
  id: string;
  userId: string | null;
  email: string | null;
  operation: string;
  model: string;
  promptTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  success: boolean;
  createdAt: Date;
}

export async function getRecentAiUsage(limit = 100): Promise<AiUsageRow[]> {
  const rows = await db
    .select({
      id: aiUsage.id,
      userId: aiUsage.userId,
      email: users.email,
      operation: aiUsage.operation,
      model: aiUsage.model,
      promptTokens: aiUsage.promptTokens,
      outputTokens: aiUsage.outputTokens,
      totalTokens: aiUsage.totalTokens,
      costUsd: aiUsage.costUsd,
      success: aiUsage.success,
      createdAt: aiUsage.createdAt,
    })
    .from(aiUsage)
    .leftJoin(users, eq(aiUsage.userId, users.id))
    .orderBy(desc(aiUsage.createdAt))
    .limit(limit);
  return rows;
}

export interface AiUsageByModel {
  model: string;
  calls: number;
  tokens: number;
  costUsd: number;
}

export async function getAiUsageByModel(): Promise<AiUsageByModel[]> {
  const rows = await db
    .select({
      model: aiUsage.model,
      calls: count(),
      tokens: sum(aiUsage.totalTokens),
      cost: sum(aiUsage.costUsd),
    })
    .from(aiUsage)
    .groupBy(aiUsage.model)
    .orderBy(desc(sum(aiUsage.costUsd)));
  return rows.map((r) => ({
    model: r.model,
    calls: r.calls,
    tokens: Number(r.tokens ?? 0),
    costUsd: Number(r.cost ?? 0),
  }));
}

export interface AdminContentMeal {
  id: string;
  name: string;
  ownerEmail: string | null;
  createdAt: Date;
}

export async function getRecentMeals(limit = 50): Promise<AdminContentMeal[]> {
  return db
    .select({
      id: meals.id,
      name: meals.name,
      ownerEmail: users.email,
      createdAt: meals.createdAt,
    })
    .from(meals)
    .leftJoin(users, eq(meals.userId, users.id))
    .orderBy(desc(meals.createdAt))
    .limit(limit);
}

export async function getRecentIngredients(
  limit = 50,
): Promise<AdminContentMeal[]> {
  return db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      ownerEmail: users.email,
      createdAt: ingredients.createdAt,
    })
    .from(ingredients)
    .leftJoin(users, eq(ingredients.userId, users.id))
    .orderBy(desc(ingredients.createdAt))
    .limit(limit);
}

export async function deleteMealAsAdmin(mealId: string): Promise<void> {
  await db.delete(meals).where(eq(meals.id, mealId));
}

export async function deleteIngredientAsAdmin(id: string): Promise<void> {
  await db.delete(ingredients).where(eq(ingredients.id, id));
}
