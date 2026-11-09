# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to land while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-01 [P3] open - Malformed Spoonacular result items escape the error mapping as a bare 500

**File:** backend/app/ranking.py:36
**Found:** 2026-10-22 by /audit independent (scope: current; lens: quality)
**Why it matters:** `to_ranked_recipe` indexes `result["id"]`, `result["title"]`
and each ingredient's `["name"]` directly. `spoonacular.py` only validates that
`results` is a list, so an item missing one of these keys raises `KeyError` in
the route handler, producing FastAPI's generic 500 instead of the spec's 502
`Live-Rezepte sind gerade nicht verfügbar.` (the `SpoonacularUnavailableError`
docstring itself promises "unusable response" handling). Spoonacular normally
returns these keys, so this is unlikely in practice.
**Suggested fix:** In `search`, also catch `(KeyError, TypeError)` from
`rank_recipes` and map it to the existing 502 message, or skip items without an
`id`/`title`. No current requirement lost.
**Resolution:**

### F-02 [P3] open - Ingredient length/count limits only surface as the generic error

**File:** frontend/src/components/IngredientInput.tsx:10
**Found:** 2026-10-22 by /audit independent (scope: current; lens: quality)
**Why it matters:** The backend rejects more than 20 chips or a chip over 50
characters with a 422 whose `detail` is a list, so the UI shows only
`Die Suche ist fehlgeschlagen.` with no hint what to change. This matches the
spec's fallback-text rule, so it is not a contract break, just a confusing
dead end the user can reach by typing.
**Suggested fix:** In `withIngredient`, ignore input over 50 characters and stop
adding chips at 20 (or disable the add with a short German hint). No current
requirement lost.
**Resolution:**

### F-03 [P3] open - Card headings skip from h1 to h3

**File:** frontend/src/components/RecipeCard.tsx:24
**Found:** 2026-10-22 by /audit independent (scope: current; lens: quality)
**Why it matters:** The page has an `h1` and the cards use `h3` with no `h2`
in between, which breaks heading-level navigation for screen-reader users
(accessibility is a project rule).
**Suggested fix:** Use `h2` for the card titles, or add a visually hidden `h2`
(e.g. "Ergebnisse") to the results section. No current requirement lost.
**Resolution:**

### F-04 [P3] open - Favorite POST persists client recipes without length or list-size limits

**File:** backend/app/routers/favorites.py:20
**Found:** 2026-11-09 by /audit independent (scope: current; lens: security)
**Why it matters:** `POST /api/favorites` is the first endpoint that takes a
full `RecipeDetail` from the client and writes it to disk (AI favorites keep
the whole recipe). `RecipeDetail` has no `max_length` on `title`, `steps`, or
`ingredients`, so any size is accepted and stored in `favorites.json`, which
every later request re-reads. The coding standards ask for lengths and list
sizes to be validated at the boundary. Impact is small because the backend is
a single-user local tool and only the own frontend posts here.
**Suggested fix:** Add generous Pydantic limits on the request side (for
example `title` and step length, list sizes for `steps` and `ingredients`), or
accept the drift explicitly for this single-user tool. No current requirement
lost.
**Resolution:**

### F-05 [P3] open - Dev StrictMode moves focus to the Favoriten button on page load

**File:** frontend/src/App.tsx:92
**Found:** 2026-11-09 by /audit independent (scope: current; lens: quality)
**Why it matters:** The view-focus effect skips its first run with the
`viewChanged` ref. `main.tsx` renders in `StrictMode`, which runs mount
effects twice in development while keeping ref values, so the second run sees
`viewChanged.current === true` with `view === 'search'` and focuses the header
"Favoriten" button on every page load. The project runs through the Vite dev
server, so this is the normal runtime. Not confirmed in a browser.
**Suggested fix:** Track the previous view instead of a first-run flag (for
example store the last handled view in the ref and focus only when it
differs), or move the focus calls into the click handlers that change the
view. No current requirement lost.
**Resolution:**
