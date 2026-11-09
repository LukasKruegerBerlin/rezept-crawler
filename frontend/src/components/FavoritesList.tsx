import { type Ref, useRef, useState } from 'react'
import { type Favorite, favoritesErrorMessage } from '../api/favorites'
import type { FavoritesState } from '../hooks/useFavorites'

type FavoritesListProps = {
  state: FavoritesState
  onOpen: (favorite: Favorite, trigger: HTMLButtonElement) => void
  onRemove: (id: string) => Promise<void>
  onRetry: () => void
  onBack: () => void
  headingRef: Ref<HTMLHeadingElement>
}

const dateFormat = new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium' })

function FavoritesList({
  state,
  onOpen,
  onRemove,
  onRetry,
  onBack,
  headingRef,
}: FavoritesListProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)
  const openButtons = useRef(new Map<string, HTMLButtonElement>())
  const backButton = useRef<HTMLButtonElement>(null)

  async function handleRemove(id: string, favorites: Favorite[]) {
    setRemovingId(id)
    setRemoveError(null)
    // The removed row disappears, so focus moves to the next row (or the previous one).
    const index = favorites.findIndex((f) => f.id === id)
    const next = favorites[index + 1] ?? favorites[index - 1]
    try {
      await onRemove(id)
      const target = next ? openButtons.current.get(next.id) : null
      ;(target ?? backButton.current)?.focus()
    } catch (error) {
      setRemoveError(favoritesErrorMessage(error, 'Favorit konnte nicht entfernt werden.'))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section aria-busy={state.status === 'loading'}>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="text-2xl font-semibold tracking-tight text-stone-900 outline-none"
        >
          Favoriten
        </h2>
        <button
          ref={backButton}
          type="button"
          onClick={onBack}
          className="rounded-xl px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
        >
          Zurück zur Suche
        </button>
      </div>

      {state.status === 'loading' && (
        <p role="status" className="text-stone-600">
          Favoriten werden geladen…
        </p>
      )}

      {state.status === 'error' && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-200"
        >
          <span>{state.message}</span>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-xl bg-white px-3 py-1.5 text-sm font-medium text-red-800 ring-1 ring-red-300 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
          >
            Erneut versuchen
          </button>
        </div>
      )}

      {state.status === 'success' && (
        <>
          {removeError !== null && (
            <p
              role="alert"
              className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-red-800 ring-1 ring-red-200"
            >
              {removeError}
            </p>
          )}
          {state.favorites.length === 0 ? (
            <p role="status" className="text-stone-600">
              Noch keine Favoriten gespeichert.
            </p>
          ) : (
            <ul className="divide-y divide-stone-200 rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
              {state.favorites.map((favorite) => (
                <li key={favorite.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <button
                      ref={(element) => {
                        if (element) openButtons.current.set(favorite.id, element)
                        else openButtons.current.delete(favorite.id)
                      }}
                      type="button"
                      onClick={(event) => onOpen(favorite, event.currentTarget)}
                      className="text-left font-semibold text-stone-900 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
                    >
                      {favorite.title}
                    </button>
                    <p className="flex items-center gap-2 text-sm text-stone-600">
                      {favorite.source === 'ai' && (
                        <span className="rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-medium text-white">
                          KI-Vorschlag
                        </span>
                      )}
                      <span>Gespeichert am {dateFormat.format(new Date(favorite.saved_at))}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(favorite.id, state.favorites)}
                    disabled={removingId === favorite.id}
                    className="shrink-0 rounded-xl px-3 py-1.5 text-sm font-medium text-stone-700 ring-1 ring-stone-300 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:opacity-50"
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

export default FavoritesList
