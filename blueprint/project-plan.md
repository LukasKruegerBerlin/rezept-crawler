# Project Plan

## 1. Problem - What problem are we solving?

I often have a handful of ingredients at home and no idea what to cook with them.
Recipe sites are organized around dishes, not around what is already in the
fridge. Recipe Crawler turns that around: I enter the ingredients I have and get
recipe suggestions I can cook right now, or with very few missing ingredients, all in
German.

Desired outcome: from "I have zucchini, eggs, feta and onions" to a concrete,
readable German recipe in under a minute, without shopping.

## 2. Users - Who is this for?

Just me, as a personal tool running locally on my machine.

- Single user, no accounts, no login
- Primary workflow: enter today's ingredients, optionally set a max
  cooking time, browse ranked suggestions, open one, cook it, optionally save it as a favorite
- I have a well-stocked spice rack and substitute spices freely, so spices
  should never stop a recipe from being suggested

## 3. Features - What does the MVP need?

- **Ingredient search**: enter a fresh list of ingredients for each
  search; nothing about the list is persisted
- **Ingredient autocomplete**: while typing, up to 5 previously translated
  ingredients that start with the input are suggested; arrow keys and Enter
  pick one, plain Enter adds the typed text unchanged
- **Ranked results from Spoonacular**: recipes ordered by fewest missing
  ingredients, showing German title, image, cooking time, used and missing
  ingredients
- **Spices never count as missing**: ingredients Spoonacular classifies as spices
  and seasonings are excluded from the missing count, ranking, and fallback
  threshold (still listed in the recipe itself). Pantry basics (water, salt,
  flour, etc.) are ignored via Spoonacular's `ignorePantry`
- **German recipe detail page**: full recipe (ingredients with metric amounts,
  steps) fetched and translated when opened, then cached locally
- **Max cooking time filter**: e.g. only recipes ready in 30 minutes or less
- **Missing ingredients filter**: only recipes with at most N missing
  ingredients (missing count as defined in the business rules)
- **AI recipe on request**: one Claude-generated German recipe, only generated
  when I ask for it; offered after every search and highlighted when the API
  results are weak or unavailable (rules below)
- **Favorites**: save, list, open, and remove favorites, for both Spoonacular and
  AI-generated recipes

### Business rules

- A recipe's **missing count** = missed ingredients minus spices and
  pantry basics
- **Ranking**: ascending missing count; ties broken by more of my ingredients
  used
- **AI recipe is never generated automatically.** After every search a
  "KI-Rezept erstellen" button is offered. It is highlighted in a message when
  either:
  - fewer than 3 API recipes have a missing count of 2 or less (the message
    states how many recipes were found), or
  - Spoonacular fails, times out, or the daily quota is exhausted (the message
    states that live recipes are unavailable)
- When the missing ingredients filter is set, the "fewer than 3" threshold
  counts the recipes shown after the filter instead (fewer than 3 visible
  cards), and the message states that number. Without the filter, the
  "missing count of 2 or less" rule above applies
- The found recipes stay browsable; the AI recipe can still be requested after
  looking at them
- At most one AI recipe per search. It is clearly labelled as AI-generated and
  uses only the entered ingredients plus spices and pantry basics
- Translation: German ingredients are translated to English for the search;
  result titles are translated for the list; full recipes are translated only
  when opened

### Edge cases to handle

- Empty ingredient list: search is disabled
- Unrecognized or ambiguous ingredient (e.g. "Paprika" as vegetable vs spice):
  the translation step resolves to the most likely cooking meaning
- AI generation fails: clear German error message; the request can be retried
- Spoonacular quota exhausted: AI recipe rule above; cached recipes still open
- Translation fails (Claude Pro usage limit reached or `claude` CLI
  unavailable): result titles, ingredients, and recipes are shown in English
  with a short German note; only if translating the entered ingredients fails
  does the search show a clear German error message
- Opening a favorite whose source recipe is no longer cached: refetch and
  retranslate

### Explicit non-goals (MVP)

- Diet and intolerance filters (later)
- Shopping list for missing ingredients (later)
- Better search relevance via `sort=max-used-ingredients` (later)
- Faster search: fewer or faster `claude -p` calls (later)
- Correcting translations in the UI by editing dictionary entries (later)
- Saved pantry or "always available" list (spice/pantry rules cover this)
- Accounts, multi-user, hosting
- Crawling recipe websites or importing datasets
- Nutrition information, meal planning

## 4. Data - What are we storing?

Local JSON files under `backend/data/` (git-ignored):

- **Favorites** (`favorites.json`): list of saved recipes with a stable
  favorite id (used to open and remove it, also for AI favorites), source
  (`spoonacular` or `ai`), Spoonacular id when applicable, German title, saved
  date. AI favorites store the full generated recipe, because it cannot be
  refetched
- **Translated recipe cache** (one file per Spoonacular recipe id): the German
  translation of a recipe's detail, so each recipe is fetched and translated
  only once
- **Translation dictionary** (`translations.json`): every German -> English
  ingredient translation and every English -> German title, ingredient name,
  and unit translation, so Claude is only asked for texts it has never
  translated before (Claude calls are slow). Cooking steps are not included.
  Its German ingredient entries also feed the ingredient autocomplete
- **Search result cache** (optional, decided in feature specs): to save
  Spoonacular quota for repeated searches

Not stored: ingredient lists, search history, any user data

## 5. Tech - What stack are we using?

- **Backend**: Python 3.13, FastAPI, managed with uv (scaffolded in `backend/`)
- **Frontend**: React 19 + TypeScript + Vite, npm (scaffolded in `frontend/`),
  Vite dev proxy for `/api`
- **Styling**: Tailwind CSS
- **Recipe API**: Spoonacular. Endpoint `complexSearch` with
  `includeIngredients`, `fillIngredients`, `sort=min-missing-ingredients`,
  `maxReadyTime`, `ignorePantry`, and `number=20` (fetched for local
  re-ranking); recipe details via the recipe information endpoint with metric
  measures. `sort=max-used-ingredients` tested better for relevance; switching
  is a later build-plan item. Free tier has a small daily point quota, so
  caching matters
- **LLM**: Claude via the Claude Code CLI in headless mode (`claude -p`),
  authenticated with my Claude Pro subscription, so there are no extra API
  costs; calls count against the Pro usage limit. Model alias `haiku` for
  translation, `sonnet` for the AI recipe
- **Storage**: JSON files on disk (single user, no concurrency concerns)
- **Secrets**: `SPOONACULAR_API_KEY` in `backend/.env`, never committed. No
  Anthropic API key: `ANTHROPIC_API_KEY` must not reach the CLI, otherwise it
  bills the API instead of the subscription
- The frontend never calls Spoonacular or Claude directly; all external calls
  go through the backend

## 6. Monetize - How will this make money?

Not applicable. Personal tool. Running costs are Spoonacular (free tier); Claude
usage is covered by my existing Claude Pro subscription.

## 7. UI/UX - How should this look and feel?

Clean and minimal, German UI text throughout.

- Single main page: ingredient input as chips (type, Enter to add, x to remove)
  plus the max-time and missing-ingredients filters at the top, recipe cards
  grid below
- Above the grid: the "KI-Rezept erstellen" button, inside a highlighted
  message when results are weak or live recipes are unavailable
- Cards: food photo, German title, cooking time, "fehlt: x" missing count, used
  and missing ingredients
- AI recipe card visually distinct and labelled (e.g. "KI-Vorschlag")
- Detail view for a recipe as a modal, with German ingredients and steps, and
  a favorite toggle
- Favorites reachable from the header
- Light theme, generous whitespace; photos carry the visual weight
- Every request shows loading, empty, and error states; translation can take a
  moment, so loading feedback matters
- Basic accessibility: keyboard-usable input and buttons, alt text, sufficient
  contrast

## 8. Deployment - Where and how will this ship?

Local only. Run the backend (`uv run fastapi dev app/main.py`, port 8000) and
frontend (`npm run dev`, port 5173) dev servers. No hosting, no domain, no CI
requirement. Requires the `claude` CLI installed and logged in with my Pro
account.

## 9. Usage model and constraints

- Single trusted user, local machine only, not internet-facing
- No auth, no rate limiting beyond respecting the Spoonacular quota
- Non-requirements: multi-user, multi-tenant, compliance, high availability

## Open decisions (safe to defer to feature specs)

- Whether search results are cached in addition to recipe details
- Form of the favorite id (decided in the Favorites spec)