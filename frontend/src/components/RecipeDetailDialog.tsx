import { type MouseEvent, useEffect, useRef, useState } from 'react'
import type { IngredientLine } from '../api/recipes'
import type { RecipeDetailState } from '../hooks/useRecipeDetail'
import Spinner from './Spinner'

export type FavoriteToggle = {
  saved: boolean
  busy: boolean
  error: string | null
  onToggle: () => void
}

type RecipeDetailDialogProps = {
  open: boolean
  state: RecipeDetailState
  onClose: () => void
  /** Shown only for a loaded recipe. */
  favorite: FavoriteToggle | null
  /** Reloads the recipe after an error; omitted when there is nothing to reload. */
  onRetry?: () => void
}

const TITLE_ID = 'recipe-detail-title'
const amountFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

function ingredientText({ amount, unit, name }: IngredientLine): string {
  return [amount !== null ? amountFormat.format(amount) : '', unit, name]
    .filter((part) => part !== '')
    .join(' ')
}

function RecipeDetailDialog({ open, state, onClose, favorite, onRetry }: RecipeDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  // A photo that failed to load falls back to the placeholder; another recipe's URL shows again.
  const [failedImage, setFailedImage] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    // The content wrapper fills the dialog, so only backdrop clicks hit the dialog itself.
    if (event.target === event.currentTarget) dialogRef.current?.close()
  }

  const title = state.status === 'success' ? state.recipe.title : 'Rezept'

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={TITLE_ID}
      onClose={onClose}
      onClick={handleClick}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-white p-0 text-stone-800 shadow-xl backdrop:bg-stone-900/50"
    >
      <div aria-busy={state.status === 'loading'}>
        {/* AI recipes never have a photo, so they get no image area at all. */}
        {state.status === 'success' &&
          state.recipe.source !== 'ai' &&
          (state.recipe.image && state.recipe.image !== failedImage ? (
            <img
              src={state.recipe.image}
              alt={state.recipe.title}
              onError={(event) => setFailedImage(event.currentTarget.getAttribute('src'))}
              className="aspect-[16/9] w-full object-cover"
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-stone-100" aria-hidden="true" />
          ))}

        <div className="flex flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={TITLE_ID} className="text-2xl font-semibold tracking-tight text-stone-900">
              {title}
            </h2>
            <div className="flex shrink-0 flex-wrap justify-end gap-2">
              {state.status === 'success' && favorite !== null && (
                <button
                  type="button"
                  aria-pressed={favorite.saved}
                  // aria-disabled instead of disabled keeps keyboard focus on the button.
                  aria-disabled={favorite.busy}
                  onClick={() => {
                    if (!favorite.busy) favorite.onToggle()
                  }}
                  className="rounded-xl px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-pressed:bg-emerald-50 aria-pressed:text-emerald-900 aria-pressed:ring-emerald-300"
                >
                  {favorite.saved ? 'Gespeichert – entfernen' : 'Als Favorit speichern'}
                </button>
              )}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
              >
                Schließen
              </button>
            </div>
          </div>

          {state.status === 'success' && favorite?.error && (
            <p
              role="alert"
              className="-mt-3 rounded-xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-200"
            >
              {favorite.error}
            </p>
          )}

          {state.status === 'loading' && (
            <>
              <p role="status" className="flex items-center gap-2 text-stone-600">
                <Spinner />
                Rezept wird geladen und übersetzt…
              </p>
              <div className="flex animate-pulse flex-col gap-3" aria-hidden="true">
                <div className="h-5 w-1/3 rounded bg-stone-200" />
                <div className="h-4 w-2/3 rounded bg-stone-100" />
                <div className="h-4 w-1/2 rounded bg-stone-100" />
                <div className="mt-3 h-5 w-1/3 rounded bg-stone-200" />
                <div className="h-4 w-full rounded bg-stone-100" />
                <div className="h-4 w-5/6 rounded bg-stone-100" />
              </div>
            </>
          )}

          {state.status === 'error' && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-200"
            >
              <span>{state.message}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-red-800 ring-1 ring-red-300 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
                >
                  Erneut versuchen
                </button>
              )}
            </div>
          )}

          {state.status === 'success' && (
            <>
              {!state.translated && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
                  Übersetzung gerade nicht verfügbar – das Rezept wird auf Englisch angezeigt.
                </p>
              )}
              {state.recipe.ready_in_minutes !== null && (
                <p className="-mt-3 flex items-center gap-3 text-sm text-stone-600">
                  <span>{state.recipe.ready_in_minutes} Min.</span>
                  {/* AI recipes always have a time, so the label always shows. */}
                  {state.recipe.source === 'ai' && (
                    <span className="rounded-full bg-emerald-700 px-2.5 py-0.5 font-medium text-white">
                      KI-Vorschlag
                    </span>
                  )}
                </p>
              )}

              <section>
                <h3 className="mb-2 text-lg font-semibold text-stone-900">Zutaten</h3>
                <ul className="list-disc space-y-1 pl-5 text-stone-700">
                  {state.recipe.ingredients.map((ingredient, index) => (
                    <li key={index}>{ingredientText(ingredient)}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="mb-2 text-lg font-semibold text-stone-900">Zubereitung</h3>
                {state.recipe.steps.length > 0 ? (
                  <ol className="list-decimal space-y-2 pl-5 text-stone-700">
                    {state.recipe.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-stone-600">
                    Für dieses Rezept sind keine Zubereitungsschritte verfügbar.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </dialog>
  )
}

export default RecipeDetailDialog
