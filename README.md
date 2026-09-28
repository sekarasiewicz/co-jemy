# co jemy?

Meal randomizer and planner for families: random dishes, daily and weekly
plans per family member (Netflix-style profiles), shopping lists, and AI
helpers for adding dishes from recipe text, photos, product labels and diet
PDFs.

Next.js 16 (App Router) · TypeScript · Drizzle ORM · Neon Postgres ·
Better Auth · Tailwind CSS · Vercel Blob · Gemini.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. `npm run db:migrate` — apply migrations to the database.
4. `npm run dev`

Registration is invite-only: sign up with the `INVITE_CODE` value. Make a
user an admin with `npx tsx scripts/set-admin.mts <email>`.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (does not touch the DB) |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` / `npm run check` | Biome lint / lint + format with fixes |
| `npm run db:generate` | Generate a migration from `src/db/schema.ts` changes |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:clear-user` | Delete a user's app data (script) |

## Deploying

Vercel runs `vercel-build`, which applies pending migrations
(`drizzle-kit migrate`) for production deployments before `next build`.
Schema changes: edit the schema, `npm run db:generate`, review the SQL in
`drizzle/`, commit.
