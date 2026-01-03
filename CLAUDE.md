# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**co-jemy** ("what are we eating") - A meal randomizer app for families. Users can randomize meals, plan daily menus, and generate shopping lists. Features Netflix-style profiles where each family member has their own daily plans and calorie goals.

**Stack:** Next.js 15 + TypeScript + Drizzle ORM + Neon (Postgres) + Better Auth + Tailwind CSS + TanStack React Query

## Commands

```bash
npm run dev           # Development server
npm run build         # Production build
npm run db:push       # Push schema to Neon
npm run db:studio     # Drizzle Studio (database browser)
npm run db:generate   # Generate migrations
```

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
