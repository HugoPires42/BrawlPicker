import { cubeQuery, type CubeFilter } from "./cube";
import { canonical } from "./aliases";

const MIN_PICKS = 100_000;
const TTL_MS = 30 * 60 * 1000;

type Cache = { value: Map<string, number>; at: number };
const cache = new Map<string, Cache>();
const inflight = new Map<string, Promise<Map<string, number>>>();

function key(trophyMin: number | null): string {
  return trophyMin == null ? "all" : String(trophyMin);
}

/**
 * Returns each brawler's overall WR across all observed matchups
 * (= average win rate in any battle, regardless of opponent / map).
 *
 * Used to compute ΔWR: how much a brawler over- or under-performs
 * against a specific enemy versus their own baseline. ΔWR > 0 means
 * the brawler is a *specific* counter — not just a strong meta pick.
 */
export async function getBaselineWRs(
  trophyMin: number | null = null
): Promise<Map<string, number>> {
  const k = key(trophyMin);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const pending = inflight.get(k);
  if (pending) return pending;

  const trophyFilter: CubeFilter[] =
    trophyMin != null
      ? [
          {
            member: "brawlerEnemies.trophyRange_dimension",
            operator: "gte",
            values: [String(trophyMin)],
          },
        ]
      : [];

  const p = (async () => {
    const rows = await cubeQuery<{
      "brawlerEnemies.brawler_dimension": string;
      "brawlerEnemies.winRate_measure": string | number;
    }>({
      measures: [
        "brawlerEnemies.winRate_measure",
        "brawlerEnemies.picks_measure",
      ],
      dimensions: ["brawlerEnemies.brawler_dimension"],
      filters: [
        {
          member: "brawlerEnemies.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS)],
        },
        ...trophyFilter,
      ],
    });
    const out = new Map<string, number>();
    for (const r of rows) {
      const b = canonical(String(r["brawlerEnemies.brawler_dimension"]));
      const wr = Number(r["brawlerEnemies.winRate_measure"]);
      // canonical may collapse aliases; keep the latest value (small impact)
      out.set(b, wr);
    }
    cache.set(k, { value: out, at: Date.now() });
    return out;
  })().finally(() => inflight.delete(k));

  inflight.set(k, p);
  return p;
}
