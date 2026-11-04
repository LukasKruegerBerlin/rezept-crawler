import type { AiRecipeState } from '../hooks/useAiRecipe'

type AiOfferProps = {
  /** Total Spoonacular results of the search. */
  resultCount: number
  goodCount: number
  goodMissingMax: number
  weakResults: boolean
  liveUnavailable: boolean
  state: AiRecipeState
  onGenerate: () => void
}

const QUESTION = 'Soll die KI ein Rezept aus deinen Zutaten erstellen?'

function offerText({
  resultCount,
  goodCount,
  goodMissingMax,
  liveUnavailable,
}: Pick<AiOfferProps, 'resultCount' | 'goodCount' | 'goodMissingMax' | 'liveUnavailable'>): string {
  // The status line above already says that nothing was found, so only ask.
  if (liveUnavailable || resultCount === 0) return QUESTION
  const found = resultCount === 1 ? '1 Rezept gefunden' : `${resultCount} Rezepte gefunden`
  return `${found}, davon ${goodCount} mit höchstens ${goodMissingMax} fehlenden Zutaten. ${QUESTION}`
}

/** Asks before generating the AI recipe; highlighted when the results are weak. */
function AiOffer({ weakResults, state, onGenerate, ...counts }: AiOfferProps) {
  const isLoading = state.status === 'loading'

  return (
    <div
      className={
        weakResults
          ? 'mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200'
          : 'mt-4 flex flex-wrap items-center gap-3 text-stone-600'
      }
    >
      <p>{weakResults ? offerText(counts) : 'Nichts Passendes dabei?'}</p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={isLoading}
        className={`shrink-0 rounded-xl px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600 ${
          weakResults
            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
            : 'text-emerald-800 ring-1 ring-emerald-700 hover:bg-emerald-50'
        }`}
      >
        KI-Rezept erstellen
      </button>
      {isLoading && (
        <p role="status" className="basis-full text-sm">
          KI-Rezept wird erstellt… das kann bis zu einer Minute dauern.
        </p>
      )}
      {state.status === 'error' && (
        <p
          role="alert"
          className="basis-full rounded-xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-200"
        >
          {state.message}
        </p>
      )}
    </div>
  )
}

export default AiOffer
