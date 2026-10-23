# Feature: Ingredient autocomplete

**From build-plan:** feature 7
**Build attempt:** 1
**Branch:** feature/ingredient-autocomplete
**Status:** verified

## Goal

While typing an ingredient, the input suggests up to 5 ingredients that were
translated before (German entries of the translation dictionary) and start with
the typed text. Arrow keys and Enter pick a suggestion; plain Enter still adds
the typed text unchanged as a chip. Known ingredients also need no new Claude
call, so picking a suggestion keeps searches fast.

## In scope

- Backend `GET /api/ingredients`: all German ingredients from the translation
  dictionary (`de_en` keys), for display.
- Frontend loads that list once on page load and again after every finished
  search (a search can add new dictionary entries).
- Prefix filtering in the frontend: case-insensitive, first 5 matches, sorted
  alphabetically, ingredients already chosen as chips are left out.
- Suggestion list under the input as an accessible combobox (keyboard and mouse).

## Out of scope

- Fuzzy or substring matching, ranking by frequency.
- Editing or deleting dictionary entries (build plan "Later").
- Suggestions from English texts (`en_de`) or recipe ingredients that were never
  entered.
- Any change to search, translation, or ranking behavior.

## Build loop

`workflow.stepReview: "feature"`: implement all steps, then one review packet
for the whole feature. `checkpointCommits: "disabled"`: no step commits;
`/complete` creates the single feature commit.

## Build steps

- [x] **1. Backend: known ingredients endpoint.**
  Add `backend/app/routers/ingredients.py` with `GET /api/ingredients` returning
  `KnownIngredients` (`ingredients: list[str]`). Source: `glossary.load().de_en`
  keys, shown with the first letter uppercased (`"eier"` -> `"Eier"`), sorted
  with `str.casefold` as key. Register the router in `backend/app/main.py`. No
  Spoonacular key, no CLI call; a missing or broken dictionary yields `[]`
  (already how `glossary.load()` behaves).
  **Done when:** `/docs` -> `GET /api/ingredients` returns the capitalized,
  sorted entries of the local `translations.json`; with the file renamed away
  it returns `{"ingredients": []}`; `uv run ruff check .` passes.

- [x] **2. Frontend: load the list and compute suggestions.**
  Add `frontend/src/api/ingredients.ts` (`KnownIngredientsResponse` type,
  `fetchKnownIngredients()` with relative `/api/ingredients`) and
  `frontend/src/hooks/useKnownIngredients.ts` (state `string[]`, loads on mount,
  exposes `reload()`). In `App.tsx`, call `reload()` after each search finishes,
  success or error (check whether `useRecipeSearch().search` returns a promise;
  otherwise react to the state leaving `loading`). Add a pure
  `suggestionsFor(known, text, chosen)` next to `withIngredient` in
  `IngredientInput.tsx`: empty or whitespace text -> `[]`; otherwise
  case-insensitive `startsWith` on the trimmed text, minus chosen chips
  (case-insensitive), first 5. Pass the list into `IngredientInput` as a
  `knownIngredients` prop.
  **Done when:** the Network tab shows one `/api/ingredients` call on load and
  one after each finished search; `npm run lint` and `npm run build` pass.

- [x] **3. Frontend: combobox UI.**
  In `IngredientInput.tsx`, render the suggestions as a listbox under the
  chips field, following the ARIA combobox pattern:
  - input: `role="combobox"`, `aria-expanded`, `aria-controls` -> listbox id,
    `aria-autocomplete="list"`, `aria-activedescendant` -> highlighted option.
  - list: `role="listbox"` with `aria-label="Vorschläge"`; options
    `role="option"` with `aria-selected` on the highlighted one. Rendered as
    plain text (React escaping), no HTML.
  - Open while there is at least one suggestion and the input has focus; no
    highlight initially.
  - ArrowDown/ArrowUp move the highlight (wrapping); Enter with a highlight adds
    that suggestion as chip and clears the input; Enter without a highlight
    keeps today's behavior (typed text unchanged). Escape closes the list
    (highlight cleared) until the text changes. Typing resets the highlight.
  - Mouse click on an option adds it as chip and keeps focus in the input
    (`onMouseDown` + `preventDefault`, so the input does not blur first).
  - Blur closes the list. The submit button and chip remove buttons keep
    working as before.
  - Style: white panel, stone border, rounded, highlighted option emerald-50,
    matches the chips field width; light theme only.
  **Done when:** in the browser, typing `e` shows `Eier` (if in the
  dictionary); ArrowDown + Enter adds the chip `Eier`; typing `Zucc` + Enter
  without arrow adds `Zucc`; an already chosen chip is not suggested; Escape
  and blur close the list; with no matches no list appears; `npm run lint` and
  `npm run build` pass.

## Files / areas

- `backend/app/routers/ingredients.py` - new endpoint
- `backend/app/main.py` - include the router
- `frontend/src/api/ingredients.ts` - new API client and type
- `frontend/src/hooks/useKnownIngredients.ts` - new hook
- `frontend/src/components/IngredientInput.tsx` - `suggestionsFor`, combobox
- `frontend/src/App.tsx` - wire hook, reload after search

## Data / contracts

- `GET /api/ingredients` -> `200 {"ingredients": ["Eier", "Feta", ...]}`.
  Read-only, no parameters, no new persisted data. Order: case-insensitive
  alphabetical. Empty dictionary -> `[]`. No error responses beyond FastAPI's
  defaults.
- Display form: dictionary key with its first character uppercased. The key
  itself stays normalized (`german_key`), so a picked suggestion like `Eier`
  maps back to the same entry `eier` in the next search, without a CLI call.
- Chosen suggestions are ordinary chips; the search request is unchanged.

## Testing

No test runner is configured, so tests are not a gate. Evidence per step:
`uv run ruff check .`, `npm run lint`, `npm run build`, `/docs` output, and the
browser checks in each `Done when`. `suggestionsFor` is pure and would get a
Vitest test once `/tests` is set up.

## Notes for the AI

- Failed list load: suggestions just stay empty and no message is shown. The
  autocomplete is an aid; typing and searching keep working unchanged. Log
  nothing to the user and do not block the input.
- Keep `withIngredient` as the single place that adds chips (dedupe, trim).
- Do not change the input's `id`, label, or placeholder; the label stays
  associated via `htmlFor`.
- German UI text only.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6468,"specSha256":"f3cde0d43df97eac3aeb1206edeb99a9f8f6a681c94fabec7eae7f6d67c18849","branch":"refs/heads/feature/ingredient-autocomplete","head":"eddd22471dc32bf24101d4f5fbf7eff3f14a8cb5","baseRef":"refs/heads/main","baseCommit":"eddd22471dc32bf24101d4f5fbf7eff3f14a8cb5","sourceTree":"c50344fc6427f8cdf316d1de20cdb99bb5918b92","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Start the backend (`uv run fastapi dev app/main.py` in `backend/`) and the
   frontend (`npm run dev` in `frontend/`, Node 22), open http://localhost:5173.
2. Type `e` into the ingredient field: **Eier** appears below it.
3. Press ArrowDown, then Enter: the chip **Eier** is added and the field is empty.
4. Type `e` again: **Eier** is no longer suggested.
5. Type `Zucc` and press Enter without an arrow key: the chip is exactly **Zucc**.
6. Type `k` and press Escape: the list disappears; clicking outside also closes it.
7. Click a suggestion with the mouse: it becomes a chip and the cursor stays in
   the field.
8. Search with a new ingredient; afterwards it shows up as a suggestion.
