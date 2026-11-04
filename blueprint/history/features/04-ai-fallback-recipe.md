# Feature: AI fallback recipe

**From build-plan:** feature 4
**Build attempt:** 1
**Branch:** feature/ai-fallback-recipe
**Status:** verified (lint, build, backend live checks; browser checks still open)

## Goal

After every search the user can ask Claude for one German recipe made from the
entered ingredients (plus spices and pantry basics). It is never generated
automatically. When the Spoonacular results are weak or Spoonacular is
unavailable, the offer is highlighted in a message that says how many recipes
were found. The found recipes stay browsable, and the AI recipe can still be
requested afterwards. The result is a labelled "KI-Vorschlag" card that opens
in the existing detail dialog.

## In scope

- Search no longer fails on Spoonacular quota / unavailability: it returns
  `results: []` with `live_unavailable: true`.
- Search response says whether results are weak (fewer than 3 with
  `missing_count <= 2`) and how many good results there are.
- New `POST /api/ai-recipe`: generates one German recipe with the `claude` CLI
  (Pro subscription, never an API key) and a stronger model than translation
  (`sonnet`), using only the given ingredients plus spices and pantry basics,
  respecting the max cooking time when set.
- Shared CLI runner extracted from `translation.py`.
- Frontend: AI offer above the grid after every successful search (highlighted
  message when weak or live-unavailable, otherwise a plain button), loading and
  error states for generation with retry, at most one AI recipe per search, the
  AI card first in the grid, opening it in the existing dialog without a request.

## Out of scope

- Missing ingredients filter (feature 8).
- Saving AI recipes (Favorites, feature 5). AI recipes are not cached or
  persisted anywhere in this feature.
- Changing ranking, the Spoonacular query, or translation behaviour.
- AI offer when the search itself errors (missing key 500, failed ingredient
  translation 502, invalid input): those stay errors without an offer.
- A photo for AI recipes, regenerating a second AI recipe for the same search.
- Cross-view polish (feature 6).

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then one review packet
for the whole feature. `workflow.checkpointCommits` is `disabled`: no per-step
commits. `/complete` creates the single feature commit on
`feature/ai-fallback-recipe`.

## Build steps

- [x] **1. Backend: shared Claude CLI runner.**
  Add `backend/app/claude_cli.py` with `ClaudeCliError` and
  `async run_claude(*, model, system_prompt, schema, payload, timeout) -> Any`,
  moved from `_translate` in `translation.py`: same flags
  (`-p --output-format json --json-schema --system-prompt --tools ""
  --no-session-persistence --setting-sources "" --strict-mcp-config`), stdin
  JSON payload (`ensure_ascii=False`), `ANTHROPIC_API_KEY` /
  `ANTHROPIC_AUTH_TOKEN` removed from the env, cwd the temp dir, process killed
  on timeout. It returns `structured_output` and raises `ClaudeCliError` on a
  missing binary, timeout, non-zero exit, invalid JSON, `is_error`, or a
  non-`success` subtype. `translation.py` keeps its public functions, prompts,
  `MODEL`, `TIMEOUT_SECONDS`, and `TranslationError`; `_translate` calls
  `run_claude`, keeps its list-length / string checks, and maps
  `ClaudeCliError` to `TranslationError`.
  **Done when:** `uv run ruff check .` and `uv run ruff format --check .` pass;
  a search with one never-entered ingredient still returns German results with
  `translated: true`.

- [x] **2. Backend: AI recipe generator.**
  Add `backend/app/ai_recipe.py` with `MODEL = "sonnet"`,
  `TIMEOUT_SECONDS = 120.0`, a system prompt, an output JSON schema,
  `AiRecipeError`, and
  `async generate_recipe(ingredients: list[str], max_ready_time: int | None) -> RecipeDetail`.
  - Payload: `{"ingredients": [...German as entered...], "max_ready_time": n | null}`.
  - Prompt rules: one realistic home-cooking recipe written in German; use only
    the given ingredients plus spices, herbs, oil, salt, pepper, water, flour,
    sugar, and similar pantry basics; not every ingredient must be used; metric
    amounts with German short units (g, ml, EL, TL, Stk, Prise; may be empty);
    steps as full German sentences; total time in minutes, not above
    `max_ready_time` when set.
  - Schema: `title` (string), `ready_in_minutes` (integer), `ingredients`
    (array of `{name: string, amount: number | null, unit: string}`), `steps`
    (array of string); all required, no additional properties.
  - Validation (otherwise `AiRecipeError`): strings stripped; non-empty title;
    at least one ingredient, every name non-empty; at least one step, every
    step non-empty; `amount` null or `>= 0`; `ready_in_minutes >= 1` and
    `<= max_ready_time` when a limit is set.
  - Result: `RecipeDetail(source="ai", spoonacular_id=None, image=None, ...)`.
    `ClaudeCliError` and shape / pydantic errors map to `AiRecipeError`.
  **Done when:** ruff check and format pass;
  `uv run python -c "import asyncio; from app.ai_recipe import generate_recipe; print(asyncio.run(generate_recipe(['Zucchini','Eier','Feta'], 30)).model_dump_json(indent=2))"`
  in `backend/` prints a German recipe with `source: "ai"`,
  `ready_in_minutes <= 30`, metric ingredients and steps; with `claude` not on
  `PATH` it raises `AiRecipeError`.

- [x] **3. Backend: search signal and AI endpoint.**
  - `ranking.py`: `GOOD_MISSING_MAX = 2`, `GOOD_RESULTS_MIN = 3`, pure
    `good_count(recipes) -> int` (results with `missing_count <= GOOD_MISSING_MAX`).
  - `routers/search.py`: `SearchResponse` gets `live_unavailable: bool`,
    `good_count: int`, `weak_results: bool`
    (`live_unavailable or good_count < GOOD_RESULTS_MIN`). Spoonacular quota /
    unavailable errors return 200 with `results: []`, `translated: true`,
    `live_unavailable: true`, `good_count: 0`, `weak_results: true` instead of
    503 / 502. Missing key (500), failed ingredient translation (502), and 422
    stay unchanged. No Claude recipe call during search.
  - New `routers/ai_recipe.py`: `POST /api/ai-recipe`, body reuses
    `SearchRequest` (same ingredient and `max_ready_time` validation), returns
    `{"recipe": RecipeDetail}`; `AiRecipeError` -> 502
    `Der KI-Vorschlag konnte nicht erstellt werden.` Does not need the
    Spoonacular key. Register the router in `main.py`.
  **Done when:** ruff check and format pass and via `/docs` or curl: a strong
  search (e.g. `["Nudeln","Tomaten","Knoblauch","Zwiebeln"]`) returns
  `weak_results: false` with `good_count >= 3`; a weak search (e.g.
  `["Feta","Rhabarber"]`) returns `weak_results: true` and the matching
  `good_count`; with an invalid `SPOONACULAR_API_KEY` the search is 200 with
  `live_unavailable: true`; `POST /api/ai-recipe` with
  `{"ingredients":["Zucchini","Eier"],"max_ready_time":30}` returns a German
  `source: "ai"` recipe; with `claude` not on `PATH` it returns the 502 message;
  `{"ingredients":[]}` is 422 on both endpoints.

- [x] **4. Frontend: AI offer and generation.**
  - `api/search.ts`: `SearchResponse` gets `live_unavailable`, `good_count`,
    `weak_results`.
  - New `api/aiRecipe.ts`: `generateAiRecipe(ingredients, maxReadyTime)` ->
    `RecipeDetail`, error pattern like `api/recipes.ts` (shared `readDetail`,
    fallback `Der KI-Vorschlag konnte nicht erstellt werden.`).
  - `useRecipeSearch`: the success state also keeps the searched
    `ingredients`, `liveUnavailable`, `goodCount`, `weakResults`.
  - New `hooks/useAiRecipe.ts`: idle / loading / success(recipe) / error,
    `generate(ingredients, maxReadyTime)`, `reset()`, latest-request-wins.
    `App` calls `reset()` when a new search starts, so each search allows one
    AI recipe and a running generation from an old search is ignored.
  - New `components/AiOffer.tsx`, rendered above the grid after every
    successful search while no AI recipe exists for it; it always uses the
    ingredients and time limit of that search, not the current chips.
    - Highlighted (amber box) when `weakResults`, with the text from the table
      below and the button "KI-Rezept erstellen".
    - Otherwise plain: "Nichts Passendes dabei?" plus the same button,
      visually secondary.
    - Loading: button disabled, `role="status"` text "KI-Rezept wird erstellt…
      das kann bis zu einer Minute dauern."
    - Error: message in `role="alert"`, button enabled again (retry).
  - Status line: live-unavailable searches show "Live-Rezepte sind gerade
    nicht verfügbar." instead of the empty text; other texts unchanged.
  **Done when:** `npm run lint` and `npm run build` pass; in the browser a weak
  search shows the amber message with the counts, a strong search shows the
  plain offer, the cards stay clickable while the offer is shown, clicking the
  button shows the loading text, an error (backend stopped) shows the alert and
  the button works again, and a new search resets the offer.

- [x] **5. Frontend: AI card and dialog.**
  - New `components/AiRecipeCard.tsx`: same card shape and stretched title
    button as `RecipeCard` (h3, focus ring); no photo but an emerald-tinted
    header area with a visible "KI-Vorschlag" badge (text, not color alone),
    German title, "{n} Min.", and "Aus deinen Zutaten, ergänzt um Gewürze und
    Grundzutaten." Rendered as the first grid item once generated; the grid
    also renders when there are no Spoonacular results.
  - `useRecipeDetail`: add `show(recipe)` that bumps the latest request id and
    sets `{ status: 'success', recipe, translated: true }` without a fetch.
  - `RecipeDetailDialog`: when `recipe.source === 'ai'`, show a "KI-Vorschlag"
    badge next to the time and no image area at all (an AI recipe never has a
    photo, so a grey placeholder would look broken); otherwise unchanged.
  - Focus returns to the AI card on close, like other cards.
  - When the AI recipe arrives, the offer button disappears; if focus was lost
    to the page (not moved elsewhere by the user), it moves to the AI card.
  **Done when:** `npm run lint` and `npm run build` pass; in the browser a
  generated recipe appears as the first card with the label, the offer
  disappears, click or Tab + Enter opens it instantly with the badge, Esc
  returns focus to the card; after a live-unavailable search the AI card shows
  alone in the grid.

## Files / areas

- `backend/app/claude_cli.py` - new, shared CLI runner
- `backend/app/translation.py` - uses `run_claude`
- `backend/app/ai_recipe.py` - new, prompt, schema, validation
- `backend/app/ranking.py` - `good_count` and constants
- `backend/app/routers/search.py` - new response fields, live-unavailable path
- `backend/app/routers/ai_recipe.py` - new endpoint
- `backend/app/main.py` - include the new router
- `frontend/src/api/search.ts`, `frontend/src/api/aiRecipe.ts` (new)
- `frontend/src/hooks/useRecipeSearch.ts`, `frontend/src/hooks/useAiRecipe.ts` (new),
  `frontend/src/hooks/useRecipeDetail.ts`
- `frontend/src/components/AiOffer.tsx`, `frontend/src/components/AiRecipeCard.tsx` (new)
- `frontend/src/components/RecipeDetailDialog.tsx`, `frontend/src/App.tsx`

## Data / contracts

Nothing new is persisted. The AI recipe is not cached and does not touch the
translation dictionary.

### `POST /api/search` response 200 (new fields)

```json
{
  "results": [],
  "translated": true,
  "live_unavailable": false,
  "good_count": 1,
  "good_missing_max": 2,
  "weak_results": true
}
```

- `good_count`: results with `missing_count <= good_missing_max`.
- `good_missing_max`: the backend rule (`GOOD_MISSING_MAX`, 2); the offer text
  reads it instead of hardcoding the number.
- `weak_results`: `live_unavailable` or `good_count < 3`.
- `live_unavailable`: Spoonacular failed, timed out, or quota exhausted;
  `results` is then `[]` (was 503 / 502 before this feature).

### `POST /api/ai-recipe`

- Request: same body as search (`ingredients` 1-20 items, 1-50 chars each
  after stripping; optional `max_ready_time` 1-1440).
- 200: `{"recipe": RecipeDetail}` with `source: "ai"`, `spoonacular_id: null`,
  `image: null`.
- 502: `{"detail": "Der KI-Vorschlag konnte nicht erstellt werden."}`;
  422 for invalid input.

### Offer texts (`AiOffer`, highlighted)

| Situation | Text before the button |
|---|---|
| `live_unavailable` or 0 results | `Soll die KI ein Rezept aus deinen Zutaten erstellen?` (the status line above already names the reason) |
| n results, g good (g < 3) | `{n} Rezepte gefunden, davon {g} mit höchstens {good_missing_max} fehlenden Zutaten. Soll die KI ein Rezept aus deinen Zutaten erstellen?` (`1 Rezept gefunden, …`) |

Plain offer (not weak): `Nichts Passendes dabei?` + button.

## Testing

No test runner is configured, so tests are not a gate. Checks:
`uv run ruff check .` / `uv run ruff format --check .` (backend),
`npm run lint` / `npm run build` (frontend), plus the manual checks in each
`Done when`. `good_count` and the AI output validation are pure and would get
unit tests once `/tests` is set up. Each AI check costs Claude Pro usage (one
`sonnet` call, likely 15-60 s) and each live search Spoonacular quota; keep live
checks few and do not claim them unless run.

## Notes for the AI

- Keep the CLI invocation an argument list via `asyncio.create_subprocess_exec`
  (no shell); user ingredients only go on stdin.
- Never use `--bare`; keep the env scrubbing in the one shared runner.
- Model aliases are module constants (`haiku` for translation, `sonnet` for the
  recipe).
- The "only entered ingredients plus spices and pantry basics" rule is enforced
  by the prompt; do not add a code checker for it.
- The weak-result threshold lives only in the backend; the frontend uses
  `weak_results` and `good_count`, never its own threshold.
- Render all AI text as React text, never `dangerouslySetInnerHTML`.
- Keep `RecipeCard` unchanged; the AI card is its own component.
- German UI text; Tailwind classes matching the existing cards and notes.
- Do not add a favorite button (feature 5).

## Try it now

Start both dev servers (`uv run fastapi dev app/main.py` in `backend/`,
`npm run dev` in `frontend/`), then open http://localhost:5173.

1. Search `Nudeln`, `Tomaten`, `Knoblauch`, `Zwiebeln`. Expect: the card grid
   and above it, unobtrusive, "Nichts Passendes dabei?" with an outlined
   "KI-Rezept erstellen" button. No AI recipe is generated on its own.
2. Search `Feta`, `Rhabarber` with "Max. Kochzeit" `10`. Expect: the status
   line "Keine passenden Rezepte in höchstens 10 Minuten gefunden." and below it
   an amber box "Soll die KI ein Rezept aus deinen Zutaten erstellen?" with a
   filled button.
3. Click "KI-Rezept erstellen". Expect: the button greys out and
   "KI-Rezept wird erstellt… das kann bis zu einer Minute dauern." appears;
   then a green-bordered card "KI-Vorschlag" shows up first and the box
   disappears. Its time is at most 10 Min. If you used Tab + Enter on the
   button, the keyboard focus is now on the new card.
4. Open that card (click or Tab + Enter). Expect: the recipe opens instantly
   without a photo area, with a "KI-Vorschlag" badge next to the time; Esc
   closes it and focus returns to the card.
5. Search again: the AI card is gone and the offer is back.
6. Stop the backend, then click "KI-Rezept erstellen" after a search that
   was shown before. Expect: a red "Der KI-Vorschlag konnte nicht erstellt
   werden." and the button is clickable again.


<!-- blueprint:completion {"schemaVersion":2,"specBytes":15449,"specSha256":"773ac71d8c47e31e15e2624c7043f64ee3e02ed080c45bf8c1772871bbdd3014","branch":"refs/heads/feature/ai-fallback-recipe","head":"c42b056a5abe458291419168f191c68454647b91","baseRef":"refs/heads/main","baseCommit":"2e07ee88bdb98884bda0d36588d7b1e4daf082cc","sourceTree":"24bb56d24953e9c98a2ce1a51931c680d89cc977","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** c42b056a5abe458291419168f191c68454647b91
**Base commit:** 2e07ee88bdb98884bda0d36588d7b1e4daf082cc
**Base ref:** main
**Spec hash:** 773ac71d8c47e31e15e2624c7043f64ee3e02ed080c45bf8c1772871bbdd3014
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-11-04T14:25:30+01:00
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-11-04T14:27:10+01:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `uv run ruff check .` (backend/): pass
- `uv run ruff format --check .` (backend/): pass (17 files already formatted)
- `npm run lint` (frontend/, oxlint): pass
- `npm run build` (frontend/, tsc -b && vite build): pass
- Test runner / Verify command: unavailable (none configured)

### Evidence

- Preflight: HEAD, merge base with `main`, and spec SHA-256 matched the request; `git status --porcelain` showed only `blueprint/context/review.md`.
- Reviewed the full `2e07ee8..c42b056` delta (20 files): `backend/app/{claude_cli,ai_recipe,ranking,translation,main}.py`, `backend/app/routers/{ai_recipe,search}.py`, the frontend api/hooks/components and `App.tsx`, plus the blueprint plan/overview/spec updates.
- Spec conformance: search returns 200 with `live_unavailable: true` on Spoonacular quota/unavailable errors while missing-key 500, ingredient translation 502, and 422 stay; `POST /api/ai-recipe` reuses `SearchRequest` validation and maps `AiRecipeError` to the spec's 502 text; response fields match the Data/contracts section.
- Security: CLI is invoked via `create_subprocess_exec` (no shell), user ingredients go only on stdin, `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` scrubbed in the single shared runner, `--tools ""`, cwd outside the repo; AI output is schema-constrained, validated (`validate_ai_output` catches KeyError/TypeError/AttributeError/ValidationError, rejects bool as int), and rendered as React text only.
- Frontend: latest-request-wins in `useAiRecipe` with `reset()` on every new search; `useRecipeDetail.show` bumps the request id so a pending Spoonacular detail load cannot overwrite the AI recipe; the offer always uses the searched ingredients/time limit, not the current chips.

### Findings

- None (no new findings; existing F-01 to F-03 from feature 1 left untouched)

### Remaining risk

- No test runner or Verify command is configured; `good_count` and `validate_ai_output` are pure but untested (spec defers this to `/tests`).
- No live Spoonacular or `claude` CLI calls were made by the reviewer (owner quota); actual CLI output shape, German recipe quality, and `ready_in_minutes` compliance were not exercised.
- Browser flows (offer states, loading/error/retry, focus move to the AI card, dialog badge, Esc focus return) were not exercised; Check was not required.
- An AI generation from a superseded search is ignored in the UI but neither the fetch nor the backend CLI process is cancelled, so it still consumes Pro usage until it finishes (accepted by the spec's "ignored" design).
- `run_claude` kills the subprocess only on timeout; if the request task is cancelled (e.g. dev-server reload) the CLI process is not killed (pattern carried over from the previous translation code).
