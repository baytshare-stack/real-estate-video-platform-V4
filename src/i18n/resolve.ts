import type { Dictionary } from "./config";

/**
 * Read a nested string from a dictionary using dot notation (e.g. "upload.types.APARTMENT").
 */
export function getFromDict(dict: Dictionary | undefined, path: string): string | undefined {
  if (!dict || !path) return undefined;
  const parts = path.split(".").filter(Boolean);
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur !== null && typeof cur === "object" && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return undefined;
    }
  }
  return typeof cur === "string" ? cur : undefined;
}

export function translateWithFallback(
  primary: Dictionary,
  fallback: Dictionary,
  path: string
): string {
  return (
    getFromDict(primary, path) ??
    getFromDict(fallback, path) ??
    path
  );
}
