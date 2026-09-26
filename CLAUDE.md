# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**co-jemy** ("what are we eating") - A meal randomizer app for families. Users can randomize meals, plan daily menus, and generate shopping lists. Features Netflix-style profiles where each family member has their own daily plans and calorie goals.

**Stack:** Next.js 15 + TypeScript + Drizzle ORM + Neon (Postgres) + Better Auth + Tailwind CSS + TanStack React Query

## Commands

```bash
npm run dev           # Development server
npm run build         # Production build
npm run db:generate   # Generate a migration from schema changes (commit drizzle/)
npm run db:migrate    # Apply pending migrations
npm run db:studio     # Drizzle Studio (database browser)
```

Schema changes go through migrations: edit `src/db/schema.ts`, run `db:generate`, review the SQL in `drizzle/`, commit. Production deploys run `drizzle-kit migrate` via the `vercel-build` script (only when `VERCEL_ENV=production`); `build` never touches the DB. Don't use `db:push` against shared databases.

## Architecture

### Data Model Philosophy

- **Shared resources** (`userId`): `ingredients`, `meals`, `tags`, `mealTypes` - entire family sees the same dishes
- **Per-profile resources** (`profileId`): `dailyPlans` - each family member has their own daily plan
- **Multi-profile resources** (`profileIds[]`): `shoppingLists` - can generate for selected profiles

### Key Patterns

- **Server Components** by default, Client Components only for interactivity
- **Server Actions** (`src/app/actions/`) for mutations instead of API routes
- **Zod** for form validation
- **Services layer** (`src/lib/services/`) contains business logic
- **Profile Context** for active profile state (persisted in localStorage/cookie)

### User Flow

1. Login → `/profiles` (Netflix-style profile selection) → app
2. ProfileSwitcher in Navbar for quick profile switching

## Conventions

- **Language:** All UI text in Polish
- **Styling:** Tailwind with green/emerald primary colors, mobile-first
- **Loading:** Use Suspense + `loading.tsx`
- **Errors:** Use `error.tsx` + try/catch in actions

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
