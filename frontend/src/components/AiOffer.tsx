import type { AiRecipeState } from '../hooks/useAiRecipe'
import { missingPhrase } from '../missingFilter'
import Spinner from './Spinner'

type AiOfferProps = {
  /** Total Spoonacular results of the search. */
  resultCount: number
  goodCount: number
  goodMissingMax: number
  /** Missing ingredients filter; null when not set. */
  maxMissing: number | null
  /** Results left after the missing ingredients filter. */
  visibleCount: number
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
  maxMissing,
  visibleCount,
  liveUnavailable,
}: Omit<AiOfferProps, 'weakResults' | 'state' | 'onGenerate'>): string {
  // The status line above already says that nothing was found or shown, so only ask.
  if (liveUnavailable || resultCount === 0) return QUESTION
  if (maxMissing !== null) {
    if (visibleCount === 0) return QUESTION
    const shown = visibleCount === 1 ? '1 Rezept' : `${visibleCount} Rezepte`
    return `${shown} ${missingPhrase(maxMissing)} gefunden. ${QUESTION}`
  }
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
        onClick={() => {
          if (!isLoading) onGenerate()
        }}
        // aria-disabled instead of disabled keeps keyboard focus on the button.
        aria-disabled={isLoading}
        className={`shrink-0 rounded-xl px-4 py-2 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 ${
          weakResults
            ? 'bg-emerald-700 text-white hover:bg-emerald-800'
            : 'text-emerald-800 ring-1 ring-emerald-700 hover:bg-emerald-50'
        }`}
      >
        KI-Rezept erstellen
      </button>
      {isLoading && (
        <p role="status" className="flex basis-full items-center gap-2 text-sm">
          <Spinner />
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
