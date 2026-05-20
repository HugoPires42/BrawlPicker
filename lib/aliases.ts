/**
 * Map cube brawler names → canonical (Brawlify / official) names.
 * Brawltime's cube keeps history by literal name, so renamed brawlers
 * appear under both old and new identifiers. We canonicalize at every entry
 * point (extraction + matchup queries + UI lookup) and merge stats by sum.
 *
 * Add a new entry when:
 *   - A brawler shows up in /api/draft-ai results with no portrait
 *   - Sanity checks reveal "cube has X but brawlify has Y"
 */
export const BRAWLER_ALIASES: Record<string, string> = {
  "COLONEL RUFFS": "RUFFS",
  GLOWBERT: "GLOWY",
};

/** Returns the canonical cube name for a given (possibly aliased) name. */
export function canonical(name: string): string {
  return BRAWLER_ALIASES[name] ?? name;
}

/**
 * For each canonical brawler name, returns all cube names that should be
 * queried together (the canonical name itself + any aliases pointing to it).
 */
const reverse: Map<string, string[]> = (() => {
  const m = new Map<string, string[]>();
  for (const [from, to] of Object.entries(BRAWLER_ALIASES)) {
    const list = m.get(to) ?? [to];
    if (!list.includes(from)) list.push(from);
    m.set(to, list);
  }
  return m;
})();

export function expandAliases(canonicalName: string): string[] {
  return reverse.get(canonicalName) ?? [canonicalName];
}
