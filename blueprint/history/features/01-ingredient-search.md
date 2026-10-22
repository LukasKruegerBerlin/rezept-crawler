# Feature: Ingredient search

**From build-plan:** feature 1
**Build attempt:** 1
**Branch:** feature/ingredient-search
**Status:** verified

## Goal

Enter the ingredients you have as German chips, search Spoonacular through the
backend, and see German recipe cards ranked by fewest missing ingredients, with
spices and pantry basics never counted as missing. Tailwind CSS is set up as
part of this slice.

## In scope

- Backend `POST /api/search`: translate German ingredients to English (Claude),
  query Spoonacular `complexSearch`, compute missing count, re-rank, translate
  titles and ingredient names to German (Claude), return result cards. Claude
  runs through the Claude Code CLI (`claude -p`) on the owner's Pro
  subscription, never through an API key.
- English fallback: when translating the results fails, return them in
  English with `translated: false`; the UI shows a short German note.
- Missing-count and ranking rules from the overview (below), as plain functions.
- Error mapping for Spoonacular failure, timeout, quota exhausted, failed
  ingredient translation, and a missing Spoonacular key, with short German
  messages.
- `SPOONACULAR_API_KEY` from `backend/.env`, plus a committed
  `backend/.env.example` with an empty value. No Anthropic key.
- Tailwind CSS in the frontend; replace the scaffold theme; `lang="de"`.
- Main page: ingredient chips input, search button, card grid, loading / empty /
  error states, German UI text, basic keyboard accessibility.
- Update `coding-standards.md` Styling section (Tailwind) and the backend
  persistence/recipe-source TODO only as far as this feature decides
  (Spoonacular via backend; no persistence yet).

## Out of scope

- Opening a card / recipe detail and the recipe cache (Feature 2). Cards are
  not clickable yet.
- Max cooking time filter (Feature 3).
- AI fallback recipe and the "live recipes unavailable" note (Feature 4). In
  this feature, Spoonacular failure or quota exhaustion is shown as an error.
- Favorites and the header link to them (Feature 5).
- Search/translation caching (optional per plan; not added here).
- Cross-view polish beyond this page's own states (Feature 6).
- Unit test runner setup (no runner configured; see Testing).

## Build loop

`workflow.stepReview` is `feature`: implement all steps, then one review packet
for the whole feature. `checkpointCommits` is `disabled`: no commits per step.
`/complete` creates the final feature commit.

## Build steps

- [x] **1. Backend dependencies and secrets.** `uv add httpx python-dotenv`
  (no `anthropic`). Add `backend/.env.example` with `SPOONACULAR_API_KEY=`
  only. Load `.env` in `app/main.py` via `load_dotenv()` before anything reads
  the environment. Keep `/api/health` unchanged.
  Done when: `uv run ruff check .` and `uv run ruff format --check .` pass, and
  `GET /api/health` still returns `{"status":"ok"}`.

- [x] **2. Ranking logic.** `app/ranking.py`: plain functions that take parsed
  Spoonacular results and return `RecipeSummary` items with `missing_count`
  computed and sorted per the rules below. No HTTP or SDK imports.
  Done when: ruff passes and the functions are called by step 4 (behaviour
  observed there).

- [x] **3. External clients.** `app/spoonacular.py`: async `httpx` call to
  `complexSearch` with the parameters below and a timeout; maps HTTP 402 to a
  quota error and other non-2xx / network / timeout to an unavailable error.
  `app/translation.py`: async `claude -p` subprocess calls (flags under
  Translation below) for (a) German ingredients -> English search terms and
  (b) one batched call translating all result titles and ingredient names to
  German; both return validated lists of the same length as the input,
  otherwise raise a translation error. Before writing (b)
  check the real response: confirm the `aisle` value Spoonacular uses for
  spices (expected `"Spices and Seasonings"`) and that `readyInMinutes` is
  present with `addRecipeInformation=true`; adjust the parameters if not.
  Done when: ruff passes; behaviour observed in step 4.

- [x] **4. Search endpoint.** `app/routers/search.py` with an `APIRouter`,
  Pydantic request/response models, error mapping to `HTTPException` with the
  German `detail` strings below; include the router in `app/main.py`.
  Done when: with a real `SPOONACULAR_API_KEY` in `backend/.env` and the
  `claude` CLI logged in,
  `curl -X POST localhost:8000/api/search -H 'Content-Type: application/json'
  -d '{"ingredients":["Zucchini","Eier","Feta","Zwiebeln"]}'` returns German
  results with `translated: true`, ranked by `missing_count` ascending, ties by
  more used ingredients; with result translation forced to fail it returns
  English results with `translated: false`; `{"ingredients":[]}` and
  `{"ingredients":["  "]}` return 422; with `SPOONACULAR_API_KEY` removed it
  returns 500 with the missing-key message; ruff passes; `/docs` shows the
  endpoint.

- [x] **5. Tailwind setup.** `npm install -D tailwindcss @tailwindcss/vite`,
  add the plugin in `vite.config.ts` (keep the `/api` proxy), replace
  `src/index.css` with `@import "tailwindcss";` plus only the base styles still
  needed (light theme), set `<html lang="de">`, and update the Styling section
  of `coding-standards.md`.
  Done when: `npm run lint` and `npm run build` pass and the existing page
  renders with Tailwind utility classes applied.

- [x] **6. Search UI.** `src/api/search.ts` (types + `searchRecipes()`),
  `src/hooks/useRecipeSearch.ts`, `src/components/IngredientInput.tsx`,
  `src/components/RecipeCard.tsx`, and `App.tsx` composing them (replace the
  health-check placeholder).
  Done when: `npm run lint` and `npm run build` pass, and in the browser with
  both dev servers running: chips add with Enter and remove with x / keyboard;
  the search button is disabled with no chips; searching shows a loading state,
  then a ranked German card grid; an English fallback response shows the
  German note above the grid; a search with no matches shows the empty
  message; stopping the backend shows the error message.

## Files / areas

- `backend/pyproject.toml`, `backend/uv.lock` (via `uv add` only)
- `backend/.env.example` (new, committed; `.env` stays git-ignored)
- `backend/app/main.py` - `load_dotenv()`, include search router
- `backend/app/routers/__init__.py`, `backend/app/routers/search.py` (new)
- `backend/app/ranking.py`, `backend/app/spoonacular.py`,
  `backend/app/translation.py` (new)
- `frontend/package.json`, `frontend/package-lock.json`, `frontend/vite.config.ts`
- `frontend/index.html`, `frontend/src/index.css`, `frontend/src/App.tsx`
- `frontend/src/api/search.ts`, `frontend/src/hooks/useRecipeSearch.ts`,
  `frontend/src/components/IngredientInput.tsx`,
  `frontend/src/components/RecipeCard.tsx` (new)
- `blueprint/context/coding-standards.md` - Styling section, backend TODO

## Data / contracts

Nothing is persisted. Ingredient lists are not stored or logged.

### `POST /api/search`

Request body:

```json
{ "ingredients": ["Zucchini", "Eier", "Feta", "Zwiebeln"] }
```

- `ingredients`: `list[str]`, 1-20 items; each item stripped, 1-50 chars after
  stripping. Violations -> 422 (FastAPI default body). Limits satisfy the
  standards' "validate list sizes and lengths" rule and are easy to change.

Response 200:

```json
{
  "results": [
    {
      "source": "spoonacular",
      "spoonacular_id": 716429,
      "title": "Zucchini-Feta-Frittata",
      "image": "https://img.spoonacular.com/recipes/716429-312x231.jpg",
      "ready_in_minutes": 25,
      "used_ingredients": ["Zucchini", "Eier", "Feta"],
      "missing_ingredients": ["Sahne"],
      "missing_count": 1
    }
  ],
  "translated": true
}
```

- `source`: always `"spoonacular"` in this feature (Feature 4 adds `"ai"`).
- `image`, `ready_in_minutes`: nullable when Spoonacular omits them.
- `used_ingredients`, `missing_ingredients`: German names, or Spoonacular's
  English names when `translated` is false. `missing_ingredients` lists only
  non-spice missed ingredients, so it matches `missing_count`.
- `translated`: false only when the result translation failed; all titles and
  ingredient names are then English. True for empty results.
- Empty matches -> `{"results": [], "translated": true}` (200).

Errors (`{"detail": "<German message>"}`):

| Case | Status | detail |
|---|---|---|
| `SPOONACULAR_API_KEY` is unset | 500 | `API-Schlüssel fehlt. Bitte backend/.env prüfen.` |
| Spoonacular 402 (daily quota) | 503 | `Das Spoonacular-Tageskontingent ist aufgebraucht.` |
| Spoonacular non-2xx, network error, timeout | 502 | `Live-Rezepte sind gerade nicht verfügbar.` |
| Ingredient translation (German -> English) fails | 502 | `Die Übersetzung ist fehlgeschlagen.` |

A failed result translation is not an error: see `translated` above.

Never include upstream bodies, keys, or stack traces in `detail`.

### Spoonacular call

`GET https://api.spoonacular.com/recipes/complexSearch` with
`includeIngredients` (comma-joined English terms), `fillIngredients=true`,
`addRecipeInformation=true`, `sort=min-missing-ingredients`,
`ignorePantry=true`, `number=20`, `apiKey` from env. Timeout 10 s.
`number=20` resolves the plan's deferred "how many results to fetch" for this
feature; reversible.

### Rules (from the overview)

- **Missing count** = `missedIngredients` (pantry basics already excluded by
  `ignorePantry`) minus items whose `aisle` is the spices aisle.
- **Ranking**: ascending `missing_count`; ties -> more `usedIngredients` first;
  remaining ties keep Spoonacular's order.

### Translation

- Runs the Claude Code CLI on the owner's Pro subscription (verified locally:
  CLI 2.1.306, logged in via claude.ai, ~3.5 s per small call):
  `claude -p --model haiku --output-format json --json-schema <schema>
  --system-prompt <prompt> --tools "" --no-session-persistence
  --setting-sources "" --strict-mcp-config`, input JSON list on stdin, cwd a
  temp directory (no project `CLAUDE.md` loaded). Model alias `haiku` is a
  module constant.
- Never use `--bare` (it only accepts API keys). Remove `ANTHROPIC_API_KEY`
  and `ANTHROPIC_AUTH_TOKEN` from the subprocess environment so the CLI never
  bills the API.
- Schema `{"translations": [string]}`; read `structured_output.translations`
  from the JSON result. `is_error`, a non-`success` subtype, a non-zero exit,
  a missing `claude` binary, invalid JSON, a length mismatch, or a timeout
  (60 s, process killed) raise the translation error.
- Ingredients -> English: one call, returns one cooking term per input in
  order; ambiguous words resolve to the most likely cooking meaning
  (e.g. "Paprika" -> "bell pepper"). Failure -> 502 above.
- Results -> German: one batched call for all unique titles and used/missing
  ingredient names; output length and order must match input. Failure ->
  English results with `translated: false`.

### Frontend types

`src/api/search.ts` mirrors the response: `RecipeSummary`, `SearchResponse`
(including `translated`), and an error carrying the backend `detail` string
(fallback text `Die Suche ist fehlgeschlagen.` when the body has none or the
network fails). English-fallback note:
`Übersetzung gerade nicht verfügbar – die Rezepte werden auf Englisch angezeigt.`

## Testing

No test runner is configured, so tests are not a gate. Checks for this feature:

- Backend: `uv run ruff check .`, `uv run ruff format --check .`, the curl
  checks in step 4.
- Frontend: `npm run lint`, `npm run build`, the manual browser checks in step 6.
- Live checks spend Spoonacular quota (about 1-2 points per search) and Claude
  Pro usage (two CLI calls per search); keep them few.

Ranking is pure logic and a good first unit-test target; adding a runner is a
separate `/tests` run, not part of this feature.

## Notes for the AI

- Use `asyncio.create_subprocess_exec` (argument list, no shell) for the CLI so
  the request handler stays async and prompts are never shell-interpolated.
- The frontend calls only relative `/api/search`; never Spoonacular or Claude.
- UI copy is German. Suggested strings: input label `Zutaten`, placeholder
  `Zutat eingeben und Enter drücken`, button `Rezepte suchen`, loading
  `Suche Rezepte…`, empty `Keine passenden Rezepte gefunden.`, card badge
  `fehlt: {n}`, card labels `Vorhanden:` / `Fehlt:`, time `{n} Min.`.
- Chips: Enter adds trimmed non-empty text; duplicates (case-insensitive) are
  ignored; each chip has a remove button with `aria-label="{name} entfernen"`;
  Backspace on an empty input is not required. On search, any non-empty text
  still in the input is added as a chip first.
- Input has a visible `<label>`. The results region uses `aria-live="polite"`
  for loading/empty/result-count updates; errors render with `role="alert"`.
  Focus stays on the search button / input after a search.
- Disable the search button (and set `aria-busy` on the results region) while
  a request is running; a new result replaces the previous one.
- Card image `alt` is the German title; render all text as React text (never
  `dangerouslySetInnerHTML`). Titles from Spoonacular may contain HTML entities;
  decode them in the backend before translation if they appear.
- Layout: light theme, generous whitespace, responsive card grid; photos carry
  the visual weight. Keep it minimal; Feature 6 handles cross-view polish.



<!-- blueprint:completion {"schemaVersion":2,"specBytes":13365,"specSha256":"cc8c94ef8778b5e3dd05d09014f4ef44a80245386934bfe4a54f48d9fec50f0b","branch":"refs/heads/feature/ingredient-search","head":"1691f98cd03d7516c52a97b290a2f7910d92e4aa","baseRef":"refs/heads/main","baseCommit":"8cb05fbb46f6ad650ba752c6384ecf50e759199e","sourceTree":"825f48cb4cfb27d504793af7e0fe58fd19f26a74","landing":"local-merge","absentOptional":[]} -->

## Independent review

**Status:** passed
**Target commit:** 1691f98cd03d7516c52a97b290a2f7910d92e4aa
**Base commit:** 8cb05fbb46f6ad650ba752c6384ecf50e759199e
**Base ref:** main
**Spec hash:** cc8c94ef8778b5e3dd05d09014f4ef44a80245386934bfe4a54f48d9fec50f0b
**Prepared by:** claude
**Builder model:** claude-opus-5-5
**Requested reviewer:** claude
**Requested model:** claude-opus-5-5
**Requested execution:** automatic
**Requested at:** 2026-10-22T23:54:17+02:00
**Workflow:** regular
**Check required:** no
**Reviewer adapter:** claude
**Reviewer model:** claude-opus-5-5
**Reviewer context:** fresh subagent
**Actual execution:** automatic
**Reviewed at:** 2026-10-22T23:56:23+02:00
**Scope:** current
**Lenses:** quality, security, performance, tests
**Verdict:** passed
**Check result:** not-required

### Commands

- `git rev-parse HEAD`, `git merge-base main HEAD`, `sha256sum blueprint/context/current-feature.md`, `git status --porcelain`: pass (HEAD, merge base, spec hash match the request; only `blueprint/context/review.md` differs)
- `uv run ruff check .` (backend): pass
- `uv run ruff format --check .` (backend): pass
- `npm run lint` (frontend, oxlint): pass
- `npm run build` (frontend, tsc + vite): pass

### Evidence

- Reviewed the full `8cb05fb..1691f98` delta: backend `main.py`, `ranking.py`, `spoonacular.py`, `translation.py`, `routers/search.py`, `pyproject.toml`/`uv.lock`, `.env.example`; frontend `App.tsx`, `api/search.ts`, `hooks/useRecipeSearch.ts`, `components/IngredientInput.tsx`, `components/RecipeCard.tsx`, `index.css`, `index.html`, `vite.config.ts`, `package.json`; and the planning/standards doc updates.
- Spec contract checked: request validation (1-20 items, stripped 1-50 chars), error table and German messages, missing-key check before any external call, 402 -> 503 quota mapping, translation fallback with `translated: false`, ranking key `(missing_count, -used)` with stable sort, spice aisle exclusion, frontend copy and a11y attributes (`role="status"`, `role="alert"`, `aria-busy`, chip remove labels).
- Security: CLI invoked via `create_subprocess_exec` argument list (no shell), user/upstream text only on stdin, `--tools ""`, `ANTHROPIC_API_KEY`/`ANTHROPIC_AUTH_TOKEN` stripped from the child env, no upstream bodies or keys in `detail`, all text rendered as React text, `.env` git-ignored, `.env.example` empty.
- Performance: two CLI calls and one Spoonacular call per search, bounded by 60 s/10 s timeouts with process kill on timeout; proportional for a single-user local tool.
- Tests: no test runner is configured (spec Testing section); no skipped or placeholder tests exist in the delta.

### Findings

- F-01 [P3] open - Malformed Spoonacular result items escape the error mapping as a bare 500
- F-02 [P3] open - Ingredient length/count limits only surface as the generic error
- F-03 [P3] open - Card headings skip from h1 to h3

### Remaining risk

- No test runner exists, so ranking and translation-validation logic have no automated tests.
- No live verification was run by this reviewer: the `/api/search` curl checks, Spoonacular, and the `claude` CLI were intentionally not called (owner quota), so CLI flag behavior (e.g. `--setting-sources ""`, `--json-schema` structured output) and the real Spoonacular `aisle` value are unverified here.
- No browser verification was run by this reviewer; dev servers were not started.
- Unverified: the CLI runs with cwd set to the shared system temp directory; whether a `CLAUDE.md` placed there would still be loaded despite `--setting-sources ""` was not checked (low relevance on a single-user machine).

## Try it now

1. Start the backend in `backend/` (`uv run fastapi dev app/main.py`) and the
   frontend in `frontend/` (`npm run dev`). `backend/.env` needs
   `SPOONACULAR_API_KEY`; the `claude` CLI must be logged in with the Pro account.
2. Open http://localhost:5173. With no ingredients, "Rezepte suchen" is disabled.
3. Add `Zucchini`, `Eier`, `Feta` with Enter; type `Zwiebeln` without Enter and
   click "Rezepte suchen".
4. Expect "Suche Rezepte…" for roughly 20 seconds, then German recipe cards with
   photo, title, "xx Min.", a "fehlt: n" badge, and "Vorhanden:" / "Fehlt:"
   lists, sorted by fewest missing ingredients, plus "20 Rezepte gefunden."
5. Stop the backend and search again: a red box shows
   "Die Suche ist fehlgeschlagen."
