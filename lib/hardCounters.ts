/**
 * Curated kit-level counter relationships.
 *
 * These are interactions that the ΔWR data captures *poorly* because:
 *  - One brawler's gimmick (super or gadget) trivially disables another
 *    even though they have few direct matchups in the data.
 *  - Mobility tools that the cube treats as "just another match" but that
 *    map-savvy players know flip a matchup.
 *
 * Rules are intentionally conservative (bonus 0.02 to 0.06 — small enough
 * to *break ties* without rewriting the ranking the cube produces).
 *
 * Maintenance: review every couple of months or after Supercell rebalances.
 */
export type HardCounter = {
  /** Brawler that gains the bonus (cube name, uppercase). */
  counter: string;
  /** Brawler being countered (cube name, uppercase). */
  vs: string;
  /** Score bonus, expressed as a WR delta (e.g. 0.05 = +5 pp). */
  bonus: number;
  /** Localised i18n key for the reason badge (lib/i18n.ts). */
  reasonKey: string;
};

export const HARD_COUNTERS: HardCounter[] = [
  // Dive assassins vs immobile snipers / throwers
  { counter: "EDGAR",   vs: "PIPER",    bonus: 0.05, reasonKey: "diveSniper" },
  { counter: "EDGAR",   vs: "BROCK",    bonus: 0.04, reasonKey: "diveSniper" },
  { counter: "EDGAR",   vs: "MANDY",    bonus: 0.04, reasonKey: "diveSniper" },
  { counter: "EDGAR",   vs: "DYNAMIKE", bonus: 0.05, reasonKey: "diveThrower" },
  { counter: "EDGAR",   vs: "TICK",     bonus: 0.05, reasonKey: "diveThrower" },
  { counter: "EDGAR",   vs: "BARLEY",   bonus: 0.04, reasonKey: "diveThrower" },
  { counter: "MORTIS",  vs: "PIPER",    bonus: 0.05, reasonKey: "diveSniper" },
  { counter: "MORTIS",  vs: "BROCK",    bonus: 0.04, reasonKey: "diveSniper" },
  { counter: "MORTIS",  vs: "MANDY",    bonus: 0.04, reasonKey: "diveSniper" },
  { counter: "MORTIS",  vs: "TICK",     bonus: 0.05, reasonKey: "diveThrower" },
  { counter: "MORTIS",  vs: "DYNAMIKE", bonus: 0.04, reasonKey: "diveThrower" },
  { counter: "STU",     vs: "PIPER",    bonus: 0.04, reasonKey: "diveSniper" },
  { counter: "KENJI",   vs: "PIPER",    bonus: 0.04, reasonKey: "diveSniper" },
  { counter: "MELODIE", vs: "PIPER",    bonus: 0.04, reasonKey: "diveSniper" },

  // Tank melters vs tanks
  { counter: "COLETTE", vs: "FRANK",    bonus: 0.05, reasonKey: "tankMelter" },
  { counter: "COLETTE", vs: "EL PRIMO", bonus: 0.04, reasonKey: "tankMelter" },
  { counter: "COLETTE", vs: "ROSA",     bonus: 0.04, reasonKey: "tankMelter" },
  { counter: "COLETTE", vs: "BULL",     bonus: 0.04, reasonKey: "tankMelter" },
  { counter: "BIBI",    vs: "FRANK",    bonus: 0.04, reasonKey: "tankMelter" },
  { counter: "BIBI",    vs: "EL PRIMO", bonus: 0.04, reasonKey: "tankMelter" },

  // Anti-assassins (tanks / shotguns)
  { counter: "SHELLY",  vs: "EDGAR",    bonus: 0.04, reasonKey: "antiAssassin" },
  { counter: "SHELLY",  vs: "MORTIS",   bonus: 0.04, reasonKey: "antiAssassin" },
  { counter: "BULL",    vs: "EDGAR",    bonus: 0.04, reasonKey: "antiAssassin" },
  { counter: "BULL",    vs: "MORTIS",   bonus: 0.04, reasonKey: "antiAssassin" },
  { counter: "ROSA",    vs: "EDGAR",    bonus: 0.04, reasonKey: "antiAssassin" },
  { counter: "ROSA",    vs: "MORTIS",   bonus: 0.04, reasonKey: "antiAssassin" },

  // Wall breakers vs throwers
  { counter: "BULL",    vs: "DYNAMIKE", bonus: 0.04, reasonKey: "wallBreak" },
  { counter: "BULL",    vs: "BARLEY",   bonus: 0.04, reasonKey: "wallBreak" },
  { counter: "BULL",    vs: "TICK",     bonus: 0.03, reasonKey: "wallBreak" },
  { counter: "JACKY",   vs: "DYNAMIKE", bonus: 0.04, reasonKey: "wallBreak" },
  { counter: "JACKY",   vs: "BARLEY",   bonus: 0.04, reasonKey: "wallBreak" },

  // Long-range vs slow tanks
  { counter: "PIPER",   vs: "FRANK",    bonus: 0.04, reasonKey: "kiteTank" },
  { counter: "PIPER",   vs: "EL PRIMO", bonus: 0.03, reasonKey: "kiteTank" },
  { counter: "BROCK",   vs: "EL PRIMO", bonus: 0.03, reasonKey: "kiteTank" },
  { counter: "MANDY",   vs: "FRANK",    bonus: 0.04, reasonKey: "kiteTank" },

  // Crowd control / disrupt
  { counter: "SANDY",   vs: "BROCK",    bonus: 0.03, reasonKey: "ccSniper" },
  { counter: "SANDY",   vs: "PIPER",    bonus: 0.03, reasonKey: "ccSniper" },
  { counter: "GENE",    vs: "EDGAR",    bonus: 0.03, reasonKey: "ccAssassin" },
];

/** Build a fast lookup keyed by `${counter}::${vs}`. */
const INDEX = (() => {
  const m = new Map<string, HardCounter>();
  for (const rule of HARD_COUNTERS) {
    m.set(`${rule.counter.toUpperCase()}::${rule.vs.toUpperCase()}`, rule);
  }
  return m;
})();

/** Look up a hard counter rule (returns undefined if no rule applies). */
export function getHardCounter(
  counter: string,
  enemy: string
): HardCounter | undefined {
  return INDEX.get(`${counter.toUpperCase()}::${enemy.toUpperCase()}`);
}
