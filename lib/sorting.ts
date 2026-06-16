/**
 * Helper to perform case-insensitive, natural alphanumeric sorting.
 * E.g. "f2" sorts before "f10".
 */
export function compareAlphanumeric(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
