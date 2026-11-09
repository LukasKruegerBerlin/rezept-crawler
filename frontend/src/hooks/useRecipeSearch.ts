import { useCallback, useRef, useState } from 'react'
import { type RecipeSummary, SearchError, searchRecipes } from '../api/search'

export type SearchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'success'
      results: RecipeSummary[]
      translated: boolean
      /** The ingredients and time limit this search used (empty-state text, AI recipe). */
      ingredients: string[]
      maxReadyTime: number | null
      liveUnavailable: boolean
      goodCount: number
      goodMissingMax: number
      weakResults: boolean
      goodResultsMin: number
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
      const response = await searchRecipes(ingredients, maxReadyTime)
      if (requestId === latestRequest.current) {
        setState({
          status: 'success',
          results: response.results,
          translated: response.translated,
          ingredients,
          maxReadyTime,
          liveUnavailable: response.live_unavailable,
          goodCount: response.good_count,
          goodMissingMax: response.good_missing_max,
          weakResults: response.weak_results,
          goodResultsMin: response.good_results_min,
        })
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
