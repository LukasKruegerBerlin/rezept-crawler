/** Upper bound of the missing ingredients filter field. */
export const MAX_MISSING_LIMIT = 20

/** Field text -> filter value; empty or not a whole number 0-20 means no filter. */
export function parseMaxMissing(text: string): number | null {
  const trimmed = text.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return value <= MAX_MISSING_LIMIT ? value : null
}

/** "ohne fehlende Zutaten" / "mit höchstens 1 fehlenden Zutat" / "mit höchstens 3 fehlenden Zutaten". */
export function missingPhrase(maxMissing: number): string {
  if (maxMissing === 0) return 'ohne fehlende Zutaten'
  return maxMissing === 1
    ? 'mit höchstens 1 fehlenden Zutat'
    : `mit höchstens ${maxMissing} fehlenden Zutaten`
}
