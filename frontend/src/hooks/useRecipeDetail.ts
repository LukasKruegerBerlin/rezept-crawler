import { useCallback, useRef, useState } from 'react'
import { type RecipeDetail, RecipeDetailError, fetchRecipeDetail } from '../api/recipes'

export type RecipeDetailState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; recipe: RecipeDetail; translated: boolean }
  | { status: 'error'; message: string }

export function useRecipeDetail() {
  const [state, setState] = useState<RecipeDetailState>({ status: 'idle' })
  // Only the latest request may update the state.
  const latestRequest = useRef(0)

  const load = useCallback(async (spoonacularId: number) => {
    const requestId = ++latestRequest.current
    setState({ status: 'loading' })
    try {
      const { recipe, translated } = await fetchRecipeDetail(spoonacularId)
      if (requestId === latestRequest.current) {
        setState({ status: 'success', recipe, translated })
      }
    } catch (error) {
      if (requestId === latestRequest.current) {
        const message =
          error instanceof RecipeDetailError
            ? error.message
            : 'Das Rezept konnte nicht geladen werden.'
        setState({ status: 'error', message })
      }
    }
  }, [])

  return { state, load }
}
