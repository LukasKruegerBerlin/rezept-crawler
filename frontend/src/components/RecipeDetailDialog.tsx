import { type MouseEvent, useEffect, useRef } from 'react'
import type { IngredientLine } from '../api/recipes'
import type { RecipeDetailState } from '../hooks/useRecipeDetail'

type RecipeDetailDialogProps = {
  open: boolean
  state: RecipeDetailState
  onClose: () => void
}

const TITLE_ID = 'recipe-detail-title'
const amountFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 2 })

function ingredientText({ amount, unit, name }: IngredientLine): string {
  return [amount !== null ? amountFormat.format(amount) : '', unit, name]
    .filter((part) => part !== '')
    .join(' ')
}

function RecipeDetailDialog({ open, state, onClose }: RecipeDetailDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

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
        {state.status === 'success' &&
          (state.recipe.image ? (
            <img
              src={state.recipe.image}
              alt={state.recipe.title}
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
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
            >
              Schließen
            </button>
          </div>

          {state.status === 'loading' && (
            <p role="status" className="text-stone-600">
              Rezept wird geladen und übersetzt…
            </p>
          )}

          {state.status === 'error' && (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-200"
            >
              {state.message}
            </p>
          )}

          {state.status === 'success' && (
            <>
              {!state.translated && (
                <p className="rounded-xl bg-amber-50 px-4 py-3 text-amber-900 ring-1 ring-amber-200">
                  Übersetzung gerade nicht verfügbar – das Rezept wird auf Englisch angezeigt.
                </p>
              )}
              {state.recipe.ready_in_minutes !== null && (
                <p className="-mt-3 text-sm text-stone-600">
                  {state.recipe.ready_in_minutes} Min.
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
