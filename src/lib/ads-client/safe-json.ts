/**
 * Read fetch Response body as JSON without throwing on empty or invalid bodies.
 * Use after checking res.ok for error messages when the server returns JSON errors.
 */
export async function parseResponseJson<T>(res: Response, fallback: T): Promise<T> {
  const text = await res.text();
  const trimmed = text.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

/** Server routes: read JSON body; returns null if empty or not valid JSON. */
export async function readRequestJson<T>(req: Request): Promise<T | null> {
  const text = await req.text();
  const trimmed = text.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return null;
  }
}
