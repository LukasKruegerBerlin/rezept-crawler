# Feature: Favorites

**From build-plan:** feature 5
**Build attempt:** 1
**Branch:** feature/favorites
**Status:** verified (ruff, scripted storage and TestClient endpoint checks, lint, and build; browser checks for steps 3-4 still open)

## Goal

Save recipes I want to cook again. From the recipe detail modal I can save or
remove a Spoonacular or AI recipe as a favorite; a "Favoriten" button in the
header shows the saved list, where I can open or remove each one. Favorites
persist in `backend/data/favorites.json`.

## In scope

- Backend storage module for `favorites.json` (list, add, remove) that never
  overwrites an unreadable file
- `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/{id}`
- Favorite toggle in the recipe detail modal for Spoonacular and AI recipes
- Favorites view reachable from the header: list, open (in the existing
  detail modal), remove, back to the search
- Loading, empty, and error states for every favorites request (German text)

## Out of scope

- Images, cooking time, or other extra fields in the favorites list (only
  title, AI label, saved date)
- Undo or confirmation dialog for removing
- Editing favorites, sorting/filtering the list, export
- Search result caching (still an open plan decision)
- General layout polish across views (Feature 6)
- Deleting a recipe's cache file when its favorite is removed

## Build loop

`workflow.stepReview` is `feature`: build all steps in order, run the step's
check after each, then present one review packet for the whole feature.
Checkpoint commits are disabled; `/complete` creates the feature commit.

## Build steps

- [x] **1. Backend storage module.** Add `backend/app/favorites.py` with the
  `Favorite` model (see Data / contracts), `FavoritesUnreadableError`, and
  `load() -> list[Favorite]`, `add(recipe: RecipeDetail) -> tuple[Favorite, bool]`
  (bool = newly created), `remove(favorite_id: str) -> bool`. Read and write
  through `DATA_DIR / "favorites.json"` and `storage.write_atomic`
  (`indent=2`). A missing file is an empty list; an unreadable or invalid file
  raises `FavoritesUnreadableError` and is never overwritten. `add` for a
  Spoonacular recipe whose `spoonacular_id` is already saved returns the
  existing favorite unchanged.
  **Done when:** `uv run ruff check .` and `uv run ruff format --check .` pass,
  and a `uv run python -c` script that points `favorites.FAVORITES_PATH` at a
  scratch file shows: add Spoonacular (created), add same id again (not
  created, same `id`), add AI (stores full recipe), load (both), remove (true),
  remove unknown (false); and a file containing `{broken` makes `load` and
  `add` raise `FavoritesUnreadableError` with the file bytes unchanged.

- [x] **2. Backend endpoints.** Add `backend/app/routers/favorites.py` with
  the three endpoints below and register it in `app/main.py`. The list uses
  the cached German title (`recipe_cache.load`) for Spoonacular favorites when
  the cache has the recipe, otherwise the stored title.
  **Done when:** ruff passes, and with the dev server running, `curl` shows:
  empty list `{"favorites": []}` without a file; POST Spoonacular -> 201,
  repeated -> 200 with the same `id`; POST AI -> 201; POST `source: "ai"`
  with a `spoonacular_id` -> 422; GET lists newest first; DELETE -> 204, again
  -> 404 with German `detail`; a broken `favorites.json` -> GET/POST 500 with
  the German `detail` and the file unchanged.

- [x] **3. Frontend favorites view.** Add `src/api/favorites.ts`
  (types + `fetchFavorites`, `addFavorite`, `removeFavorite`, German error
  class as in `api/recipes.ts`) and `src/hooks/useFavorites.ts` (list state
  `loading | success | error`, `reload`, `add`, `remove`; loaded once on mount).
  In `App.tsx` add a header button "Favoriten" (shows the count when loaded)
  that switches between the search view and a new
  `src/components/FavoritesList.tsx`. The search view stays mounted but
  `hidden`, so ingredients, filters, results, and the AI recipe survive the
  switch. The list shows each favorite's title as the open button, a
  "KI-Vorschlag" badge for AI favorites, the saved date (`de-DE`), and an
  "Entfernen" button; plus "Zurück zur Suche". Opening a Spoonacular favorite
  calls the existing `detail.load(spoonacular_id)` (cache, or refetch and
  retranslate); opening an AI favorite calls `detail.show(favorite.recipe)`.
  States: "Favoriten werden geladen…", empty "Noch keine Favoriten
  gespeichert.", load error with the German message and a "Erneut versuchen"
  button, remove error shown above the list while the item stays.
  **Done when:** `npm run lint` and `npm run build` pass, and in the browser:
  header button opens the list and back returns to the unchanged search; with
  favorites created via `curl` the list shows them newest first, opens both
  kinds in the modal, and removing one drops it; empty and error states (stop
  the backend) appear.

- [x] **4. Favorite toggle in the detail modal.** In `RecipeDetailDialog`,
  for the `success` state, add a toggle button next to "Schließen":
  "Als Favorit speichern" / "Gespeichert – entfernen", `aria-pressed`, disabled
  while its request runs; on failure a German message under the title
  ("Favorit konnte nicht gespeichert werden." / "…nicht entfernt werden.",
  or the backend `detail`). Saved state: Spoonacular recipes match a favorite
  by `spoonacular_id`; AI recipes match by object reference (the favorite's
  own `recipe` object, or the generated recipe mapped to the `id` returned
  when it was saved). Toggling updates the favorites list and its header
  count. The toggle is not shown in loading or error states.
  **Done when:** lint and build pass, and in the browser: saving a
  Spoonacular recipe from search results shows it as saved, it appears in
  the list, reopening it shows saved, removing from the modal or the list
  clears it; the same for a generated AI recipe (saved once, opened from the
  list after a new search, still saved); a save with the backend stopped
  shows the error and the button stays usable.

## Files / areas

- `backend/app/favorites.py` (new) - model and storage
- `backend/app/routers/favorites.py` (new) - endpoints
- `backend/app/main.py` - include router
- `frontend/src/api/favorites.ts` (new)
- `frontend/src/hooks/useFavorites.ts` (new)
- `frontend/src/components/FavoritesList.tsx` (new)
- `frontend/src/components/RecipeDetailDialog.tsx` - favorite toggle
- `frontend/src/App.tsx` - header button, view switch, wiring

## Data / contracts

### `Favorite` (stored and returned)

- `id` (str) - `uuid4().hex`, generated by the backend on creation; stable
  for open and remove. Resolves the plan's open "form of the favorite id".
- `source` (`"spoonacular" | "ai"`)
- `spoonacular_id` (int | null) - set exactly when `source = "spoonacular"`
- `title` (str) - title at save time (German, or English if the recipe was
  shown untranslated)
- `saved_at` (datetime, timezone-aware UTC, serialized ISO-8601)
- `recipe` (`RecipeDetail` | null) - full recipe for `ai`, null for
  `spoonacular` (opened via `/api/recipes/{id}`)

### `backend/data/favorites.json`

JSON array of `Favorite`, in save order (append), written atomically with
`indent=2`. Missing file = empty. Unreadable/invalid file = error, never
overwritten. Single user, no locking.

### Endpoints

- `GET /api/favorites` -> 200 `{"favorites": Favorite[]}`, newest first.
  Spoonacular `title` replaced by the cached German title when cached.
- `POST /api/favorites` body `{"recipe": RecipeDetail}` -> 201
  `{"favorite": Favorite}`; Spoonacular id already saved -> 200 with the
  existing favorite. Validation (422): `source = "spoonacular"` needs a
  positive `spoonacular_id`; `source = "ai"` needs `spoonacular_id = null`.
  `title` is taken from the body recipe.
- `DELETE /api/favorites/{id}` -> 204; unknown id -> 404
  `"Favorit nicht gefunden."`
- Unreadable file on any endpoint -> 500
  `"Favoriten konnten nicht gelesen werden. Bitte backend/data/favorites.json prüfen."`

## Testing

No test runner is configured, so no automated tests. Checks: `uv run ruff
check .`, `uv run ruff format --check .` (backend), `npm run lint`,
`npm run build` (frontend), plus the scripted and `curl`/browser checks in
each step's Done when. Browser checks are manual unless a harness is added.

## Notes for the AI

- Reuse `RecipeDetail` / `IngredientLine` from `app/models.py` and the TS
  types in `api/recipes.ts`; do not duplicate the recipe shape.
- Follow existing patterns: `storage.write_atomic`, German `HTTPException`
  details, `readDetail` for frontend errors, latest-request guards in hooks
  where responses can race.
- All titles and texts render as React text (no `dangerouslySetInnerHTML`).
- Removing a favorite must not touch `backend/data/recipes/`.
- Keep the generated-AI-recipe → favorite id mapping in App/hook state; it
  is reset with nothing else (a page reload loses it, but the recipe is then
  only reachable from the list, which carries its id).
- Focus: opening from the list returns focus to the list's open button
  (same `detailTrigger` pattern); after removing a list item, focus moves to
  the next item's open button, or "Zurück zur Suche" when the list is empty.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":9261,"specSha256":"967b09c6d40c427bea54dbbc53c5ea12345d16640e0c9e7172209fddfb5370fa","branch":"refs/heads/feature/favorites","head":"79994c09bbc918fed7b58f107860aff9c0a6a216","baseRef":"refs/heads/main","baseCommit":"f478259e5464c2253bbbd3fc188f75473d5250d7","sourceTree":"13b1d6b3c8ac42acf7a3b25e096894e32b457fd3","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 79994c09bbc918fed7b58f107860aff9c0a6a216
**Base commit:** f478259e5464c2253bbbd3fc188f75473d5250d7
**Base ref:** main
**Spec hash:** 967b09c6d40c427bea54dbbc53c5ea12345d16640e0c9e7172209fddfb5370fa
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** runtime default (exact model not known until reviewer starts)
**Requested execution:** automatic
**Requested at:** 2026-11-09T11:38:25Z
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-09T11:41:19Z
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain --untracked-files=all`: pass (preconditions match; only review.md dirty)
- `uv run ruff check .` (backend): pass
- `uv run ruff format --check .` (backend): pass
- `npm run lint` (frontend): pass
- `npm run build` (frontend): pass
- `uv run python -c` TestClient script with `favorites.FAVORITES_PATH` pointed at a scratch file: pass (empty list, POST 201/200 same id, AI 201, both 422 cases, newest-first list, DELETE 204 then 404 with German detail, broken file gives GET/POST 500 and stays unchanged)

### Evidence

- Reviewed the full `f478259..79994c0` delta: backend/app/favorites.py, backend/app/routers/favorites.py, backend/app/main.py, frontend/src/App.tsx, frontend/src/api/favorites.ts, frontend/src/hooks/useFavorites.ts, frontend/src/components/FavoritesList.tsx, frontend/src/components/RecipeDetailDialog.tsx, plus spec and plan/overview doc edits
- Cross-checked callers and contracts: app/models.py, app/storage.py, app/recipe_cache.py, api/errors.ts, hooks/useRecipeDetail.ts, main.tsx
- Spec contracts confirmed in code: uuid4 hex ids, atomic indented writes, unreadable file never overwritten, cached German title on list, recipe cache untouched on remove, React text rendering only, latest-request guards in hooks and toggle
- No secrets in the delta; backend/data/ was not read or written

### Findings

- F-04 [P3] open - Favorite POST persists client recipes without length or list-size limits (backend/app/routers/favorites.py:20)
- F-05 [P3] open - Dev StrictMode moves focus to the Favoriten button on page load (frontend/src/App.tsx:92)

### Remaining risk

- No test runner is configured, so no automated tests cover the storage module or endpoints
- Browser behavior for steps 3 and 4 (view switch, list open/remove, modal toggle, focus handling) was not exercised in a browser; the spec status also marks these browser checks as still open
- F-05 is inferred from React StrictMode semantics and was not observed in a browser
- Concurrent writes to favorites.json are unguarded by design (spec: single user, no locking)

## Try it now

1. Start both dev servers (`uv run fastapi dev app/main.py` in `backend/`, `npm run dev` in `frontend/`) and open http://localhost:5173.
2. Search e.g. "Zucchini, Eier, Feta", open a recipe, click **Als Favorit speichern**: the button shows "Gespeichert – entfernen", the header shows "Favoriten (1)".
3. Generate an AI recipe, open it, and save it too.
4. Click **Favoriten** in the header: both entries, newest first, the AI one labelled "KI-Vorschlag". Open both.
5. Click **Zurück zur Suche**: ingredients and results are still there.
6. Remove one favorite in the list and the other in the modal: "Noch keine Favoriten gespeichert." appears.
7. Stop the backend and try to save: a German error appears and the button stays usable.
