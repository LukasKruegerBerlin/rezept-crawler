import { useRef, useState } from 'react'
import IngredientInput from './components/IngredientInput'
import RecipeCard from './components/RecipeCard'
import RecipeDetailDialog from './components/RecipeDetailDialog'
import { useKnownIngredients } from './hooks/useKnownIngredients'
import { useRecipeDetail } from './hooks/useRecipeDetail'
import { type SearchState, useRecipeSearch } from './hooks/useRecipeSearch'

function statusText(state: SearchState): string {
  switch (state.status) {
    case 'idle':
      return 'Gib deine Zutaten ein und starte die Suche.'
    case 'loading':
      return 'Suche Rezepte…'
    case 'success':
      if (state.results.length === 0) {
        return state.maxReadyTime === null
          ? 'Keine passenden Rezepte gefunden.'
          : `Keine passenden Rezepte in höchstens ${state.maxReadyTime} Minuten gefunden.`
      }
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
  const { state, search } = useRecipeSearch()
  const known = useKnownIngredients()
  const detail = useRecipeDetail()
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  // Focus goes back to the card that opened the detail.
  const detailTrigger = useRef<HTMLButtonElement | null>(null)

  function openDetail(spoonacularId: number, trigger: HTMLButtonElement) {
    detailTrigger.current = trigger
    void detail.load(spoonacularId)
    setIsDetailOpen(true)
  }

  async function handleSearch(list: string[]) {
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
        knownIngredients={known.ingredients}
        onSearch={(list) => void handleSearch(list)}
        isSearching={state.status === 'loading'}
      />

      <section className="mt-10" aria-busy={state.status === 'loading'}>
        <p role="status" className="text-stone-600">
          {statusText(state)}
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
        {state.status === 'success' && state.results.length > 0 && (
          <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {state.results.map((recipe) => (
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
