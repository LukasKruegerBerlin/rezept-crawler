import { readDetail } from './errors'
import type { RecipeDetail } from './recipes'

const FALLBACK_MESSAGE = 'Der KI-Vorschlag konnte nicht erstellt werden.'

/** Carries the backend's user-safe German `detail` message. */
export class AiRecipeError extends Error {}

/** Same ingredients and time limit as the search the recipe is offered for. */
export async function generateAiRecipe(
  ingredients: string[],
  maxReadyTime: number | null,
): Promise<RecipeDetail> {
  const body = maxReadyTime === null ? { ingredients } : { ingredients, max_ready_time: maxReadyTime }
  let res: Response
  try {
    res = await fetch('/api/ai-recipe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AiRecipeError(FALLBACK_MESSAGE)
  }

  if (!res.ok) {
    throw new AiRecipeError((await readDetail(res)) ?? FALLBACK_MESSAGE)
  }
  return ((await res.json()) as { recipe: RecipeDetail }).recipe
}
