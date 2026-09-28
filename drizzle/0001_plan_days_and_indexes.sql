ALTER TABLE "daily_plans" ALTER COLUMN "date" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "shopping_lists" ALTER COLUMN "date_from" SET DATA TYPE date;--> statement-breakpoint
ALTER TABLE "shopping_lists" ALTER COLUMN "date_to" SET DATA TYPE date;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_usage_user_id_created_at_idx" ON "ai_usage" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "daily_plan_meals_daily_plan_id_idx" ON "daily_plan_meals" USING btree ("daily_plan_id");--> statement-breakpoint
CREATE INDEX "daily_plan_meals_meal_id_idx" ON "daily_plan_meals" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "daily_plan_meals_meal_type_id_idx" ON "daily_plan_meals" USING btree ("meal_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_plans_profile_id_date_idx" ON "daily_plans" USING btree ("profile_id","date");--> statement-breakpoint
CREATE INDEX "daily_plans_user_id_date_idx" ON "daily_plans" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "ingredients_user_id_name_idx" ON "ingredients" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "meal_ingredients_meal_id_idx" ON "meal_ingredients" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meal_ingredients_ingredient_id_idx" ON "meal_ingredients" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "meal_meal_types_meal_type_id_idx" ON "meal_meal_types" USING btree ("meal_type_id");--> statement-breakpoint
CREATE INDEX "meal_tags_tag_id_idx" ON "meal_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "meal_types_user_id_idx" ON "meal_types" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "meals_user_id_name_idx" ON "meals" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "shopping_list_items_shopping_list_id_idx" ON "shopping_list_items" USING btree ("shopping_list_id");--> statement-breakpoint
CREATE INDEX "shopping_list_items_ingredient_id_idx" ON "shopping_list_items" USING btree ("ingredient_id");--> statement-breakpoint
CREATE INDEX "shopping_lists_user_id_idx" ON "shopping_lists" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");