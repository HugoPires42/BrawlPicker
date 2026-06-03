/**
 * Brawlers that Supercell removed from the live game but that still appear
 * in the brawltime cube's historical data. We filter them out at every entry
 * point so the UI never surfaces a brawler the user can't actually pick.
 *
 * Add to this set when a brawler is officially removed. Names use the cube's
 * UPPERCASE convention (with spaces and punctuation preserved).
 */
export const REMOVED_BRAWLERS = new Set<string>([
  "BUZZ LIGHTYEAR",
]);

export function isRemoved(cubeName: string): boolean {
  return REMOVED_BRAWLERS.has(cubeName.toUpperCase());
}
