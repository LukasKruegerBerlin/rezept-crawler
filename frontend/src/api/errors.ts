/** Reads the backend's user-safe German `detail` message, if the body has one. */
export async function readDetail(res: Response): Promise<string | null> {
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
