import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================
// Better Auth tables
// ============================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  name: text("name"),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
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
});

export const accounts = pgTable("accounts", {
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
});

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
export const profiles = pgTable("profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  avatar: text("avatar"), // emoji or image url
  color: text("color").notNull().default("#10b981"), // emerald-500
  dailyCalorieGoal: integer("daily_calorie_goal").default(2000),
  dailyProteinGoal: integer("daily_protein_goal").default(50),
  dailyCarbsGoal: integer("daily_carbs_goal").default(250),
  dailyFatGoal: integer("daily_fat_goal").default(65),
  isChild: boolean("is_child").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Ingredients - shared per account
export const ingredients = pgTable("ingredients", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category").notNull(), // e.g., "Nabiał", "Warzywa", "Mięso"
  defaultUnit: text("default_unit").notNull().default("g"),
  caloriesPer100g: real("calories_per_100g"),
  proteinPer100g: real("protein_per_100g"),
  carbsPer100g: real("carbs_per_100g"),
  fatPer100g: real("fat_per_100g"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meals - shared per account
export const meals = pgTable("meals", {
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
});

// Tags - shared per account
export const tags = pgTable("tags", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  color: text("color").notNull().default("#6b7280"), // gray-500
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Meal types (Śniadanie, Obiad, Kolacja, Przekąska)
export const mealTypes = pgTable("meal_types", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  order: integer("order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  (t) => [primaryKey({ columns: [t.mealId, t.tagId] })]
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
  (t) => [primaryKey({ columns: [t.mealId, t.mealTypeId] })]
);

// Meal ingredients
export const mealIngredients = pgTable("meal_ingredients", {
  id: text("id").primaryKey(),
  mealId: text("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "cascade" }),
  amount: real("amount").notNull(),
  unit: text("unit").notNull(),
});

// Daily plans - per profile!
export const dailyPlans = pgTable("daily_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Daily plan meals
export const dailyPlanMeals = pgTable("daily_plan_meals", {
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
});

// Shopping lists - can be for multiple profiles
export const shoppingLists = pgTable("shopping_lists", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  profileIds: text("profile_ids").array(), // selected profiles
  name: text("name").notNull(),
  dateFrom: timestamp("date_from"),
  dateTo: timestamp("date_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Shopping list items
export const shoppingListItems = pgTable("shopping_list_items", {
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
});

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
  })
);

export const dailyPlansRelations = relations(dailyPlans, ({ one, many }) => ({
  user: one(users, { fields: [dailyPlans.userId], references: [users.id] }),
  profile: one(profiles, {
    fields: [dailyPlans.profileId],
    references: [profiles.id],
  }),
  dailyPlanMeals: many(dailyPlanMeals),
}));

export const dailyPlanMealsRelations = relations(
  dailyPlanMeals,
  ({ one }) => ({
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
  })
);

export const shoppingListsRelations = relations(
  shoppingLists,
  ({ one, many }) => ({
    user: one(users, {
      fields: [shoppingLists.userId],
      references: [users.id],
    }),
    items: many(shoppingListItems),
  })
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
  })
);
