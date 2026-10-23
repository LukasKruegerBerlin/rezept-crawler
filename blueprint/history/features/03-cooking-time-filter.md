# Feature: Cooking time filter

**From build-plan:** feature 3
**Build attempt:** 1
**Branch:** feature/cooking-time-filter
**Status:** verified (build, lint, and backend validation; live Spoonacular and browser checks still open)

## Goal

Let the user limit search results to recipes that are ready within a maximum
number of minutes (e.g. 30 or less). The limit is optional and is sent with the
search to Spoonacular as `maxReadyTime`.

## In scope

- Optional `max_ready_time` (whole minutes) on `POST /api/search`, validated in
  the backend and passed to Spoonacular `complexSearch` as `maxReadyTime` only
  when set
- A labelled number field "Max. Kochzeit (Minuten)" in the search form, next to
  the ingredient input; empty means no limit
- The limit applies when the user starts a search (button or form submit), like
  the ingredient list today
- Empty-result text that mentions the active limit, so the user knows why
  nothing was found

## Out of scope

- Auto-rerunning the search when the limit changes
- Presets or a slider (the plan names only "e.g. 30 minutes or less")
- Persisting the limit (nothing about a search is stored)
- Search result caching, AI fallback (feature 4), favorites (feature 5), layout
  polish beyond this field (feature 6)

## Build loop

`workflow.stepReview` is `feature`: build all steps, then one review packet for
the whole feature. `workflow.checkpointCommits` is `disabled`: no step commits.
`/complete` creates the single feature commit on `feature/cooking-time-filter`.

## Build steps

- [x] 1. **Backend: accept and forward the limit**
  - `SearchRequest` gets `max_ready_time: int | None = Field(default=None, ge=1, le=1440)`
  - `search_by_ingredients(ingredients, max_ready_time)` adds
    `"maxReadyTime": max_ready_time` to the `complexSearch` params only when it
    is not `None`; all other params stay unchanged
  - The router passes `request.max_ready_time` through
  - **Done when:** in `/docs`, a search with `max_ready_time: 20` returns only
    cards with `ready_in_minutes <= 20` (or an empty list); a search without the
    field behaves as before; `0`, `-5`, `1441`, and `12.5` return 422 without a
    Spoonacular call; `uv run ruff check .` and `uv run ruff format --check .` pass
- [x] 2. **Frontend: field, request, empty state**
  - `searchRecipes(ingredients, maxReadyTime: number | null)` sends
    `max_ready_time` only when set
  - `useRecipeSearch().search(ingredients, maxReadyTime)`; the success state
    also keeps the `maxReadyTime` used for that search
  - `App` holds the field value as a string (`''` = no limit) and passes the
    parsed number to `search`
  - `IngredientInput` renders the field inside its existing `<form>`:
    `<input type="number" id="max-ready-time" min="1" max="1440" step="1" inputMode="numeric">`
    with a visible `<label>` "Max. Kochzeit (Minuten)" and a hint
    "Leer lassen für keine Begrenzung" linked via `aria-describedby`. Native
    constraint validation blocks submit for invalid values; the field is
    disabled while a search runs, like the button
  - Empty result with an active limit: "Keine passenden Rezepte in höchstens
    {n} Minuten gefunden." Without a limit the current text stays
  - **Done when:** `npm run build` and `npm run lint` pass; in the browser, a
    search with 30 shows only cards with time <= 30, an empty field searches
    without a limit, `0` or `abc` cannot be submitted, the field is reachable
    and usable by keyboard, and the empty-state text names the limit

## Files / areas

- `backend/app/routers/search.py` - `SearchRequest`, pass-through
- `backend/app/spoonacular.py` - `search_by_ingredients` param
- `frontend/src/api/search.ts` - request body
- `frontend/src/hooks/useRecipeSearch.ts` - search signature, success state
- `frontend/src/components/IngredientInput.tsx` - number field in the form
- `frontend/src/App.tsx` - field state, empty-state text

## Data / contracts

`POST /api/search` request (new optional field):

```json
{ "ingredients": ["Zucchini", "Eier"], "max_ready_time": 30 }
```

- `max_ready_time`: integer minutes, 1-1440, optional; omitted or `null` means
  no limit. Pydantic rejects non-integers and out-of-range values with 422.
- Response shape (`SearchResponse`) is unchanged.
- Spoonacular: `maxReadyTime=<n>` on `complexSearch`, only when set.
- No new stored data; translation dictionary use is unchanged.

## Testing

No test runner is configured, so there are no automated tests for this feature.
Checks: `uv run ruff check .` / `uv run ruff format --check .` in `backend/`,
`npm run build` / `npm run lint` in `frontend/`. Behavior is verified by hand
via `/docs` and the browser (each live search costs Spoonacular quota, so keep
it to a few searches). No Verify command exists.

## Notes for the AI

- Keep the field in the same form so the existing submit path (button, text
  still in the input counts as an ingredient) carries the limit too; do not add
  a second submit path.
- Enter in the ingredient input still only adds a chip; it must not submit.
- Rely on Spoonacular's `maxReadyTime` filtering; do not add a second local
  filter unless the live check in step 1 shows results above the limit.
- The upper bound 1440 (one day) is a sanity limit for input validation, not a
  product rule.
- German UI text, Tailwind classes matching the existing input styling
  (`rounded-xl border-stone-300`, emerald focus ring).

## Try it now

Start both dev servers (`uv run fastapi dev app/main.py` in `backend/`,
`npm run dev` in `frontend/`), then open http://localhost:5173.

1. Add "Zucchini" and "Eier", enter `30` in "Max. Kochzeit (Minuten)", click
   "Rezepte suchen". Expect: every card shows a cooking time of 30 min or less.
2. Clear the field and search again. Expect: results without a time limit
   (longer times may appear).
3. Enter `0` and click "Rezepte suchen". Expect: the browser blocks the submit
   with a validation message; no search starts.
4. Enter `5` with a rare ingredient combination. Expect: either short recipes or
   "Keine passenden Rezepte in höchstens 5 Minuten gefunden."
5. Tab from the ingredient input to the button and the time field. Expect: all
   reachable by keyboard; the field is greyed out while a search runs.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6270,"specSha256":"60a7490d1cf89770c2661e79221453a3a644c4de855c15d4b8711dd33661b4e1","branch":"refs/heads/feature/cooking-time-filter","head":"5da0aeace2153c5c30c0b6a169aeaac423e9d738","baseRef":"refs/heads/main","baseCommit":"5da0aeace2153c5c30c0b6a169aeaac423e9d738","sourceTree":"712b9c6af8987a113da3495e713ee7130ed97095","landing":"local-merge","absentOptional":[]} -->
