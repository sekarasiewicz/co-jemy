import dotenv from "dotenv";
import { neon } from "@neondatabase/serverless";
import { createInterface } from "readline";

dotenv.config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL nie znaleziony w .env.local");
  process.exit(1);
}

const userId = process.argv[2];
if (!userId) {
  console.error("Użycie: npx tsx scripts/clear-user-data.ts <userId>");
  console.error("");
  console.error(
    "Skopiuj swoje User ID ze strony Zarządzaj profilami w aplikacji.",
  );
  process.exit(1);
}

const sql = neon(DATABASE_URL);

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} (t/N): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "t");
    });
  });
}

async function main() {
  // Verify user exists
  const userRows =
    await sql`SELECT id, email, name FROM users WHERE id = ${userId}`;
  if (userRows.length === 0) {
    console.error(`❌ Nie znaleziono użytkownika o ID: ${userId}`);
    process.exit(1);
  }

  const user = userRows[0];
  console.log(`\nUżytkownik: ${user.name} (${user.email})`);

  // Count records to delete
  const [dailyPlansCount, shoppingListsCount, mealsCount, ingredientsCount, tagsCount, mealTypesCount] =
    await Promise.all([
      sql`SELECT COUNT(*)::int as count FROM daily_plans WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*)::int as count FROM shopping_lists WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*)::int as count FROM meals WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*)::int as count FROM ingredients WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*)::int as count FROM tags WHERE user_id = ${userId}`,
      sql`SELECT COUNT(*)::int as count FROM meal_types WHERE user_id = ${userId}`,
    ]);

  const counts = [
    { label: "Plany dnia", count: dailyPlansCount[0].count as number },
    { label: "Listy zakupów", count: shoppingListsCount[0].count as number },
    { label: "Dania", count: mealsCount[0].count as number },
    { label: "Składniki", count: ingredientsCount[0].count as number },
    { label: "Tagi", count: tagsCount[0].count as number },
    { label: "Typy posiłków", count: mealTypesCount[0].count as number },
  ];

  console.log("\nDane do usunięcia:");
  let totalCount = 0;
  for (const { label, count } of counts) {
    totalCount += count;
    console.log(`  ${label}: ${count}`);
  }

  if (totalCount === 0) {
    console.log("\nBrak danych do usunięcia.");
    process.exit(0);
  }

  console.log(
    `\nŁącznie: ${totalCount} rekordów (+ powiązane rekordy kaskadowe)`,
  );
  console.log("NIE zostaną usunięte: konto, profile, sesje.\n");

  const confirmed = await confirm("Czy na pewno chcesz usunąć te dane?");
  if (!confirmed) {
    console.log("Anulowano.");
    process.exit(0);
  }

  console.log("\nUsuwanie...");

  // Delete in order — cascades handle junction/child tables
  await sql`DELETE FROM daily_plans WHERE user_id = ${userId}`;
  console.log(`  ✓ ${counts[0].label}: usunięto ${counts[0].count}`);

  await sql`DELETE FROM shopping_lists WHERE user_id = ${userId}`;
  console.log(`  ✓ ${counts[1].label}: usunięto ${counts[1].count}`);

  await sql`DELETE FROM meals WHERE user_id = ${userId}`;
  console.log(`  ✓ ${counts[2].label}: usunięto ${counts[2].count}`);

  await sql`DELETE FROM ingredients WHERE user_id = ${userId}`;
  console.log(`  ✓ ${counts[3].label}: usunięto ${counts[3].count}`);

  await sql`DELETE FROM tags WHERE user_id = ${userId}`;
  console.log(`  ✓ ${counts[4].label}: usunięto ${counts[4].count}`);

  await sql`DELETE FROM meal_types WHERE user_id = ${userId}`;
  console.log(`  ✓ ${counts[5].label}: usunięto ${counts[5].count}`);

  console.log("\n✅ Dane zostały wyczyszczone.");
}

main().catch((err) => {
  console.error("Błąd:", err);
  process.exit(1);
});
