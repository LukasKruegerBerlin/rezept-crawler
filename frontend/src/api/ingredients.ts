export type KnownIngredientsResponse = {
  /** German ingredients translated before, sorted case-insensitively. */
  ingredients: string[]
}

export async function fetchKnownIngredients(): Promise<string[]> {
  const res = await fetch('/api/ingredients')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { ingredients } = (await res.json()) as KnownIngredientsResponse
  return ingredients
}
