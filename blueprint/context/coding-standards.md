# Coding Standards

> Conventions for the Recipe Crawler stack: FastAPI (Python, uv) backend and
> Vite + React + TypeScript (npm) frontend. Tuned by `/onboard`; edit as the
> project grows.

## Project Structure

- `backend/` - FastAPI app, managed with uv. Package code lives in `backend/app/`;
  the ASGI entry point is `app/main.py` (`app`).
- `frontend/` - Vite + React single-page app. Source in `frontend/src/`.
- Keep the two sides independent: the only contract between them is the HTTP
  JSON API under `/api`.

## Python (backend)

- Python 3.13+, dependencies via `uv add` (never edit `uv.lock` by hand)
- Type-annotate every function signature
- Ruff is the linter and formatter; code must pass `uv run ruff check .` and
  `uv run ruff format --check .`
- snake_case for functions, variables, and modules; PascalCase for classes
- Group endpoints with `APIRouter` per feature once there is more than one
  feature (`app/routers/<feature>.py`), and include them in `app/main.py`
- Keep business logic (for example ingredient matching) in plain functions or
  modules separate from route handlers so it can be tested without HTTP

> TODO: data storage and the recipe source are not chosen yet. Record the
> persistence and data-access convention here once the project plan decides it.

## API

- All endpoints live under the `/api` prefix
- Define request and response bodies as Pydantic models; declare
  `response_model` or return-type annotations so the OpenAPI docs stay accurate
- Validate untrusted input at the boundary with Pydantic (types, lengths, list
  sizes); do not re-validate inside internal functions
- Errors: raise `HTTPException` with an appropriate status code and a short,
  user-safe `detail`; never leak stack traces or secrets
- Secrets and API keys come from environment variables, never from source code

## TypeScript (frontend)

- Strict typing; no `any` - use proper types or `unknown`
- Define types for props and for every API response shape the frontend consumes
- Use type inference where obvious, explicit types where helpful
- Code must pass `npm run lint` (oxlint) and `npm run build` (which runs `tsc -b`)

## React

- Functional components and hooks only
- Keep components focused - one job per component
- Extract reusable logic into custom hooks
- Call the backend with `fetch` against relative `/api/...` paths (the Vite dev
  server proxies them); keep API calls in one place (`src/api/`) once there is
  more than one

## File Organization (frontend)

- Components: `src/components/ComponentName.tsx`
- Hooks: `src/hooks/useThing.ts`
- API client functions and response types: `src/api/<feature>.ts`
- Introduce feature subfolders only when a folder gets crowded

## Naming

- React components: PascalCase files and names (`IngredientPicker.tsx`)
- TS functions and variables: camelCase; constants: SCREAMING_SNAKE_CASE
- Types/Interfaces: PascalCase (no prefix)
- Python: follow PEP 8 naming

## Styling

- Plain CSS as scaffolded (`src/index.css`); no CSS framework is installed
- No inline styles except for truly dynamic values

> TODO: choose a styling approach (plain CSS, CSS modules, Tailwind, a component
> library) when the UI direction is decided in the project plan.

## Error Handling

- Backend: see API above
- Frontend: handle loading, empty, and error states for every request; show a
  short user-friendly message instead of failing silently

## Testing

The blueprint installs no test runner; testing is opt-in at the project level,
because the overlay can't know your stack. Adding unit testing is an explicit
setup task the AI can do through the normal workflow, either as a build-plan item
or with `/tests`. The setup should choose the stack-native runner, wire the
scripts or commands, add a small example test, and update the Commands section
of `AGENTS.md`.

When `AGENTS.md` declares a `Verify` command, treat it as the umbrella automated
gate. It combines only the checks this project actually has, in this order when
available: typecheck, tests, then build. The command does not enable an absent
test runner or replace focused evidence. It gives local work and optional CI one
exact command to run. `/ci` owns Verify and CI setup. `/tests` adds the real test
command to Verify when it already exists, but never creates CI only because
testing was configured.

**The opt-in switch is one signal: a `test` command in the Commands section of
`AGENTS.md`.** Declare one and **tests become a gate for logic-bearing steps**,
not an optional extra; leave it out and the loop verifies logic with the evidence
it already uses (run it, a screenshot, the build). Adding the runner is itself a
deliberate step, never a silent mid-step install. This is the single definition
of the switch; the skills and `ai-interaction.md` only point back here.

- **What to test (the scope rule):** pure logic where a wrong answer is possible -
  parsers, formatters, validators, id/slug builders, API request/response handling. These have
  assertable inputs and outputs and real edge cases (empty, missing, malformed).
- **What not to test:** UI components and integration-level surfaces (render or
  export routes, anything driving a real browser or external service). Verify those
  with a screenshot and the build, not brittle unit tests.
- **The gate (when a runner is configured):** a build step that adds in-scope logic
  must ship a passing test in the same reviewable diff. The project's test command
  must be green before the step is approved, before any checkpoint commit, and
  before `/complete` merges. UI and integration-only steps are exempt and ride on
  screenshot plus build evidence.
- **When it's named:** the `/feature` spec's Testing section predicts the coverage,
  `/implement` writes the test with the step, and if a step surfaces logic the spec
  didn't foresee, add a focused test then.
- An empty suite should fail, not pass, so "no tests ran" never looks like "passed".
- Test files live next to source files (for example `feature.test.ts`); Python tests live in `backend/tests/` as `test_*.py`.
- Run them via the project's test command (see Commands in `AGENTS.md`), not a
  hardcoded tool name.

Stack binding: backend logic would use pytest (with FastAPI's `TestClient` for
endpoint-level logic); frontend logic would use Vitest. Neither is installed yet.

## Browser Verification

For UI and integration behavior, prefer real browser evidence over reading the
code and assuming it works.

- Browser automation is separately opt-in through `/tests browser`. That setup
  reuses a compatible runner or prefers Playwright for supported projects, then
  documents the exact command as `Browser tests` in `AGENTS.md`.
- When `Browser tests` is declared, add focused coverage for stable behavioral
  done-whens when it is proportionate, and run the documented command during
  `/check`. Do not assume it proves visual fidelity, real authenticated-profile
  behavior, browser chrome, or another claim the test does not observe.
- If no Browser tests command is declared, do not add a runner silently in the
  middle of an unrelated feature. Use the available dev server, browser
  screenshots, build output, API output, or manual evidence instead.
- Browser tests are not part of the default Verify command or CI unless the user
  separately chooses that slower gate.
- Browser evidence is especially important for flows that click, type, submit,
  navigate, download files, render complex layouts, or depend on client-side
  state.

## Code Quality

- No commented-out code unless specified
- No unused imports or variables
- Keep functions under 50 lines when possible

## Comments

Write code that explains itself; comment only what the code cannot say.
Over-commenting is a common AI tell, so resist it.

- Comment the **why**, not the **what**. Delete any comment that restates the code.
- No banner/header blocks, section dividers, or step-by-step narration of obvious
  code. A file does not need a comment announcing each region.
- A comment earns its place only when it captures something the code can't: a
  non-obvious decision, a gotcha or workaround, why a value is what it is, or a
  link to a spec or issue.
- Prefer self-documenting names and small functions over explanatory comments.
- Keep doc comments minimal: a one-line purpose on an exported type or function is
  plenty; don't write JSDoc that just repeats the signature.
- When in doubt, leave the comment out.

## Writing

- No em dashes (U+2014) in generated content: docs, comments, commit messages,
  READMEs, specs. They read as AI-generated.
- Use a hyphen for `term - description` separators; rephrase prose with commas,
  parentheses, or a colon. Avoid en dashes and the ellipsis character too.
