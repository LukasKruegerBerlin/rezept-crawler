import { useCallback, useEffect, useRef, useState } from 'react'
import {
  type Favorite,
  addFavorite,
  favoritesErrorMessage,
  fetchFavorites,
  removeFavorite,
} from '../api/favorites'
import type { RecipeDetail } from '../api/recipes'

export type FavoritesState =
  | { status: 'loading' }
  | { status: 'success'; favorites: Favorite[] }
  | { status: 'error'; message: string }

export function useFavorites() {
  const [state, setState] = useState<FavoritesState>({ status: 'loading' })
  // Only the latest list request may update the state.
  const latestRequest = useRef(0)

  /** Fetches the list; the result is applied only if no newer request started. */
  const fetchList = useCallback(async (): Promise<FavoritesState | null> => {
    const requestId = ++latestRequest.current
    let next: FavoritesState
    try {
      next = { status: 'success', favorites: await fetchFavorites() }
    } catch (error) {
      const message = favoritesErrorMessage(error, 'Die Favoriten konnten nicht geladen werden.')
      next = { status: 'error', message }
    }
    return requestId === latestRequest.current ? next : null
  }, [])

  useEffect(() => {
    // Initial load; the state already starts as loading.
    fetchList().then(
      (next) => {
        if (next !== null) setState(next)
      },
      () => {},
    )
  }, [fetchList])

  const reload = useCallback(async () => {
    setState({ status: 'loading' })
    const next = await fetchList()
    if (next !== null) setState(next)
  }, [fetchList])

  const isLoaded = state.status === 'success'

  /** Saves the recipe; throws FavoritesError on failure. */
  const add = useCallback(
    async (recipe: RecipeDetail): Promise<Favorite> => {
      const favorite = await addFavorite(recipe)
      // A list that is still loading or failed is fetched again instead.
      if (!isLoaded) void reload()
      setState((current) => {
        if (current.status !== 'success') return current
        if (current.favorites.some((f) => f.id === favorite.id)) return current
        return { status: 'success', favorites: [favorite, ...current.favorites] }
      })
      return favorite
    },
    [isLoaded, reload],
  )

  /** Removes the favorite; throws FavoritesError on failure. */
  const remove = useCallback(
    async (id: string): Promise<void> => {
      await removeFavorite(id)
      if (!isLoaded) void reload()
      setState((current) =>
        current.status === 'success'
          ? { status: 'success', favorites: current.favorites.filter((f) => f.id !== id) }
          : current,
      )
    },
    [isLoaded, reload],
  )

  return { state, reload, add, remove }
}
