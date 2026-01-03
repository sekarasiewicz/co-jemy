# 🍽️ Meal Randomizer - Plan Implementacji dla Claude Code

## Kontekst projektu
Aplikacja do losowania posiłków, planowania dni i tworzenia list zakupów.

**Stack:** Next.js 15 + TypeScript + Drizzle ORM + Neon (Postgres) + Better Auth + Tailwind CSS

**Deployment:** Vercel

---

## FAZA 0: Setup projektu

### 0.1 Inicjalizacja
```bash
npx create-next-app@latest meal-randomizer --typescript --tailwind --eslint --app --src-dir
cd meal-randomizer
```

### 0.2 Instalacja zależności
```bash
npm install drizzle-orm @neondatabase/serverless better-auth zod @tanstack/react-query lucide-react clsx tailwind-merge
npm install -D drizzle-kit
```

### 0.3 Konfiguracja
- Stwórz `drizzle.config.ts` - połączenie z Neon
- Stwórz `.env` z `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`
- Skonfiguruj `tsconfig.json` z aliasem `@/*`

---

## FAZA 1: Baza danych i Auth

### 1.1 Schema bazy danych (`src/db/schema.ts`)
Stwórz tabele:
- `users` - id, email, name, image (właściciel konta rodzinnego)
- `sessions` - Better Auth
- `accounts` - Better Auth (OAuth providers)
- `profiles` - id, userId, name, avatar, color, dailyCalorieGoal, dailyProteinGoal, dailyCarbsGoal, dailyFatGoal, isChild (boolean), isActive, createdAt

**WAŻNE:** Profile to jak na Netflixie - jedno konto, wiele osób. Każdy profil ma własne cele kaloryczne (dziecko vs dorosły) i własne plany dnia.
- `ingredients` - id, userId, name, category, defaultUnit, caloriesPer100g, proteinPer100g, carbsPer100g, fatPer100g (współdzielone w ramach konta)
- `meals` - id, userId, name, description, instructions, imageUrl, servings, prepTimeMinutes, cookTimeMinutes, calories, protein, carbs, fat, isVegetarian, isVegan, isGlutenFree, isLactoseFree, isQuick, isMealPrep, **isChildFriendly** (współdzielone w ramach konta)
- `tags` - id, userId, name, color
- `mealTags` - mealId, tagId (junction table)
- `mealTypes` - id, userId, name, order (Śniadanie, Obiad, Kolacja, Przekąska)
- `mealMealTypes` - mealId, mealTypeId (junction table)
- `mealIngredients` - id, mealId, ingredientId, amount, unit
- `dailyPlans` - id, userId, **profileId**, date (każdy profil ma WŁASNY plan!)
- `dailyPlanMeals` - id, dailyPlanId, mealId, mealTypeId, servings, completed
- `shoppingLists` - id, userId, **profileIds[]** (może dotyczyć wielu profili), name, dateFrom, dateTo
- `shoppingListItems` - id, shoppingListId, ingredientId, customName, amount, unit, category, checked, inPantry

**Logika współdzielenia:**
- `ingredients`, `meals`, `tags`, `mealTypes` → współdzielone (userId) - cała rodzina widzi te same dania
- `profiles` → per user (każdy domownik)
- `dailyPlans` → per profile (każdy ma swój plan dnia!)
- `shoppingLists` → można generować dla wybranych profili (np. "lista na weekend dla wszystkich")

Dodaj relacje Drizzle ORM.

### 1.2 Połączenie z bazą (`src/db/index.ts`)
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
```

### 1.3 Better Auth (`src/lib/auth.ts`)
- Skonfiguruj Better Auth z drizzleAdapter
- Włącz emailAndPassword
- Opcjonalnie Google OAuth
- Stwórz `src/lib/auth-client.ts` z createAuthClient

### 1.4 Auth API route
`src/app/api/auth/[...all]/route.ts` - toNextJsHandler(auth)

### 1.5 Push schema
```bash
npm run db:push
```

---

## FAZA 2: Typy i Utilities

### 2.1 Typy (`src/types/index.ts`)
- Export typów z InferSelectModel/InferInsertModel
- **Profile, NewProfile** - typy dla profili
- MealWithRelations, ShoppingListWithItems, DailyPlanWithMeals
- RandomizerFilters (dodaj isChildFriendly)
- INGREDIENT_CATEGORIES array
- UNITS array
- **PROFILE_COLORS** - tablica kolorów do wyboru dla avatarów profili

### 2.2 Utilities (`src/lib/utils.ts`)
- `cn()` - clsx + tailwind-merge
- `formatMinutes()` - "45 min" lub "1h 30min"
- `calculateTotalNutrition()` - suma kalorii/makr
- `aggregateIngredients()` - łączenie składników (3x cebula = 1 pozycja)
- `groupByCategory()` - grupowanie listy zakupów
- `getRandomItem()`, `getRandomItems()` - losowanie

---

## FAZA 3: Serwisy (logika biznesowa)

### 3.1 Profiles Service (`src/lib/services/profiles.ts`)
- `getProfilesByUserId(userId)` - lista profili (Tata, Mama, Zuzia)
- `getProfileById(profileId, userId)` - z weryfikacją własności
- `createProfile(userId, data)` - max 6 profili na konto
- `updateProfile(profileId, userId, data)`
- `deleteProfile(profileId, userId)` - nie można usunąć ostatniego
- `setActiveProfile(profileId, userId)` - do przełączania w UI

### 3.2 Meals Service (`src/lib/services/meals.ts`)
- `getMealsByUserId(userId)` - z relacjami
- `getMealById(mealId, userId)`
- `createMeal(data)` - z ingredientsList, tagIds, mealTypeIds
- `updateMeal(mealId, userId, data)`
- `deleteMeal(mealId, userId)`
- `getFilteredMeals(userId, filters)` - filtrowanie po makrach, tagach, czasie, dietach, **isChildFriendly**
- `randomizeSingleMeal(userId, filters)` - losuj 1 danie
- `randomizeDailyPlan(userId, profileId, mealTypeConfigs)` - losuj cały dzień **dla profilu** (respektuje cele kaloryczne!)

### 3.3 Ingredients Service (`src/lib/services/ingredients.ts`)
- CRUD dla składników
- Wyszukiwanie po nazwie

### 3.4 Shopping List Service (`src/lib/services/shopping-list.ts`)
- `getShoppingListsByUserId(userId)`
- `getShoppingListById(listId, userId)` - z itemsByCategory
- `generateShoppingListFromDateRange(userId, profileIds[], dateFrom, dateTo)` - **dla wybranych profili** z agregacją
- `generateShoppingListFromMeals(userId, mealIds, servingsMap)`
- `toggleShoppingListItem(itemId, 'checked' | 'inPantry')`
- `deleteShoppingList(listId, userId)`

### 3.5 Daily Plans Service (`src/lib/services/daily-plans.ts`)
- CRUD dla planów
- `getDailyPlanByDate(userId, profileId, date)` - **plan dla konkretnego profilu**
- `getDailyPlansByDateForAllProfiles(userId, date)` - widok rodzinny (wszystkie plany na dany dzień)
- `addMealToPlan(planId, mealId, mealTypeId)`
- `removeMealFromPlan(planMealId)`

---

## FAZA 4: Server Actions

### 4.1 Auth Actions (`src/app/actions/auth.ts`)
- Wrapper na Better Auth jeśli potrzebne

### 4.2 Meals Actions (`src/app/actions/meals.ts`)
```typescript
'use server'
export async function createMealAction(formData: FormData) { ... }
export async function updateMealAction(mealId: string, formData: FormData) { ... }
export async function deleteMealAction(mealId: string) { ... }
export async function randomizeMealAction(filters: RandomizerFilters) { ... }
```

### 4.3 Shopping Actions (`src/app/actions/shopping.ts`)
- generateShoppingListAction
- toggleItemAction

---

## FAZA 5: Komponenty UI

### 5.1 Layout i nawigacja
- `src/app/layout.tsx` - główny layout z Providers
- `src/components/Navbar.tsx` - nawigacja z auth status + **ProfileSwitcher**
- `src/components/Sidebar.tsx` - menu boczne (opcjonalnie)

### 5.2 Profile komponenty (Netflix-style!)
- `src/app/profiles/page.tsx` - "Kto ogląda?" / "Czyj plan?" - wybór profilu po zalogowaniu
- `src/app/profiles/manage/page.tsx` - zarządzanie profilami
- `src/components/profiles/ProfileCard.tsx` - avatar + imię (klikalne)
- `src/components/profiles/ProfileForm.tsx` - tworzenie/edycja profilu (imię, avatar, kolor, cele kaloryczne, isChild)
- `src/components/profiles/ProfileSwitcher.tsx` - dropdown w Navbar do szybkiego przełączania
- `src/components/profiles/ProfileAvatar.tsx` - okrągły avatar z inicjałami lub emoji

### 5.3 Auth komponenty
- `src/app/auth/login/page.tsx`
- `src/app/auth/register/page.tsx`
- `src/components/auth/LoginForm.tsx`
- `src/components/auth/RegisterForm.tsx`

### 5.4 Meals komponenty
- `src/app/meals/page.tsx` - lista dań
- `src/app/meals/new/page.tsx` - formularz nowego dania
- `src/app/meals/[id]/page.tsx` - szczegóły dania
- `src/app/meals/[id]/edit/page.tsx` - edycja
- `src/components/meals/MealCard.tsx` - karta dania (badge "Dla dzieci" jeśli isChildFriendly)
- `src/components/meals/MealForm.tsx` - formularz (reużywalny) + checkbox isChildFriendly
- `src/components/meals/IngredientPicker.tsx` - wybór składników z ilością
- `src/components/meals/TagPicker.tsx` - wybór tagów
- `src/components/meals/NutritionBadge.tsx` - wyświetlanie kalorii/makr

### 5.5 Randomizer komponenty
- `src/app/randomize/page.tsx` - główna strona losowania **dla aktywnego profilu**
- `src/components/randomize/RandomizerFilters.tsx` - filtry (typ posiłku, dieta, czas, **childFriendly**)
- `src/components/randomize/RandomMealResult.tsx` - wynik losowania z animacją
- `src/components/randomize/DailyPlanRandomizer.tsx` - losowanie całego dnia **z celami profilu**

### 5.6 Planner komponenty
- `src/app/planner/page.tsx` - widok tygodnia/dnia
- `src/components/planner/DayColumn.tsx` - kolumna dnia
- `src/components/planner/MealSlot.tsx` - slot na posiłek
- `src/components/planner/CalendarNav.tsx` - nawigacja po datach
- `src/components/planner/FamilyDayView.tsx` - **widok wszystkich profili na dany dzień** (kolumny: Tata | Mama | Zuzia)
- `src/components/planner/ProfileTabs.tsx` - **przełączanie między profilami w planerze**

### 5.7 Shopping komponenty
- `src/app/shopping/page.tsx` - lista list zakupów
- `src/app/shopping/[id]/page.tsx` - szczegóły listy
- `src/components/shopping/ShoppingListCard.tsx`
- `src/components/shopping/ShoppingItem.tsx` - item z checkbox
- `src/components/shopping/CategorySection.tsx` - sekcja kategorii
- `src/components/shopping/GenerateListModal.tsx` - modal z **wyborem profili** (checkboxy: dla kogo generujemy listę)

### 5.8 Shared komponenty (`src/components/ui/`)
- Button, Input, Select, Checkbox, Modal, Card, Badge, Spinner, Toast

---

## FAZA 6: Strony i routing

```
src/app/
├── page.tsx                    # Landing page
├── layout.tsx                  # Root layout
├── auth/
│   ├── login/page.tsx
│   └── register/page.tsx
├── profiles/
│   ├── page.tsx               # "Kto ogląda?" - wybór profilu (po zalogowaniu)
│   └── manage/page.tsx        # Zarządzanie profilami
├── meals/
│   ├── page.tsx               # Lista dań (współdzielona)
│   ├── new/page.tsx           # Nowe danie
│   └── [id]/
│       ├── page.tsx           # Szczegóły
│       └── edit/page.tsx      # Edycja
├── randomize/
│   └── page.tsx               # Losowanie (dla aktywnego profilu)
├── planner/
│   ├── page.tsx               # Planer tygodnia (aktywny profil)
│   └── family/page.tsx        # Widok rodzinny (wszystkie profile)
├── shopping/
│   ├── page.tsx               # Lista list
│   └── [id]/page.tsx          # Szczegóły listy
├── settings/
│   └── page.tsx               # Ustawienia konta
└── api/
    └── auth/[...all]/route.ts
```

**Flow użytkownika:**
1. Login → /profiles (wybór profilu) → /planner (lub inna strona)
2. ProfileSwitcher w Navbar pozwala szybko zmienić profil bez wracania do /profiles

---

## FAZA 7: Middleware i ochrona

### 7.1 Middleware (`src/middleware.ts`)
- Sprawdzaj sesję Better Auth
- Chroń routes: /profiles, /meals, /randomize, /planner, /shopping, /settings
- Redirect niezalogowanych do /auth/login
- **Redirect zalogowanych bez wybranego profilu do /profiles**

### 7.2 Profile Context (`src/contexts/ProfileContext.tsx`)
- React Context dla aktywnego profilu
- `useProfile()` hook - zwraca aktywny profil
- `useProfiles()` hook - zwraca wszystkie profile usera
- Persist aktywny profileId w localStorage/cookie

---

## FAZA 8: Seed data

### 8.1 Script seedowania (`scripts/seed.ts`)
Dodaj przykładowe dane dla nowego użytkownika:
- **Domyślne profile przy rejestracji:** Stwórz pierwszy profil z imieniem usera
- Domyślne mealTypes: Śniadanie, Obiad, Kolacja, Przekąska
- Przykładowe składniki z kategoriami
- 5-10 przykładowych dań z przepisami (część z isChildFriendly=true)

---

## FAZA 9: Nice-to-have (później)

- [ ] PWA manifest dla mobile
- [ ] Dark mode
- [ ] Eksport listy do tekstu/Reminders
- [ ] Import przepisów z URL (web scraping)
- [ ] Zdjęcia dań (upload do Cloudinary/S3)
- [ ] Gamifikacja - streak, odznaki
- [ ] Historia - "co jadłem tydzień temu"
- [ ] Skalowanie porcji w przepisie

---

## Komendy do zapamiętania

```bash
npm run dev           # Development
npm run build         # Production build
npm run db:push       # Push schema do Neon
npm run db:studio     # Drizzle Studio (przeglądarka bazy)
npm run db:generate   # Generuj migracje
```

---

## Uwagi dla Claude Code

1. **Używaj Server Components** gdzie możliwe, Client Components tylko dla interaktywności
2. **Server Actions** zamiast API routes dla mutacji
3. **Zod** do walidacji formularzy
4. **React Query** opcjonalnie dla client-side cache
5. **Tailwind** - używaj design systemu z primary colors (green/emerald)
6. **Polskie UI** - wszystkie teksty po polsku
7. **Responsywność** - mobile-first approach
8. **Loading states** - Suspense + loading.tsx
9. **Error handling** - error.tsx + try/catch w actions

Powodzenia! 🚀
