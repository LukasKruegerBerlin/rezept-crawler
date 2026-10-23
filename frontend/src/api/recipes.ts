import { readDetail } from './errors'

export type IngredientLine = {
  name: string
  /** Metric amount; null when the recipe gives none. */
  amount: number | null
  /** Metric short unit, may be empty. */
  unit: string
}

export type RecipeDetail = {
  source: 'spoonacular' | 'ai'
  spoonacular_id: number | null
  title: string
  image: string | null
  ready_in_minutes: number | null
  ingredients: IngredientLine[]
  steps: string[]
}

export type RecipeDetailResponse = {
  recipe: RecipeDetail
  /** False when the backend could not translate the recipe; texts are English. */
  translated: boolean
}

const FALLBACK_MESSAGE = 'Das Rezept konnte nicht geladen werden.'

/** Carries the backend's user-safe German `detail` message. */
export class RecipeDetailError extends Error {}

export async function fetchRecipeDetail(spoonacularId: number): Promise<RecipeDetailResponse> {
  let res: Response
  try {
    res = await fetch(`/api/recipes/${spoonacularId}`)
  } catch {
    throw new RecipeDetailError(FALLBACK_MESSAGE)
  }

  if (!res.ok) {
    throw new RecipeDetailError((await readDetail(res)) ?? FALLBACK_MESSAGE)
  }
  return (await res.json()) as RecipeDetailResponse
}
