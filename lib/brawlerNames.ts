import type { Locale } from "./i18n";
import type { Brawler } from "./types";

/**
 * Brawl Stars uses universal proper nouns for brawlers across all
 * supported languages (Damian, Edgar, El Primo, …). Brawlify confirms
 * this — fetching with `?lang=fr` returns identical English-style names.
 *
 * If you ever find a brawler whose French name actually differs, drop
 * a key/value here. Key uses the cube UPPERCASE name; value is the
 * French display name.
 *
 * Example:
 *   "PEARL": "Perle",
 */
export const FRENCH_BRAWLER_OVERRIDES: Record<string, string> = {};

/** Title-case a cube name as a last-resort display string. */
function prettifyCube(cubeName: string): string {
  return cubeName
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

/**
 * Single source of truth for displaying a brawler's name anywhere in
 * the UI. Priority:
 *   1. Locale-specific override (FRENCH_BRAWLER_OVERRIDES for fr)
 *   2. Brawlify display name (already proper case, e.g. "Mr. P")
 *   3. Cube name title-cased ("DAMIAN" → "Damian")
 */
export function displayBrawlerName(
  brawler: Brawler | undefined,
  cubeName: string,
  locale: Locale
): string {
  const key = (brawler?.cubeName ?? cubeName).toUpperCase();
  if (locale === "fr") {
    const override = FRENCH_BRAWLER_OVERRIDES[key];
    if (override) return override;
  }
  if (brawler) return brawler.name;
  return prettifyCube(cubeName);
}
