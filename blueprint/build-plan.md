# Build Plan

Features in build order. Details come later in `/feature`.

Scaffolding the app (done) and prototyping are pre-build steps, not features.

## Your features

### MVP

- [x] 1. **Ingredient search** - German ingredient chips input, translation to English via Claude, Spoonacular search, German result cards ranked by fewest missing ingredients with spices and pantry basics excluded; Tailwind set up as part of this slice
- [ ] 2. **Recipe detail** - open a result as a full German recipe (metric ingredients, steps), translated on demand and cached in local JSON
- [ ] 3. **Cooking time filter** - limit results to a maximum ready time
- [ ] 4. **AI fallback recipe** - one labelled Claude-generated German recipe when fewer than 3 results have 2 or fewer missing ingredients, or when Spoonacular is unavailable
- [ ] 5. **Favorites** - save, list, open, and remove Spoonacular and AI recipes, stored in local JSON
- [ ] 6. **UI polish** - consistent minimal layout, loading, empty, and error states, and keyboard accessibility across all views

### Later

- Diet and intolerance filters
- Shopping list for missing ingredients
- Search result relevance: candidates often use only 1-2 entered ingredients
  with `sort=min-missing-ingredients`; `max-used-ingredients` tested better
- Search speed: ~22 s per search, mostly the two `claude -p` CLI calls