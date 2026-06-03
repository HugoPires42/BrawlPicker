import type { Brawler } from "./types";

const NEEDED_ROLE_BONUS = 0.04;
const OVERFILLED_PENALTY = -0.02;

/**
 * Given the list of already-picked allies, compute per-class bonus to apply
 * to candidates. Encourages picking complementary roles instead of stacking
 * 3 tanks.
 */
export function buildClassBalance(
  allyCubeNames: string[],
  brawlers: Brawler[]
): Map<string, number> {
  const byCube = new Map(brawlers.map((b) => [b.cubeName, b]));
  const classCounts = new Map<string, number>();
  for (const a of allyCubeNames) {
    const cls = byCube.get(a)?.className;
    if (!cls) continue;
    classCounts.set(cls, (classCounts.get(cls) ?? 0) + 1);
  }

  const bonusByClass = new Map<string, number>();
  for (const [cls, count] of classCounts) {
    if (count >= 2) bonusByClass.set(cls, OVERFILLED_PENALTY);
  }
  // Soft boost to classes that don't appear yet (applied per-candidate later).
  // We store the bonus values; the "missing class" boost is the default.
  return bonusByClass;
}

/**
 * Score adjustment to apply to a candidate based on their class and the
 * current ally composition. Positive when the candidate fills a missing
 * role, negative when they duplicate an over-represented one.
 */
export function classBalanceBonus(
  candidateClass: string | undefined,
  bonusByClass: Map<string, number>,
  picksCount: number
): { bonus: number; missingRole: boolean } {
  // No allies picked yet → no class signal to leverage.
  if (picksCount === 0) return { bonus: 0, missingRole: false };
  if (!candidateClass) return { bonus: 0, missingRole: false };

  // Class is over-represented in the team → small penalty.
  const explicit = bonusByClass.get(candidateClass);
  if (explicit != null) return { bonus: explicit, missingRole: false };

  // Class doesn't appear in the team at all → boost (fills a missing role).
  return { bonus: NEEDED_ROLE_BONUS, missingRole: true };
}
