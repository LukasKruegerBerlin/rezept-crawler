# Recipe Crawler - Project Overview

<!-- blueprint:source-hash d5066b448709e2b4ed977d013f8ba2cd2bd83b4333a745acc20f52d8e4c646aa -->

> Local personal tool: enter the ingredients you have, get ranked German recipe suggestions you can cook now or with very few missing ingredients.

## Problem

Recipe sites are organized around dishes, not around what is already in the
fridge. Recipe Crawler turns that around: enter today's ingredients and get
readable German recipes to cook right away. Goal: from "I have zucchini, eggs,
feta and onions" to a concrete German recipe in under a minute, without shopping.

## Users

- **One user (the owner)** running it locally. No accounts, no login.
- Workflow: enter ingredients -> optionally set max cooking time -> browse ranked
  suggestions -> open one -> cook -> optionally save as favorite.
- Has a well-stocked spice rack: spices must never stop a recipe from being suggested.

## Usage model

- Single trusted user, local machine only, not internet-facing.
- No auth, no rate limiting beyond respecting the Spoonacular daily quota.
- Non-requirements: multi-user, multi-tenant, compliance, high availability, hosting.

## Features

Build-plan order (MVP). Headline: **1. Ingredient search**.

1. **Ingredient search** - German ingredient chips, translated to English via
   Claude, Spoonacular search, German result cards ranked by fewest missing
   ingredients (spices and pantry basics excluded). Sets up Tailwind.
2. **Recipe detail** - open a result as a full German recipe (metric
   ingredients, steps), translated on demand and cached in local JSON.
3. **Cooking time filter** - limit results to a maximum ready time
   (e.g. <= 30 min) via Spoonacular `maxReadyTime`.
4. **AI fallback recipe** - one labelled Claude-generated German recipe when API
   results are weak or Spoonacular is unavailable.
5. **Favorites** - save, list, open, remove Spoonacular and AI recipes in local JSON.
6. **UI polish** - consistent minimal layout, loading/empty/error states,
   keyboard accessibility across all views.

Later (not tracked yet): diet and intolerance filters; shopping list for missing
ingredients.

### Business rules

- **Missing count** = Spoonacular missed ingredients minus spices/seasonings
  (by Spoonacular classification) and pantry basics (water, salt, flour, etc.,
  ignored via `ignorePantry`). Spices stay listed in the recipe itself.
- **Ranking**: ascending missing count; ties -> more of the user's ingredients used.
- **AI fallback triggers** when either:
  - fewer than 3 API recipes have missing count <= 2, or
  - Spoonacular fails, times out, or quota is exhausted (results show a note
    that live recipes are unavailable).
- **At most one AI recipe per search**, clearly labelled as AI-generated
  ("KI-Vorschlag"); uses only the entered ingredients plus spices and pantry basics.
- **Translation**: German ingredients -> English for the search; result titles
  translated for the list; full recipes translated only when opened.

### Edge cases

- Empty ingredient list: search disabled.
- Ambiguous ingredient (e.g. "Paprika" vegetable vs spice): translation resolves
  to the most likely cooking meaning.
- No results and AI also fails: clear German error message.
- Quota exhausted: fallback rule applies; cached recipes still open.
- Translation fails (Pro usage limit reached or `claude` CLI unavailable):
  result titles, ingredients, and recipes are shown in English with a short
  German note. Only a failed translation of the entered ingredients stops the
  search with a German error message.
- Favorite whose Spoonacular recipe is no longer cached: refetch and retranslate.

### Non-goals (MVP)

Diet/intolerance filters, shopping list, saved pantry / "always available"
list, accounts, multi-user, hosting, crawling websites or importing datasets,
nutrition info, meal planning.

## Data model

All persistence is local JSON under `backend/data/` (git-ignored). No database.
Ingredient lists, search history, and user data are **not** stored.

### RecipeDetail (shared shape, German)

- `source` ("spoonacular" | "ai")
- `spoonacular_id` (int | null) - set when `source = "spoonacular"`
- `title` (str) - German
- `image` (str URL | null) - AI recipes have none
- `ready_in_minutes` (int | null)
- `ingredients` (list of IngredientLine)
- `steps` (list[str]) - German, in order

### IngredientLine

- `name` (str) - German
- `amount` (float | null) - metric
- `unit` (str) - metric unit, may be empty

### Translated recipe cache - `backend/data/recipes/<spoonacular_id>.json`

- One file per Spoonacular recipe id holding one `RecipeDetail`.
- Written the first time a recipe is opened; each recipe is fetched and
  translated only once.
- Only successful German translations are cached, so an English fallback is
  retranslated on the next open (derived from the translation-fallback rule).

### Favorite - `backend/data/favorites.json` (list)

- `id` (str) - stable key for open/remove
- `source` ("spoonacular" | "ai")
- `spoonacular_id` (int | null)
- `title` (str) - German
- `saved_at` (ISO-8601 datetime)
- `recipe` (RecipeDetail | null) - required for `ai` (cannot be refetched);
  null for `spoonacular` (opened via the recipe cache)

> TODO: the plan names no favorite key. `id` is needed to remove AI favorites;
> confirm its form in the Favorites spec.

### RecipeSummary (search result, not persisted)

- `spoonacular_id` (int | null), `source` ("spoonacular" | "ai")
- `title` (str), `image` (str | null), `ready_in_minutes` (int | null)
- `used_ingredients`, `missing_ingredients` (list[str])
- `missing_count` (int) - per business rule above
- Text is German, or English when result translation failed.

### SearchResponse (not persisted)

- `results` (list[RecipeSummary]) - ranked
- `translated` (bool) - false when results are in English (translation failed);
  the UI then shows a short German note
- `ai_recipe` (RecipeDetail | null) - at most one
- `live_unavailable` (bool) - Spoonacular failed, timed out, or quota exhausted

### Search/translation cache (optional)

Whether to cache search results or translations for repeated searches is
decided in a feature spec. Shape is not locked.

> Lock `RecipeDetail` in Feature 2: favorites (5) and the AI fallback (4) reuse it.

## Tech stack

- **Backend**: Python 3.13, FastAPI, uv (`backend/`). Serves JSON under `/api`.
- **Frontend**: React 19 + TypeScript + Vite, npm (`frontend/`); Vite proxies `/api` to port 8000.
- **Styling**: Tailwind CSS (added in Feature 1).
- **Recipe API**: Spoonacular `complexSearch` (`includeIngredients`,
  `fillIngredients`, `sort=min-missing-ingredients`, `maxReadyTime`,
  `ignorePantry`); details via the recipe information endpoint with metric
  measures. Confirm exact parameters in Feature 1. Free tier has a small daily
  point quota, so caching matters.
- **LLM**: Claude via the Claude Code CLI in headless mode (`claude -p`),
  authenticated with the owner's Claude Pro subscription - no extra API costs;
  calls count against the Pro usage limit. Haiku for translation; a stronger
  model for the fallback recipe. Models chosen in specs.
- **Storage**: JSON files on disk (single user, no concurrency concerns).
- **Secrets**: `SPOONACULAR_API_KEY` in `backend/.env`, never committed. No
  Anthropic API key: `ANTHROPIC_API_KEY` must never reach the CLI subprocess,
  or it bills the API instead of the subscription.
- **Boundary**: the frontend never calls Spoonacular or Claude directly; all
  external calls go through the backend.

## Monetization

None. Personal tool. Running costs: Spoonacular free tier; Claude usage is
covered by the existing Claude Pro subscription.

## UI/UX

Clean and minimal, German UI text throughout, light theme, generous whitespace;
photos carry the visual weight.

- **Main page**: ingredient chips input (type, Enter to add, x to remove) and
  max-time filter at the top; recipe card grid below.
- **Recipe card**: photo, German title, cooking time, "fehlt: x" missing count,
  used and missing ingredients. AI card visually distinct, labelled "KI-Vorschlag".
- **Detail view**: German ingredients and steps, favorite toggle. Page or modal
  is decided in the Recipe detail spec.
- **Favorites**: reachable from the header.
- Every request shows loading, empty, and error states; translation is slow, so
  loading feedback matters.
- Accessibility: keyboard-usable input and buttons, alt text, sufficient contrast.

## Deployment

Local only. Backend `uv run fastapi dev app/main.py` (port 8000), frontend
`npm run dev` (port 5173). Requires `backend/.env` with `SPOONACULAR_API_KEY`
and the `claude` CLI installed and logged in with the Pro account. No hosting,
domain, or CI requirement.

## Open questions

Deferred to feature specs by the plan:

- Exact Claude model ids and translation prompt format.
- How many search results to fetch for local re-ranking.
- Whether search results are cached in addition to recipe details.
- Detail view as separate route or modal.
- Favorite `id` form (see Data model).
