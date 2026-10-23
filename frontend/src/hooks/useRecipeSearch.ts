import { useCallback, useRef, useState } from 'react'
import { type RecipeSummary, SearchError, searchRecipes } from '../api/search'

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      results: RecipeSummary[]
      translated: boolean
      /** The time limit this search used, for the empty-state text. */
      maxReadyTime: number | null
    }
  | { status: 'error'; message: string }

export function useRecipeSearch() {
  const [state, setState] = useState<SearchState>({ status: 'idle' })
  // Only the latest request may update the state.
  const latestRequest = useRef(0)

  const search = useCallback(async (ingredients: string[], maxReadyTime: number | null) => {
    const requestId = ++latestRequest.current
    setState({ status: 'loading' })
    try {
      const { results, translated } = await searchRecipes(ingredients, maxReadyTime)
      if (requestId === latestRequest.current) {
        setState({ status: 'success', results, translated, maxReadyTime })
      }
    } catch (error) {
      if (requestId === latestRequest.current) {
        const message =
          error instanceof SearchError ? error.message : 'Die Suche ist fehlgeschlagen.'
        setState({ status: 'error', message })
      }
    }
  }, [])

  return { state, search }
}
