import { useCallback, useRef, useState } from 'react'
import { AiRecipeError, generateAiRecipe } from '../api/aiRecipe'
import type { RecipeDetail } from '../api/recipes'

export type AiRecipeState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; recipe: RecipeDetail }
  | { status: 'error'; message: string }

export function useAiRecipe() {
  const [state, setState] = useState<AiRecipeState>({ status: 'idle' })
  // Only the latest request may update the state; reset() also ignores a running one.
  const latestRequest = useRef(0)

  const generate = useCallback(async (ingredients: string[], maxReadyTime: number | null) => {
    const requestId = ++latestRequest.current
    setState({ status: 'loading' })
    try {
      const recipe = await generateAiRecipe(ingredients, maxReadyTime)
      if (requestId === latestRequest.current) {
        setState({ status: 'success', recipe })
      }
    } catch (error) {
      if (requestId === latestRequest.current) {
        const message =
          error instanceof AiRecipeError
            ? error.message
            : 'Der KI-Vorschlag konnte nicht erstellt werden.'
        setState({ status: 'error', message })
      }
    }
  }, [])

  const reset = useCallback(() => {
    ++latestRequest.current
    setState({ status: 'idle' })
  }, [])

  return { state, generate, reset }
}
