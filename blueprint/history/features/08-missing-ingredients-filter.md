# Feature: Missing ingredients filter

**From build-plan:** feature 8
**Build attempt:** 1
**Branch:** feature/missing-ingredients-filter
**Status:** verified (ruff, lint, and build; live Spoonacular and browser checks still open)

## Goal

Let the user limit the shown recipes to those with at most N missing
ingredients (missing count as already computed: spices and pantry basics
excluded). When the filter is set, the "too few results" highlight of the AI
offer is based on the number of recipes still visible after the filter.

## In scope

- A "Max. fehlende Zutaten" number field next to the cooking time field.
  Empty means no filter. Valid values: whole numbers 0-20.
- The filter is applied **live in the frontend** to the results of the current
  search: changing the value updates the grid immediately, without a new
  Spoonacular search or Claude call. The server already returns
  `missing_count` for every result.
- Status line reflects the filter (how many of the found recipes are shown,
  and an empty-state text when the filter hides all of them).
- AI offer highlight rule (project-plan business rule, changed 2026-11-09):
  - Spoonacular unavailable: highlighted, as today.
  - Filter **not** set: highlighted when fewer than 3 results have a missing
    count <= 2 (today's backend `weak_results`, unchanged).
  - Filter set: highlighted when fewer than 3 recipes are visible after the
    filter; the message states that visible number.
- Backend exposes the "fewer than 3" constant as `good_results_min` so the UI
  never hardcodes it (same pattern as `good_missing_max`).

## Out of scope

- Sending the filter to the backend or Spoonacular; the backend search request
  stays unchanged.
- Persisting the filter value (nothing about a search is stored).
- Changing ranking, the missing-count rule, the time filter, or the AI recipe
  request (the AI recipe still uses the entered ingredients only).
- Favorites (feature 5) and general UI polish (feature 6).
- Search relevance / speed items from "Later".

## Build loop

`workflow.stepReview` is `feature`: build all steps below, then present one
review packet for the whole feature. `checkpointCommits` is disabled; no
commits during implementation. `/complete` creates the final feature commit.

## Build steps

- [x] 1. **Backend: expose `good_results_min`.** Add
  `good_results_min: int` to `SearchResponse` in
  `backend/app/routers/search.py`, set from `GOOD_RESULTS_MIN` on all three
  return paths. Add the field to the `SearchResponse` type in
  `frontend/src/api/search.ts` and carry it as `goodResultsMin` in the success
  state of `frontend/src/hooks/useRecipeSearch.ts`.
  Done when: `POST /api/search` responses (including the live-unavailable
  path) contain `"good_results_min": 3`; `uv run ruff check .` and
  `npm run build` pass; the app behaves exactly as before.

- [x] 2. **Filter field and live filtering.** Add a `maxMissing` raw-text state
  in `App.tsx` (like `maxReadyTime`) and a labelled number field in
  `IngredientInput.tsx` (`id="max-missing"`, label "Max. fehlende Zutaten",
  `min=0`, `max=20`, `step=1`, `inputMode="numeric"`, hint "Leer lassen für
  keine Begrenzung", `aria-describedby` to the hint). The field stays enabled
  while a search runs. A parse helper turns the text into `number | null`:
  empty or invalid (not a whole number 0-20) -> `null` (no filter). Invalid
  text still blocks the form submit through native constraint validation, as
  the time field does. The grid renders only results with
  `missing_count <= maxMissing` (all results when `null`); the AI card is
  always shown. Status line (success, live available, at least one result):
  - no filter: unchanged ("N Rezepte gefunden.").
  - filter, some visible: "X von N Rezepten mit höchstens M fehlenden
    Zutaten." (correct singular/plural, see Notes).
  - filter, none visible: "Keine der N gefundenen Rezepte hat höchstens M
    fehlende Zutaten." (singular forms for N = 1 / M = 1, M = 0 reads "ohne
    fehlende Zutaten").
  Existing empty / unavailable / error texts stay unchanged.
  Done when: in the running app, after one search, typing 0, 1, 2, clearing
  the field changes the visible cards and status line immediately without a
  network request (DevTools network tab); `npm run lint` and `npm run build`
  pass.

- [x] 3. **AI offer rule with filter.** In `App.tsx` compute the highlight:
  `liveUnavailable || (filter === null ? weakResults : visibleCount < goodResultsMin)`.
  Pass the filter and visible count to `AiOffer.tsx`. Highlighted text:
  - no filter: unchanged ("X Rezepte gefunden, davon Y mit höchstens 2
    fehlenden Zutaten. Soll die KI …").
  - filter, visible > 0: "X Rezept(e) mit höchstens M fehlenden Zutaten
    gefunden. Soll die KI ein Rezept aus deinen Zutaten erstellen?"
  - filter, visible = 0, or live unavailable, or no results: only the
    question (the status line already says that nothing is shown).
  Not highlighted: unchanged ("Nichts Passendes dabei?" + button).
  The highlight updates live when the filter changes; an already generated AI
  recipe is unaffected.
  Done when: in the running app, with a search that has e.g. 6 results with
  <= 4 missing but fewer than 3 with <= 2: filter empty -> highlighted;
  filter 4 -> not highlighted; filter 0 with < 3 visible -> highlighted with
  the visible number; `npm run lint` and `npm run build` pass.

## Files / areas

- `backend/app/routers/search.py` - `SearchResponse.good_results_min`
- `frontend/src/api/search.ts` - response type
- `frontend/src/hooks/useRecipeSearch.ts` - `goodResultsMin` in success state
- `frontend/src/App.tsx` - `maxMissing` state, parse helper, visible results,
  status text, highlight rule
- `frontend/src/components/IngredientInput.tsx` - new number field
- `frontend/src/components/AiOffer.tsx` - filter-aware text
- `frontend/src/missingFilter.ts` - parse helper and German phrase, shared by
  `App.tsx` and `AiOffer.tsx` (a shared module avoids importing from `App`)

## Data / contracts

- `SearchResponse` gains `good_results_min: int` (always `GOOD_RESULTS_MIN`,
  currently 3). All existing fields keep their meaning; `good_count` and
  `weak_results` still describe the unfiltered results.
- Search request unchanged. No persisted data changes.
- Filter value: client-only, `number | null`, whole number 0-20; `null` = no
  filter.

## Testing

No test runner is configured, so there are no unit tests. Gates per step:
`uv run ruff check .` (backend), `npm run lint` and `npm run build`
(frontend). Behavior is verified manually in the running app (or via
`/check`), which needs real Spoonacular quota and the `claude` CLI.

## Notes for the AI

- German grammar helper for "höchstens M fehlenden Zutat/Zutaten" (dative:
  M = 1 -> "fehlenden Zutat", otherwise "fehlenden Zutaten"; M = 0 -> "ohne
  fehlende Zutaten"). Reuse it for status line and AI offer.
- Keep pure helpers (parse, visible results, texts) as plain functions in the
  component files; no new hook or module unless a file gets unwieldy.
- Do not hardcode 2 or 3 in the UI: use `goodMissingMax` / `goodResultsMin`.
- Recipe texts are already rendered as React text (no HTML injection); keep it
  that way.
- `RecipeCard` keys and detail opening stay unchanged; filtering only hides
  cards.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":7310,"specSha256":"19d73882d84589430ff45c05ed9ed2c75a6b77ff01199c490460ee51358164b8","branch":"refs/heads/feature/missing-ingredients-filter","head":"4b6aa1597f67b24b44ed2f25d591fac972cfb74a","baseRef":"refs/heads/main","baseCommit":"4b6aa1597f67b24b44ed2f25d591fac972cfb74a","sourceTree":"0dfe46038fcb298b322f32d86e114b8433a1517b","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Start the backend (`uv run fastapi dev app/main.py`) and frontend (`npm run dev`), open http://localhost:5173.
2. Search for e.g. "Zucchini, Eier, Feta, Zwiebeln" with "Max. fehlende Zutaten" empty.
3. Enter **4**, **1**, **0**, then clear the field: cards and status line change immediately; the DevTools network tab shows no new `/api/search` request.
4. Watch the AI offer: highlighted (amber, with the visible number) when fewer than 3 cards are visible; otherwise only "Nichts Passendes dabei?".
5. Enter "1.5" or "-1": nothing is filtered, and "Rezepte suchen" is blocked by the browser.
