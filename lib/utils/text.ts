/**
 * Text utilities used across scoring, ingestion, and templating.
 */

/**
 * Lowercase, strip accents and non-word characters, collapse spaces to
 * single hyphens. Used as the canonical key for de-duplicating trends.
 *
 * @example
 *   normalizeKeyword("Mélatonine 1.9mg") -> "melatonine-1-9mg"
 */
export function normalizeKeyword(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Truncate to `n` chars with a trailing ellipsis when needed. */
export function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

/** HTML-escape a string. */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Capitalize the first character. */
export function capitalize(s: string): string {
  if (s.length === 0) return s;
  return s[0]!.toUpperCase() + s.slice(1);
}
