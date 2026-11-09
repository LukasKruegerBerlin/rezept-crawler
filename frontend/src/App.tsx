import { useEffect, useRef, useState } from 'react'
import { type Favorite, favoritesErrorMessage } from './api/favorites'
import type { RecipeDetail } from './api/recipes'
import AiOffer from './components/AiOffer'
import AiRecipeCard from './components/AiRecipeCard'
import FavoritesList from './components/FavoritesList'
import IngredientInput from './components/IngredientInput'
import RecipeCard from './components/RecipeCard'
import RecipeDetailDialog from './components/RecipeDetailDialog'
import { useAiRecipe } from './hooks/useAiRecipe'
import { useFavorites } from './hooks/useFavorites'
import { useKnownIngredients } from './hooks/useKnownIngredients'
import { useRecipeDetail } from './hooks/useRecipeDetail'
import { type SearchState, useRecipeSearch } from './hooks/useRecipeSearch'
import { missingPhrase, parseMaxMissing } from './missingFilter'

function filteredText(found: number, visible: number, maxMissing: number): string {
  const phrase = missingPhrase(maxMissing)
  if (visible === 0) {
    return found === 1
      ? `Das gefundene Rezept kommt nicht ${phrase} aus.`
      : `Keines der ${found} gefundenen Rezepte kommt ${phrase} aus.`
  }
  return `${visible} von ${found} ${found === 1 ? 'Rezept' : 'Rezepten'} ${phrase}.`
}

function statusText(state: SearchState, maxMissing: number | null, visible: number): string {
  switch (state.status) {
    case 'idle':
      return 'Gib deine Zutaten ein und starte die Suche.'
    case 'loading':
      return 'Suche Rezepte…'
    case 'success':
      if (state.liveUnavailable) return 'Live-Rezepte sind gerade nicht verfügbar.'
      if (state.results.length === 0) {
        return state.maxReadyTime === null
          ? 'Keine passenden Rezepte gefunden.'
          : `Keine passenden Rezepte in höchstens ${state.maxReadyTime} Minuten gefunden.`
      }
      if (maxMissing !== null) return filteredText(state.results.length, visible, maxMissing)
      return state.results.length === 1
        ? '1 Rezept gefunden.'
        : `${state.results.length} Rezepte gefunden.`
    case 'error':
      return ''
  }
}

function App() {
  const [ingredients, setIngredients] = useState<string[]>([])
  // Raw field text; '' means no limit. The form only submits valid whole minutes.
  const [maxReadyTime, setMaxReadyTime] = useState('')
  // Raw field text; filters the current results live, without a new search.
  const [maxMissingText, setMaxMissingText] = useState('')
  const maxMissing = parseMaxMissing(maxMissingText)
  const { state, search } = useRecipeSearch()
  const visibleResults =
    state.status !== 'success'
      ? []
      : maxMissing === null
        ? state.results
        : state.results.filter((recipe) => recipe.missing_count <= maxMissing)
  // With the filter set, "too few results" means too few visible cards.
  const weakResults =
    state.status === 'success' &&
    (state.liveUnavailable ||
      (maxMissing === null ? state.weakResults : visibleResults.length < state.goodResultsMin))
  const known = useKnownIngredients()
  const detail = useRecipeDetail()
  const aiRecipe = useAiRecipe()
  const generated = aiRecipe.state.status === 'success' ? aiRecipe.state.recipe : null
  const aiCardButton = useRef<HTMLButtonElement>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  // Focus goes back to the card that opened the detail.
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const favorites = useFavorites()
  const [view, setView] = useState<'search' | 'favorites'>('search')
  const favoritesButton = useRef<HTMLButtonElement>(null)
  const favoritesHeading = useRef<HTMLHeadingElement>(null)
  // AI recipes have no Spoonacular id, so each saved AI recipe object maps to its favorite id.
  const [aiFavoriteIds] = useState(() => new WeakMap<RecipeDetail, string>())
  const [favoriteToggle, setFavoriteToggle] = useState<{ busy: boolean; error: string | null }>({
    busy: false,
    error: null,
  })
  // Only a toggle for the recipe that is still open may update its state.
  const toggleRequest = useRef(0)
  const viewChanged = useRef(false)

  useEffect(() => {
    // Skip the first render; afterwards focus follows the view switch.
    if (!viewChanged.current) {
      viewChanged.current = true
      return
    }
    if (view === 'favorites') favoritesHeading.current?.focus()
    else favoritesButton.current?.focus()
  }, [view])

  useEffect(() => {
    // The offer button disappears with the result, which drops keyboard focus to the
    // page; move it to the new card unless the user has focused something else meanwhile.
    if (generated !== null && document.activeElement === document.body) {
      aiCardButton.current?.focus()
    }
  }, [generated])

  function resetFavoriteToggle() {
    ++toggleRequest.current
    setFavoriteToggle({ busy: false, error: null })
  }

  function openDetail(spoonacularId: number, trigger: HTMLButtonElement) {
    resetFavoriteToggle()
    detailTrigger.current = trigger
    void detail.load(spoonacularId)
    setIsDetailOpen(true)
  }

  function openAiRecipe(recipe: RecipeDetail, trigger: HTMLButtonElement) {
    resetFavoriteToggle()
    detailTrigger.current = trigger
    detail.show(recipe)
    setIsDetailOpen(true)
  }

  async function handleSearch(list: string[]) {
    // Each search may get its own AI recipe; an old one (or a running request) is dropped.
    aiRecipe.reset()
    await search(list, maxReadyTime === '' ? null : Number(maxReadyTime))
    // The search may have translated new ingredients, even when it failed later.
    void known.reload()
  }

  function closeDetail() {
    setIsDetailOpen(false)
    // A favorite removed from the modal also left the list, taking its open button along.
    const trigger = detailTrigger.current
    if (trigger?.isConnected) trigger.focus()
    else favoritesHeading.current?.focus()
  }

  function openFavorite(favorite: Favorite, trigger: HTMLButtonElement) {
    if (favorite.recipe !== null) {
      aiFavoriteIds.set(favorite.recipe, favorite.id)
      openAiRecipe(favorite.recipe, trigger)
    } else if (favorite.spoonacular_id !== null) {
      openDetail(favorite.spoonacular_id, trigger)
    }
  }

  function savedFavoriteId(recipe: RecipeDetail): string | null {
    const list = favorites.state.status === 'success' ? favorites.state.favorites : null
    if (recipe.source === 'spoonacular') {
      return list?.find((f) => f.spoonacular_id === recipe.spoonacular_id)?.id ?? null
    }
    const id = aiFavoriteIds.get(recipe)
    if (id === undefined) return null
    // Removed in the list meanwhile.
    return list === null || list.some((f) => f.id === id) ? id : null
  }

  async function toggleFavorite(recipe: RecipeDetail) {
    const savedId = savedFavoriteId(recipe)
    const requestId = ++toggleRequest.current
    setFavoriteToggle({ busy: true, error: null })
    try {
      if (savedId !== null) {
        await favorites.remove(savedId)
        aiFavoriteIds.delete(recipe)
      } else {
        const favorite = await favorites.add(recipe)
        if (recipe.source === 'ai') aiFavoriteIds.set(recipe, favorite.id)
      }
      if (requestId === toggleRequest.current) setFavoriteToggle({ busy: false, error: null })
    } catch (error) {
      if (requestId === toggleRequest.current) {
        const fallback =
          savedId !== null
            ? 'Favorit konnte nicht entfernt werden.'
            : 'Favorit konnte nicht gespeichert werden.'
        setFavoriteToggle({ busy: false, error: favoritesErrorMessage(error, fallback) })
      }
    }
  }

  const openRecipe = detail.state.status === 'success' ? detail.state.recipe : null
  const favoriteCount =
    favorites.state.status === 'success' ? ` (${favorites.state.favorites.length})` : ''

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Rezept-Crawler
          </h1>
          <p className="mt-2 text-stone-600">Was hast du zu Hause? Wir finden passende Rezepte.</p>
        </div>
        <button
          ref={favoritesButton}
          type="button"
          aria-pressed={view === 'favorites'}
          onClick={() => setView((current) => (current === 'favorites' ? 'search' : 'favorites'))}
          className="rounded-xl px-4 py-2 font-medium text-stone-800 ring-1 ring-stone-300 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 aria-pressed:bg-emerald-50 aria-pressed:ring-emerald-300"
        >
          Favoriten{favoriteCount}
        </button>
      </header>

      {view === 'favorites' && (
        <FavoritesList
          state={favorites.state}
          onOpen={openFavorite}
          onRemove={favorites.remove}
          onRetry={() => void favorites.reload()}
          onBack={() => setView('search')}
          headingRef={favoritesHeading}
        />
      )}

      {/* Hidden instead of unmounted, so ingredients, filters, and results survive. */}
      <div hidden={view !== 'search'}>
        <IngredientInput
          ingredients={ingredients}
          onChange={setIngredients}
          maxReadyTime={maxReadyTime}
          onMaxReadyTimeChange={setMaxReadyTime}
          maxMissing={maxMissingText}
          onMaxMissingChange={setMaxMissingText}
          knownIngredients={known.ingredients}
          onSearch={(list) => void handleSearch(list)}
          isSearching={state.status === 'loading'}
        />

        <section className="mt-10" aria-busy={state.status === 'loading'}>
          <p role="status" className="text-stone-600">
            {statusText(state, maxMissing, visibleResults.length)}
          </p>
          {state.status === 'error' && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-200"
            >
              {state.message}
            </p>
          )}
          {state.status === 'success' && state.results.length > 0 && !state.translated && (
            <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
              Übersetzung gerade nicht verfügbar – die Rezepte werden auf Englisch angezeigt.
            </p>
          )}
          {state.status === 'success' && generated === null && (
            <AiOffer
              resultCount={state.results.length}
              goodCount={state.goodCount}
              goodMissingMax={state.goodMissingMax}
              maxMissing={maxMissing}
              visibleCount={visibleResults.length}
              weakResults={weakResults}
              liveUnavailable={state.liveUnavailable}
              state={aiRecipe.state}
              onGenerate={() => void aiRecipe.generate(state.ingredients, state.maxReadyTime)}
            />
          )}
          {state.status === 'success' && (visibleResults.length > 0 || generated !== null) && (
            <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {generated !== null && (
                <li>
                  <AiRecipeCard
                    recipe={generated}
                    onOpen={(trigger) => openAiRecipe(generated, trigger)}
                    buttonRef={aiCardButton}
                  />
                </li>
              )}
              {visibleResults.map((recipe) => (
                <li key={recipe.spoonacular_id}>
                  <RecipeCard
                    recipe={recipe}
                    onOpen={(trigger) => openDetail(recipe.spoonacular_id, trigger)}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <RecipeDetailDialog
        open={isDetailOpen}
        state={detail.state}
        onClose={closeDetail}
        favorite={
          openRecipe === null
            ? null
            : {
                saved: savedFavoriteId(openRecipe) !== null,
                busy: favoriteToggle.busy,
                error: favoriteToggle.error,
                onToggle: () => void toggleFavorite(openRecipe),
              }
        }
      />
    </div>
  )
}

export default App
