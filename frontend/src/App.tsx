import { useEffect, useRef, useState } from 'react'
import type { RecipeDetail } from './api/recipes'
import AiOffer from './components/AiOffer'
import AiRecipeCard from './components/AiRecipeCard'
import IngredientInput from './components/IngredientInput'
import RecipeCard from './components/RecipeCard'
import RecipeDetailDialog from './components/RecipeDetailDialog'
import { useAiRecipe } from './hooks/useAiRecipe'
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

  useEffect(() => {
    // The offer button disappears with the result, which drops keyboard focus to the
    // page; move it to the new card unless the user has focused something else meanwhile.
    if (generated !== null && document.activeElement === document.body) {
      aiCardButton.current?.focus()
    }
  }, [generated])

  function openDetail(spoonacularId: number, trigger: HTMLButtonElement) {
    detailTrigger.current = trigger
    void detail.load(spoonacularId)
    setIsDetailOpen(true)
  }

  function openAiRecipe(recipe: RecipeDetail, trigger: HTMLButtonElement) {
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
    detailTrigger.current?.focus()
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
          Rezept-Crawler
        </h1>
        <p className="mt-2 text-stone-600">Was hast du zu Hause? Wir finden passende Rezepte.</p>
      </header>

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

      <RecipeDetailDialog open={isDetailOpen} state={detail.state} onClose={closeDetail} />
    </div>
  )
}

export default App
