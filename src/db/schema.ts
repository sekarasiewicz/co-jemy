import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================
// Better Auth tables
// ============================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  image: text("image"),
  role: text("role").notNull().default("user"), // "user" | "admin"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_id_idx").on(t.userId)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    idToken: text("id_token"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("accounts_user_id_idx").on(t.userId)],
);

export const verifications = pgTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ============================================
// App tables
// ============================================

// Profiles - Netflix-style family members
export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    avatar: text("avatar"), // emoji or image url
    color: text("color").notNull().default("#10b981"), // emerald-500
    // Body metrics (for BMR / calorie goal calculation)
    height: integer("height"), // cm
    weight: integer("weight"), // kg
    age: integer("age"), // years
    sex: text("sex"), // "male" | "female"
    activityLevel: text("activity_level").default("moderate"), // sedentary|light|moderate|active|very_active
    autoCalorieGoal: boolean("auto_calorie_goal").notNull().default(false),
    dailyCalorieGoal: integer("daily_calorie_goal").default(2000),
    dailyProteinGoal: integer("daily_protein_goal").default(50),
    dailyCarbsGoal: integer("daily_carbs_goal").default(250),
    dailyFatGoal: integer("daily_fat_goal").default(65),
    isChild: boolean("is_child").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("profiles_user_id_idx").on(t.userId)],
);

// Ingredients - shared per account
export const ingredients = pgTable(
  "ingredients",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(), // e.g., "Nabiał", "Warzywa", "Mięso"
    image: text("image"),
    defaultUnit: text("default_unit").notNull().default("g"),
    caloriesPer100g: real("calories_per_100g"),
    proteinPer100g: real("protein_per_100g"),
    carbsPer100g: real("carbs_per_100g"),
    fatPer100g: real("fat_per_100g"),
    weightPerUnit: real("weight_per_unit"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ingredients_user_id_name_idx").on(t.userId, t.name)],
);

// AI usage log - for admin cost tracking
export const aiUsage = pgTable(
  "ai_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    operation: text("operation").notNull(), // e.g. "enrich_ingredients", "extract_diet"
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    costUsd: real("cost_usd").notNull().default(0),
    success: boolean("success").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("ai_usage_user_id_created_at_idx").on(t.userId, t.createdAt)],
);

// Meals - shared per account
export const meals = pgTable(
  "meals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    instructions: text("instructions"),
    imageUrl: text("image_url"),
    servings: integer("servings").notNull().default(2),
    prepTimeMinutes: integer("prep_time_minutes"),
    cookTimeMinutes: integer("cook_time_minutes"),
    calories: integer("calories"),
    protein: real("protein"),
    carbs: real("carbs"),
    fat: real("fat"),
    isVegetarian: boolean("is_vegetarian").notNull().default(false),
    isVegan: boolean("is_vegan").notNull().default(false),
    isGlutenFree: boolean("is_gluten_free").notNull().default(false),
    isLactoseFree: boolean("is_lactose_free").notNull().default(false),
    isQuick: boolean("is_quick").notNull().default(false), // < 30 min
    isMealPrep: boolean("is_meal_prep").notNull().default(false),
    isChildFriendly: boolean("is_child_friendly").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    // Soft delete: a deleted meal leaves lists and pickers but stays in the
    // plans (history) that used it.
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [index("meals_user_id_name_idx").on(t.userId, t.name)],
);

// Tags - shared per account
export const tags = pgTable(
  "tags",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color").notNull().default("#6b7280"), // gray-500
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("tags_user_id_idx").on(t.userId)],
);

// Meal types (Śniadanie, Obiad, Kolacja, Przekąska)
export const mealTypes = pgTable(
  "meal_types",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("meal_types_user_id_idx").on(t.userId)],
);

// Junction: meals <-> tags
export const mealTags = pgTable(
  "meal_tags",
  {
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    tagId: text("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.mealId, t.tagId] }),
    index("meal_tags_tag_id_idx").on(t.tagId),
  ],
);

// Junction: meals <-> mealTypes
export const mealMealTypes = pgTable(
  "meal_meal_types",
  {
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    mealTypeId: text("meal_type_id")
      .notNull()
      .references(() => mealTypes.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.mealId, t.mealTypeId] }),
    index("meal_meal_types_meal_type_id_idx").on(t.mealTypeId),
  ],
);

// Meal ingredients
export const mealIngredients = pgTable(
  "meal_ingredients",
  {
    id: text("id").primaryKey(),
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id")
      .notNull()
      .references(() => ingredients.id, { onDelete: "cascade" }),
    amount: real("amount").notNull(),
    unit: text("unit").notNull(),
  },
  (t) => [
    index("meal_ingredients_meal_id_idx").on(t.mealId),
    index("meal_ingredients_ingredient_id_idx").on(t.ingredientId),
  ],
);

// Daily plans - per profile!
export const dailyPlans = pgTable(
  "daily_plans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    // Calendar day ("YYYY-MM-DD"), one plan per profile per day.
    date: date("date", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_plans_profile_id_date_idx").on(t.profileId, t.date),
    index("daily_plans_user_id_date_idx").on(t.userId, t.date),
  ],
);

// Daily plan meals
export const dailyPlanMeals = pgTable(
  "daily_plan_meals",
  {
    id: text("id").primaryKey(),
    dailyPlanId: text("daily_plan_id")
      .notNull()
      .references(() => dailyPlans.id, { onDelete: "cascade" }),
    mealId: text("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    mealTypeId: text("meal_type_id")
      .notNull()
      .references(() => mealTypes.id, { onDelete: "cascade" }),
    servings: real("servings").notNull().default(1),
    completed: boolean("completed").notNull().default(false),
  },
  (t) => [
    index("daily_plan_meals_daily_plan_id_idx").on(t.dailyPlanId),
    index("daily_plan_meals_meal_id_idx").on(t.mealId),
    index("daily_plan_meals_meal_type_id_idx").on(t.mealTypeId),
  ],
);

// Shopping lists - can be for multiple profiles
export const shoppingLists = pgTable(
  "shopping_lists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    profileIds: text("profile_ids").array(), // selected profiles
    name: text("name").notNull(),
    dateFrom: date("date_from", { mode: "string" }),
    dateTo: date("date_to", { mode: "string" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("shopping_lists_user_id_idx").on(t.userId)],
);

// Shopping list items
export const shoppingListItems = pgTable(
  "shopping_list_items",
  {
    id: text("id").primaryKey(),
    shoppingListId: text("shopping_list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    ingredientId: text("ingredient_id").references(() => ingredients.id, {
      onDelete: "set null",
    }),
    customName: text("custom_name"), // if no ingredientId
    amount: real("amount"),
    unit: text("unit"),
    category: text("category").notNull(),
    checked: boolean("checked").notNull().default(false),
    inPantry: boolean("in_pantry").notNull().default(false),
  },
  (t) => [
    index("shopping_list_items_shopping_list_id_idx").on(t.shoppingListId),
    index("shopping_list_items_ingredient_id_idx").on(t.ingredientId),
  ],
);

// ============================================
// Relations
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  profiles: many(profiles),
  ingredients: many(ingredients),
  meals: many(meals),
  tags: many(tags),
  mealTypes: many(mealTypes),
  dailyPlans: many(dailyPlans),
  shoppingLists: many(shoppingLists),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  user: one(users, { fields: [profiles.userId], references: [users.id] }),
  dailyPlans: many(dailyPlans),
}));

export const ingredientsRelations = relations(ingredients, ({ one, many }) => ({
  user: one(users, { fields: [ingredients.userId], references: [users.id] }),
  mealIngredients: many(mealIngredients),
}));

export const mealsRelations = relations(meals, ({ one, many }) => ({
  user: one(users, { fields: [meals.userId], references: [users.id] }),
  mealTags: many(mealTags),
  mealMealTypes: many(mealMealTypes),
  mealIngredients: many(mealIngredients),
  dailyPlanMeals: many(dailyPlanMeals),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  user: one(users, { fields: [tags.userId], references: [users.id] }),
  mealTags: many(mealTags),
}));

export const mealTypesRelations = relations(mealTypes, ({ one, many }) => ({
  user: one(users, { fields: [mealTypes.userId], references: [users.id] }),
  mealMealTypes: many(mealMealTypes),
  dailyPlanMeals: many(dailyPlanMeals),
}));

export const mealTagsRelations = relations(mealTags, ({ one }) => ({
  meal: one(meals, { fields: [mealTags.mealId], references: [meals.id] }),
  tag: one(tags, { fields: [mealTags.tagId], references: [tags.id] }),
}));

export const mealMealTypesRelations = relations(mealMealTypes, ({ one }) => ({
  meal: one(meals, { fields: [mealMealTypes.mealId], references: [meals.id] }),
  mealType: one(mealTypes, {
    fields: [mealMealTypes.mealTypeId],
    references: [mealTypes.id],
  }),
}));

export const mealIngredientsRelations = relations(
  mealIngredients,
  ({ one }) => ({
    meal: one(meals, {
      fields: [mealIngredients.mealId],
      references: [meals.id],
    }),
    ingredient: one(ingredients, {
      fields: [mealIngredients.ingredientId],
      references: [ingredients.id],
    }),
  }),
);

export const dailyPlansRelations = relations(dailyPlans, ({ one, many }) => ({
  user: one(users, { fields: [dailyPlans.userId], references: [users.id] }),
  profile: one(profiles, {
    fields: [dailyPlans.profileId],
    references: [profiles.id],
  }),
  dailyPlanMeals: many(dailyPlanMeals),
}));

export const dailyPlanMealsRelations = relations(dailyPlanMeals, ({ one }) => ({
  dailyPlan: one(dailyPlans, {
    fields: [dailyPlanMeals.dailyPlanId],
    references: [dailyPlans.id],
  }),
  meal: one(meals, {
    fields: [dailyPlanMeals.mealId],
    references: [meals.id],
  }),
  mealType: one(mealTypes, {
    fields: [dailyPlanMeals.mealTypeId],
    references: [mealTypes.id],
  }),
}));

export const shoppingListsRelations = relations(
  shoppingLists,
  ({ one, many }) => ({
    user: one(users, {
      fields: [shoppingLists.userId],
      references: [users.id],
    }),
    items: many(shoppingListItems),
  }),
);

export const shoppingListItemsRelations = relations(
  shoppingListItems,
  ({ one }) => ({
    shoppingList: one(shoppingLists, {
      fields: [shoppingListItems.shoppingListId],
      references: [shoppingLists.id],
    }),
    ingredient: one(ingredients, {
      fields: [shoppingListItems.ingredientId],
      references: [ingredients.id],
    }),
  }),
);
