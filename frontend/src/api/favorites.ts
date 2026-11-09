import { readDetail } from './errors'
import type { RecipeDetail } from './recipes'

export type Favorite = {
  /** Backend-generated, stable id for opening and removing. */
  id: string
  source: 'spoonacular' | 'ai'
  spoonacular_id: number | null
  /** German title (cached German title for Spoonacular favorites when available). */
  title: string
  /** ISO-8601 timestamp (UTC). */
  saved_at: string
  /** Full recipe for AI favorites; null for Spoonacular (opened via /api/recipes). */
  recipe: RecipeDetail | null
}

/** Carries the backend's user-safe German `detail` message. */
export class FavoritesError extends Error {}

export async function fetchFavorites(): Promise<Favorite[]> {
  const fallback = 'Die Favoriten konnten nicht geladen werden.'
  let res: Response
  try {
    res = await fetch('/api/favorites')
  } catch {
    throw new FavoritesError(fallback)
  }
  if (!res.ok) throw new FavoritesError((await readDetail(res)) ?? fallback)
  return ((await res.json()) as { favorites: Favorite[] }).favorites
}

/** Saving a Spoonacular recipe twice returns the existing favorite. */
export async function addFavorite(recipe: RecipeDetail): Promise<Favorite> {
  const fallback = 'Favorit konnte nicht gespeichert werden.'
  let res: Response
  try {
    res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipe }),
    })
  } catch {
    throw new FavoritesError(fallback)
  }
  if (!res.ok) throw new FavoritesError((await readDetail(res)) ?? fallback)
  return ((await res.json()) as { favorite: Favorite }).favorite
}

export async function removeFavorite(id: string): Promise<void> {
  const fallback = 'Favorit konnte nicht entfernt werden.'
  let res: Response
  try {
    res = await fetch(`/api/favorites/${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch {
    throw new FavoritesError(fallback)
  }
  if (!res.ok) throw new FavoritesError((await readDetail(res)) ?? fallback)
}

/** The backend message for known errors, otherwise the given fallback. */
export function favoritesErrorMessage(error: unknown, fallback: string): string {
  return error instanceof FavoritesError ? error.message : fallback
}
