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

async function readDetail(res: Response): Promise<string | null> {
  try {
    const body: unknown = await res.json()
    if (typeof body === 'object' && body !== null && 'detail' in body) {
      // FastAPI validation errors put a list here; only plain messages are shown.
      return typeof body.detail === 'string' ? body.detail : null
    }
  } catch {
    // Non-JSON error body: fall back to the generic message.
  }
  return null
}

export async function searchRecipes(ingredients: string[]): Promise<SearchResponse> {
  let res: Response
  try {
    res = await fetch('/api/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ingredients }),
    })
  } catch {
    throw new SearchError(FALLBACK_MESSAGE)
  }

  if (!res.ok) {
    throw new SearchError((await readDetail(res)) ?? FALLBACK_MESSAGE)
  }
  return (await res.json()) as SearchResponse
}
