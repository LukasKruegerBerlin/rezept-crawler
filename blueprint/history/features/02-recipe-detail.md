# Feature: Recipe detail

**From build-plan:** feature 2
**Build attempt:** 1
**Branch:** feature/recipe-detail
**Status:** verified

## Goal

Open a search result as a full German recipe (title, photo, cooking time,
ingredients with metric amounts, ordered steps). The recipe is fetched from
Spoonacular and translated only when opened, then cached as local JSON so every
recipe is fetched and translated once.

## In scope

- Backend `GET /api/recipes/{spoonacular_id}`: cache first, otherwise Spoonacular
  recipe information (metric measures) -> German translation -> cache write.
- The shared `RecipeDetail` shape, locked here for AI fallback (4) and Favorites (5).
- Translation fallback: if translating fails, return the recipe in English with
  `translated: false` and do **not** cache it, so the next open retries.
- Cached recipes open even when Spoonacular is down, out of quota, or the API key
  is missing.
- Shared translation dictionary `backend/data/translations.json` so the slow
  `claude` CLI is called as rarely as possible:
  - German -> English: entered ingredients already translated once are looked
    up instead of translated again.
  - English -> German: recipe titles, ingredient names, and units already
    translated once (in a search or an opened recipe) are reused everywhere.
  - Only unknown texts go to the CLI; when nothing is unknown, no call is made.
    Cooking steps are not stored there (they live in the recipe cache).
- Replaces the earlier id-based reuse (step 3): `spoonacular_ingredient_id` is
  removed again, because the dictionary covers it.
- `backend/data/` added to `.gitignore` (the plan requires it git-ignored).
- Frontend: each result card opens the detail in a modal (native `<dialog>`),
  with loading, error, and English-fallback note states.

## Out of scope

- Favorite toggle and favorites storage (Feature 5); the modal leaves room for it.
- AI-generated recipes (Feature 4); `source` is always `"spoonacular"` here.
- Cooking time filter (3), search caching, search relevance/speed items.
- URL routing / deep links to a recipe.
- Nutrition, servings scaling, shopping list.

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then one review packet
for the whole feature. `workflow.checkpointCommits` is `disabled`: no per-step
commits; `/complete` creates the single feature commit.

## Build steps

- [x] **1. Backend: fetch recipe detail in English.**
  Add `get_recipe_information(recipe_id)` to `backend/app/spoonacular.py`
  calling `https://api.spoonacular.com/recipes/{id}/information` with
  `includeNutrition=false`, reusing `TIMEOUT_SECONDS` and the existing quota (402)
  / unavailable error handling, plus a new `SpoonacularNotFoundError` for 404.
  Add `backend/app/models.py` with the shared `RecipeDetail` / `IngredientLine`
  models (see Data / contracts; shared by the endpoint, cache, and search) and
  `backend/app/routers/recipes.py` with `RecipeDetailResponse`, a pure
  `to_recipe_detail(raw)` mapper, and `GET /api/recipes/{spoonacular_id}`;
  register the router in `backend/app/main.py`. No translation or cache yet
  (`translated: false`).
  Mapping: `title` via `html.unescape`; `image`; `readyInMinutes`; each
  `extendedIngredients[]` -> `id` (as `spoonacular_ingredient_id`), `name`,
  `measures.metric.amount`, `measures.metric.unitShort`; `steps` = every `analyzedInstructions[].steps[].step`
  in order. Confirm these field names against one real response before relying
  on them.
  **Done when:** `GET /api/recipes/<id from a search>` in `/docs` returns the
  English detail with metric amounts and ordered steps; an unknown id returns 404
  with a German `detail`; `uv run ruff check .` and `uv run ruff format --check .`
  pass.

- [x] **2. Backend: German translation and local cache.**
  Add `recipe_to_german(texts)` in `backend/app/translation.py` with its own
  system prompt for recipe titles, ingredient names, measurement units (e.g.
  `Tbsp` -> `EL`, `tsp` -> `TL`), and cooking steps, reusing `_translate`
  (same model, timeout, env scrubbing). Translate title, all ingredient names,
  distinct non-empty units, and all steps in **one** batched call, deduplicated
  like `_german_texts` in `routers/search.py`.
  Add `backend/app/recipe_cache.py`: `DATA_DIR = backend/data`, files at
  `backend/data/recipes/<spoonacular_id>.json`; `load(id) -> RecipeDetail | None`
  (missing, unreadable, or invalid file = cache miss) and `save(detail)` (create
  directories, write to a temp file in the same directory, then `os.replace`).
  Endpoint order: cache hit -> return `translated: true` without touching
  Spoonacular or the API key; miss -> key check -> fetch -> translate -> save ->
  return. On `TranslationError`, return the English detail with
  `translated: false` and skip `save`. Add `backend/data/` to `.gitignore`.
  **Done when:** opening a recipe the first time returns German text and creates
  `backend/data/recipes/<id>.json`; a second request returns it without a
  Spoonacular call (e.g. still works with the key temporarily removed); with
  `claude` unavailable (e.g. `PATH` without it) the response is English with
  `translated: false` and no cache file appears; `git status` does not show
  `backend/data/`; ruff check and format pass.

- [x] **3. Backend: search reuses cached translations.** _(Replaced by steps 5 and 6.)_
  In `backend/app/ranking.py`, carry each used/missed ingredient's Spoonacular
  `id` alongside its name in `RankedRecipe` (names, missing count, and ranking
  stay unchanged). In `backend/app/routers/search.py`, `recipe_cache.load` each
  result's `spoonacular_id` before translating. For a hit, the title comes from
  `cached.title`, and each used/missing ingredient whose id matches a cached
  `spoonacular_ingredient_id` takes that line's German `name` (first match if
  an id appears twice). All remaining texts go to `to_german` in one batched,
  deduplicated call as today; when none remain, no CLI call is made. On
  `TranslationError`, cached texts stay German, the rest falls back to English,
  and `translated` is `false` (unchanged meaning: some text is English).
  Confirm against a real response that search ingredient ids match
  `extendedIngredients[].id`; unmatched ingredients are translated as before.
  **Done when:** after opening a recipe once, a repeated search shows that card's
  German title and ingredients from the cache; a search where every result and
  ingredient is cached makes no result-translation (`to_german`) call (the
  German-to-English ingredient call for the search input always runs); with
  `to_german` failing, cached cards stay German; ruff check and format pass.

- [x] **4. Frontend: detail modal opened from the result cards.**
  Add `frontend/src/api/recipes.ts` (`RecipeDetail` types and
  `fetchRecipeDetail(id)`, reusing the error/`detail` handling pattern from
  `api/search.ts`; extract the shared `readDetail` helper rather than copying it),
  `frontend/src/hooks/useRecipeDetail.ts` (idle / loading / success / error,
  latest-request-wins like `useRecipeSearch`), and
  `frontend/src/components/RecipeDetailDialog.tsx` using native
  `<dialog>` + `showModal()`.
  In `RecipeCard`, make the title a `<button>` whose stretched `after:` overlay
  makes the whole card clickable (keeps the card's `h3`/`dl` valid, no block
  content inside a button), with a visible focus ring. `App.tsx` holds the
  selected recipe id and renders the dialog.
  Dialog content: photo (alt = title) or neutral placeholder, German title as
  the dialog's accessible name (`aria-labelledby`), cooking time ("x Min."),
  "Zutaten" list (amount formatted with `Intl.NumberFormat('de-DE',
  { maximumFractionDigits: 2 })`, then unit, then name; amount/unit omitted when
  null/empty), "Zubereitung" as an ordered list; if `steps` is empty, show
  "Für dieses Rezept sind keine Zubereitungsschritte verfügbar."
  States: loading shows "Rezept wird geladen und übersetzt…" in a `role="status"`
  region (`aria-busy`); error shows the backend's German `detail` (fallback
  "Das Rezept konnte nicht geladen werden.") in `role="alert"`; `translated:
  false` shows the amber note "Übersetzung gerade nicht verfügbar – das Rezept
  wird auf Englisch angezeigt." A "Schließen" button, Esc, and backdrop click
  close the dialog; focus returns to the card button that opened it. All text is
  rendered as React text (no `dangerouslySetInnerHTML`).
  **Done when:** after a search, clicking or keyboard-activating (Tab + Enter) a
  card opens the modal with loading feedback, then the German recipe; Esc and
  "Schließen" close it and focus returns to the card; reopening a cached recipe is
  near-instant; stopping the backend shows the German error in the modal;
  `npm run build` and `npm run lint` pass.

- [x] **5. Backend: translation dictionary and German-to-English reuse.**
  Move `DATA_DIR` and the atomic write (temp file + `os.replace`) from
  `recipe_cache.py` into a small `backend/app/storage.py` and use it from both
  caches. Add `backend/app/glossary.py` for `backend/data/translations.json`:
  `load() -> Glossary` (Pydantic model with `de_en: dict[str, str]` and
  `en_de: dict[str, str]`; a missing, unreadable, or invalid file = empty
  dictionary) and `add(de_en=..., en_de=...)`, which reloads, merges without
  overwriting existing entries (first translation wins, so search and detail
  stay consistent), and writes atomically.
  German keys are normalized with `strip().casefold()` ("Eier", "eier " ->
  "eier"); English keys are the exact Spoonacular text.
  In `routers/search.py`, look up each entered ingredient in `de_en`; send only
  unknown ones (deduplicated) to `ingredients_to_english`, store the new pairs,
  and build the English list in input order. No CLI call when all are known.
  **Done when:** a second search with the same (or differently capitalized)
  ingredients makes no `ingredients_to_english` call and returns the same
  results; `translations.json` contains the pairs; a translation failure stores
  nothing and still returns the existing German error; ruff check and format pass.

- [x] **6. Backend: English-to-German reuse in search and detail.**
  Search: titles and used/missing ingredient names are looked up in `en_de`;
  only unknown texts go to `to_german` in one batched call, and successful
  results are stored. This replaces step 3: remove `_cached_texts`, the
  ingredient ids in `ranking.py`, and `spoonacular_ingredient_id` from
  `IngredientLine` (existing cache files still load, Pydantic ignores the extra
  field). `translated` keeps its meaning (false when some text stayed English).
  Detail: title, ingredient names, and non-empty units are looked up in
  `en_de`; unknown ones plus all steps go to `recipe_to_german` in one call
  (no call if nothing is left, e.g. a recipe without steps whose texts are all
  known). After success, store the new title, ingredient, and unit pairs (not
  steps) and save the recipe as before. On `TranslationError`, nothing is
  stored and the English fallback is unchanged.
  **Done when:** after one search, opening a result whose title and ingredients
  are known sends only steps and unknown texts to `recipe_to_german`; a repeated
  search with known ingredients and results makes no `claude` call at all; with
  `to_german` failing, known texts stay German and `translated` is false;
  ruff check and format pass.

## Files / areas

- `backend/app/spoonacular.py` - new `get_recipe_information`, `SpoonacularNotFoundError`
- `backend/app/translation.py` - new recipe prompt and `recipe_to_german`
- `backend/app/recipe_cache.py` - new, JSON file cache
- `backend/app/storage.py` - new, `DATA_DIR` and atomic JSON write
- `backend/app/glossary.py` - new, translation dictionary
- `backend/app/models.py` - new, shared `RecipeDetail` / `IngredientLine`
- `backend/app/routers/recipes.py` - new, endpoint, mapper, translation
- `backend/app/main.py` - include the recipes router
- `backend/app/routers/search.py` - dictionary lookup before both translations
- `.gitignore` - add `backend/data/`
- `frontend/src/api/recipes.ts`, `frontend/src/api/search.ts` (shared `readDetail`)
- `frontend/src/hooks/useRecipeDetail.ts` - new
- `frontend/src/components/RecipeDetailDialog.tsx` - new
- `frontend/src/components/RecipeCard.tsx`, `frontend/src/App.tsx`

## Data / contracts

### `GET /api/recipes/{spoonacular_id}`

- Path param: `int`, `> 0` (FastAPI `Path(gt=0)`); invalid ids get FastAPI's 422.
  The int type also keeps the cache filename safe from path traversal.
- 200 -> `RecipeDetailResponse`:

```json
{
  "recipe": {
    "source": "spoonacular",
    "spoonacular_id": 715415,
    "title": "Rote Linsensuppe mit Hähnchen",
    "image": "https://img.spoonacular.com/recipes/715415-556x370.jpg",
    "ready_in_minutes": 55,
    "ingredients": [
      { "name": "Karotten", "amount": 2.0, "unit": "" }
    ],
    "steps": ["Das Öl in einem großen Topf erhitzen.", "..."]
  },
  "translated": true
}
```

- Errors (all `{"detail": "<German message>"}`), only reached on a cache miss:
  - 404 `Rezept nicht gefunden.` (Spoonacular 404)
  - 503 `Das Spoonacular-Tageskontingent ist aufgebraucht.` (402)
  - 502 `Live-Rezepte sind gerade nicht verfügbar.` (network, timeout, non-2xx, bad JSON)
  - 500 `API-Schlüssel fehlt. Bitte backend/.env prüfen.` (no key)
  - Translation failure is not an error: 200 with `translated: false`.

### `RecipeDetail` (persisted and shared; locked for features 4 and 5)

- `source`: `Literal["spoonacular", "ai"]` (this feature only produces `"spoonacular"`)
- `spoonacular_id`: `int | None` (set for `spoonacular`)
- `title`: `str` (German)
- `image`: `str | None`
- `ready_in_minutes`: `int | None`
- `ingredients`: `list[IngredientLine]`
- `steps`: `list[str]` (German, in order; may be empty)

`IngredientLine`: `name: str` (German), `amount: float | None` (metric),
`unit: str` (metric short unit, German, may be `""`). No English text is stored
in recipe files.

### Cache file

- Path: `backend/data/recipes/<spoonacular_id>.json`, UTF-8, the
  `RecipeDetail` serialized with Pydantic `model_dump_json()`.
- Only fully translated recipes are written. No expiry; deleting the file forces
  a refetch. Unreadable or schema-invalid files are treated as misses and
  overwritten on the next successful translation.

### Translation dictionary - `backend/data/translations.json`

```json
{
  "de_en": { "eier": "eggs", "paprika": "bell pepper" },
  "en_de": { "eggs": "Eier", "Tbsp": "EL", "Zucchini Chicken Omelette": "Zucchini-Hähnchen-Omelette" }
}
```

- UTF-8, written atomically. Only successful translations are added; existing
  entries are never overwritten. No expiry; editing or deleting entries (or the
  file) forces a new translation.
- Concurrent requests can each add entries; the reload-then-merge in `add`
  keeps both in the normal case, and a lost entry is only retranslated later
  (single local user, no stronger locking needed).

## Testing

No test runner is configured, so tests are not a gate. Keep `to_recipe_detail`
and the cache module pure/small enough to unit-test later. Gates per step:
`uv run ruff check .` and `uv run ruff format --check .` (backend),
`npm run build` and `npm run lint` (frontend), plus the manual checks in each
`Done when`. Live Spoonacular and `claude` CLI behavior is only evidenced by
actually running it; do not claim it otherwise.

## Notes for the AI

- Follow the existing module style: short module docstrings, custom exception
  classes, `async` httpx client per call, German user-facing messages in the router.
- Do not log or return the API key; the request URL contains it, so never
  include the raw httpx exception text in responses.
- Keep `ANTHROPIC_API_KEY` scrubbing by going through `_translate`.
- Spoonacular `measures.metric` can carry long floats (e.g. `113.398`); keep the
  raw value in the cache and format only in the UI.
- The translation must return exactly one output per input (existing length
  check); empty-string units are not sent for translation.
- Detail is a modal, not a route: the plan left "page or modal" to this spec, no
  router is installed, and a modal keeps the search results in place. Favorites
  (5) can reuse the same dialog.
- Do not add a favorite button here.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":16337,"specSha256":"bbfc8693ce6629da73518c1399243a6fed69ff6677a45dbe64eb33994892f754","branch":"refs/heads/feature/recipe-detail","head":"cdee15b0079d32d007043247b59586f1ca10a44b","baseRef":"refs/heads/main","baseCommit":"cdee15b0079d32d007043247b59586f1ca10a44b","sourceTree":"4d497084b195fe84fd372ec611c634446350f7be","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Start the backend in `backend/` (`uv run fastapi dev app/main.py`) and the
   frontend in `frontend/` (`npm run dev`), then open http://localhost:5173.
2. Search for `Zucchini`, `Eier`, `Feta` (about 20 s the first time).
3. Run the same search again: results appear almost instantly (no `claude` call).
4. Click a card: "Rezept wird geladen und übersetzt…", then the German recipe
   with metric ingredients (g/ml/EL) and numbered steps. Esc closes it and focus
   returns to the card.
5. Reopen the same card with Tab + Enter: it loads instantly from
   `backend/data/recipes/<id>.json`; close via "Schließen" or a backdrop click.
6. Change a German value in `backend/data/translations.json` and search again:
   the card shows the edited text.
7. Stop the backend and open an uncached card: a red error box appears.
