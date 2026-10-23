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
- **AI fallback recipe**: one Claude-generated German recipe
  when the API results are weak or unavailable (rules in section 4)
- **Favorites**: save, list, open, and remove favorites, for both Spoonacular and
  AI-generated recipes

### Business rules

- A recipe's **missing count** = missed ingredients minus spices and
  pantry basics
- **Ranking**: ascending missing count; ties broken by more of my ingredients
  used
- **AI fallback triggers** when either:
  - fewer than 3 API recipes have a missing count of 2 or less, or
  - Spoonacular fails, times out, or the daily quota is exhausted (the results
    then show a note that live recipes are unavailable)
- At most one AI recipe per search. It is clearly labelled as AI-generated and
  uses only the entered ingredients plus spices and pantry basics
- Translation: German ingredients are translated to English for the search;
  result titles are translated for the list; full recipes are translated only
  when opened

### Edge cases to handle

- Empty ingredient list: search is disabled
- Unrecognized or ambiguous ingredient (e.g. "Paprika" as vegetable vs spice):
  the translation step resolves to the most likely cooking meaning
- No results and AI also fails: clear German error message
- Spoonacular quota exhausted: fallback rule above; cached recipes still open
- Translation fails (Claude Pro usage limit reached or `claude` CLI
  unavailable): result titles, ingredients, and recipes are shown in English
  with a short German note; only if translating the entered ingredients fails
  does the search show a clear German error message
- Opening a favorite whose source recipe is no longer cached: refetch and
  retranslate

### Explicit non-goals (MVP)

- Diet and intolerance filters (later)
- Shopping list for missing ingredients (later)
- Saved pantry or "always available" list (spice/pantry rules cover this)
- Accounts, multi-user, hosting
- Crawling recipe websites or importing datasets
- Nutrition information, meal planning

## 4. Data - What are we storing?

Local JSON files under `backend/data/` (git-ignored):

- **Favorites** (`favorites.json`): list of saved recipes with source
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
- **Recipe API**: Spoonacular. Planned endpoint `complexSearch` with
  `includeIngredients`, `fillIngredients`, `sort=min-missing-ingredients`,
  `maxReadyTime`, `ignorePantry`; recipe details via the recipe information
  endpoint with metric measures. Confirm exact parameters in the first feature
  spec. Free tier has a small daily point quota, so caching matters
- **LLM**: Claude via the Claude Code CLI in headless mode (`claude -p`),
  authenticated with my Claude Pro subscription, so there are no extra API
  costs; calls count against the Pro usage limit. Haiku for translation; a
  stronger model for the fallback recipe. Exact models chosen in the feature spec
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
  plus the max-time filter at the top, recipe cards grid below
- Cards: food photo, German title, cooking time, "fehlt: x" missing count, used
  and missing ingredients
- AI recipe card visually distinct and labelled (e.g. "KI-Vorschlag")
- Detail view for a recipe (page or modal, decided in the feature spec) with German
  ingredients and steps, and a favorite toggle
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

- Exact Claude model ids and prompt format for translation
- Exact search result count to fetch for local re-ranking
- Whether search results are cached in addition to recipe details
- Detail as separate route or modal