import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchKnownIngredients } from '../api/ingredients'

/** Ingredients for the autocomplete; reload after a search adds new ones. */
export function useKnownIngredients() {
  const [ingredients, setIngredients] = useState<string[]>([])
  // Only the latest request may update the list.
  const latestRequest = useRef(0)

  const reload = useCallback(async () => {
    const requestId = ++latestRequest.current
    try {
      const next = await fetchKnownIngredients()
      if (requestId === latestRequest.current) setIngredients(next)
    } catch {
      // The autocomplete is only an aid: keep the current list, typing still works.
    }
  }, [])

  useEffect(() => {
    // Initial load; failures are ignored like in reload().
    fetchKnownIngredients().then(setIngredients, () => {})
  }, [])

  return { ingredients, reload }
}
