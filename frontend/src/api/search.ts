import { readDetail } from './errors'

export type RecipeSummary = {
  source: 'spoonacular'
  spoonacular_id: number
  title: string
  image: string | null
  ready_in_minutes: number | null
  used_ingredients: string[]
  missing_ingredients: string[]
  missing_count: number
}

export type SearchResponse = {
  results: RecipeSummary[]
  /** False when the backend could not translate the results; texts are English. */
  translated: boolean
}

const FALLBACK_MESSAGE = 'Die Suche ist fehlgeschlagen.'

/** Carries the backend's user-safe German `detail` message. */
export class SearchError extends Error {}

/** `maxReadyTime` in minutes; null searches without a time limit. */
export async function searchRecipes(
  ingredients: string[],
  maxReadyTime: number | null,
): Promise<SearchResponse> {
  const body = maxReadyTime === null ? { ingredients } : { ingredients, max_ready_time: maxReadyTime }
  let res: Response
  try {
    res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new SearchError(FALLBACK_MESSAGE)
  }

  if (!res.ok) {
    throw new SearchError((await readDetail(res)) ?? FALLBACK_MESSAGE)
  }
  return (await res.json()) as SearchResponse
}
