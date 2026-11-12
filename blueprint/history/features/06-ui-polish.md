# Feature: UI polish

**From build-plan:** feature 6
**Build attempt:** 1
**Branch:** feature/ui-polish
**Status:** verified

## Goal

Close the remaining gaps in the finished MVP UI: clearer feedback during the slow
requests (search ~22 s, detail translation, AI recipe), a recovery path for every
error state, a graceful fallback for broken photos, and keyboard focus that never
drops to the page when a button turns busy. No new features, no visual redesign.

## In scope

- **Loading feedback** for every request, with a small shared spinner:
  - Search: spinner next to the status line plus the hint "Das kann bis zu
    30 Sekunden dauern." and a grid of 3 pulsing placeholder cards in the
    existing card layout (`animate-pulse`).
  - Recipe detail: spinner beside "Rezept wird geladen und übersetzt…" plus a
    pulsing image/text placeholder in the dialog.
  - AI recipe: spinner beside the existing "KI-Rezept wird erstellt…" text.
  - Favorites list: spinner beside "Favoriten werden geladen…".
- **Error recovery**:
  - Detail dialog error gets an "Erneut versuchen" button that reloads the same
    Spoonacular recipe (styled like the existing favorites retry button).
  - Search and AI errors already recover through their still-visible buttons;
    no change beyond the focus fix below.
- **Broken images**: when a recipe photo fails to load (card or dialog), show
  the existing grey placeholder instead of the browser's broken-image icon.
- **Keyboard focus while busy**: buttons that become busy keep focus instead of
  being `disabled` (which drops focus to `<body>`): the favorite toggle in the
  dialog, the "KI-Rezept erstellen" button, and the "Entfernen" button in the
  favorites list. While busy they look disabled, ignore clicks/Enter, and stay
  focusable.
- **Contrast**: the ingredient input placeholder (`stone-400`, below 3:1 on
  white) moves to `stone-500`.
- **Consistency pass** limited to what the steps touch: busy buttons share one
  look (`opacity-50`, `cursor-not-allowed`), loading lines share the spinner.

## Out of scope

- Any later build-plan item (diet filters, shopping list, relevance, speed,
  translation editing).
- Redesign, new colors, dark mode, component library, shared button-class
  abstraction.
- Screenreader-only changes (ARIA wording, live-region tuning) - the app is used
  by its owner only.
- A search retry button (the search button stays enabled after an error and
  ingredients are kept, so it already is the retry).
- Backend changes.

## Build loop

`workflow.stepReview: "feature"`, `checkpointCommits: "disabled"`: implement all
steps, run lint and build after each, then present one review packet for the
whole feature. `/complete` creates the single feature commit.

## Build steps

- [x] 1. **Spinner and loading states** - add `Spinner` (inline SVG or bordered
  `animate-spin` span, `aria-hidden`); use it in the search status line, detail
  loading text, AI loading text, and favorites loading text. Add the search
  duration hint and 3 placeholder cards while searching, and a placeholder block
  in the dialog while loading.
  Done when: each of the four loading states shows the spinner, the search shows
  the hint and placeholder cards, and `npm run lint` + `npm run build` pass.
- [x] 2. **Detail retry and image fallback** - `RecipeDetailDialog` gets an
  optional `onRetry`; `App` passes a retry that calls `detail.load` with the last
  opened Spoonacular id (only for Spoonacular recipes; AI recipes never error).
  `RecipeCard` and the dialog image fall back to the grey placeholder on `onError`
  (local `useState`, reset per recipe via the existing `key`/recipe identity).
  Done when: a failed detail load (e.g. backend stopped) shows the retry button
  and a retry after restarting the backend loads the recipe; an invalid image URL
  shows the placeholder; lint + build pass.
- [x] 3. **Focus-safe busy buttons and contrast** - replace `disabled` with
  `aria-disabled` + a guarded handler on the favorite toggle, the AI offer button,
  and the favorites "Entfernen" button; apply the shared busy look. Change the
  ingredient placeholder to `placeholder:text-stone-500`.
  Done when: with the keyboard only, pressing the favorite toggle, "KI-Rezept
  erstellen" (including a failed request), and "Entfernen" with a failing backend
  leaves focus on the same button (or, on remove success, the existing next-row
  focus); a second Enter while busy sends no second request; lint + build pass.

## Files / areas

- `frontend/src/components/Spinner.tsx` (new)
- `frontend/src/App.tsx` - search loading block, detail retry wiring
- `frontend/src/components/RecipeDetailDialog.tsx` - loading placeholder, retry,
  image fallback, busy favorite toggle
- `frontend/src/components/RecipeCard.tsx` - image fallback
- `frontend/src/components/AiOffer.tsx` - spinner, busy button
- `frontend/src/components/FavoritesList.tsx` - spinner, busy remove button
- `frontend/src/components/IngredientInput.tsx` - placeholder contrast

## Data / contracts

No API, storage, or type changes. `RecipeDetailDialog` props gain
`onRetry?: () => void`, shown only in the error state when provided. App keeps
the last opened Spoonacular id in a ref for the retry.

## Testing

No test runner is configured; all changes are UI-only and exempt from unit tests
under the coding standards. Evidence: `npm run lint` and `npm run build` per step,
then `/check` in the running app (keyboard walkthrough, stopped backend for error
states, browser devtools to force a broken image URL).

## Notes for the AI

- Existing state machines (`useRecipeSearch`, `useRecipeDetail`, `useAiRecipe`,
  `useFavorites`) stay as they are; only rendering changes, plus the retry id.
- Keep German UI text; keep the current Tailwind palette (stone/emerald/amber/red).
- The search button stays `disabled` while searching: `handleSubmit` already
  moves focus to the ingredient input, so it does not drop focus.
- `aria-disabled` buttons must early-return in their handler; Tailwind's
  `aria-disabled:` variant gives the busy look.
- The App effect that moves focus to the new AI card checks
  `document.activeElement === document.body`; with the AI button now keeping
  focus while it unmounts on success, verify focus still lands on the AI card
  (the button unmounts, so focus falls to body before the effect runs - confirm
  in the browser and adjust the condition only if needed).


<!-- blueprint:completion {"schemaVersion":2,"specBytes":6439,"specSha256":"debfa4aabada0d8d19c3a8ede842d51b92c79348ca07e26ace913a2d1b901986","branch":"refs/heads/feature/ui-polish","head":"0a352933cdd2a2d1a8c231d0fe6b01c30cda3833","baseRef":"refs/heads/main","baseCommit":"0a352933cdd2a2d1a8c231d0fe6b01c30cda3833","sourceTree":"23b9cb6f9d481bb032e3a62af922b0396156eeab","landing":"local-merge","absentOptional":[]} -->

## Try it now

1. Start the backend (`uv run fastapi dev app/main.py`) and frontend (`npm run dev`), open http://localhost:5173.
2. Enter two ingredients and click "Rezepte suchen": a spinner, the hint "Das kann bis zu 30 Sekunden dauern." and 3 pulsing placeholder cards show until the results arrive.
3. Open a recipe, Tab to "Als Favorit speichern" and press Enter: focus stays on the button, which then reads "Gespeichert – entfernen".
4. Optional: stop the backend and open a recipe not opened before: a red error with "Erneut versuchen" appears; restart the backend and click it to load the recipe.
