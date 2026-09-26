import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";

// One-off: the DB was built with `drizzle-kit push`, so it already matches
// drizzle/0000_baseline.sql but has no migration history. Record the baseline
// as applied so `drizzle-kit migrate` only runs migrations added after it.
//
// Usage: DATABASE_URL=... npx tsx scripts/baseline-migrations.mts
// (defaults to DATABASE_URL from .env.local)

const sql = neon(process.env.DATABASE_URL!);
const [baseline] = readMigrationFiles({ migrationsFolder: "./drizzle" });

const [{ exists: hasSchema }] = await sql`
  SELECT to_regclass('public.users') IS NOT NULL AS exists
`;
if (!hasSchema) {
  console.log("Empty database — nothing to baseline, run `npm run db:migrate`.");
  process.exit(0);
}

await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
await sql`
  CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
    id SERIAL PRIMARY KEY,
    hash text NOT NULL,
    created_at bigint
  )
`;

const existing = await sql`SELECT count(*)::int AS n FROM drizzle.__drizzle_migrations`;
if (existing[0].n > 0) {
  console.log("Migration history already present — skipping.");
  process.exit(0);
}

await sql`
  INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
  VALUES (${baseline.hash}, ${baseline.folderMillis})
`;
console.log(`Baseline recorded (created_at=${baseline.folderMillis}).`);
