import { cubeQuery, type CubeFilter } from "./cube";
import { canonical } from "./aliases";
import { isRemoved } from "./removed";
import type { BanRow } from "./types";

const MIN_PICKS = 500;
const LIMIT = 15;

export async function getBansForMap(
  mode: string,
  map: string,
  trophyMin: number | null = null
): Promise<BanRow[]> {
  const filters: CubeFilter[] = [
    { member: "map.mode_dimension", operator: "equals", values: [mode] },
    { member: "map.map_dimension", operator: "equals", values: [map] },
    {
      member: "map.picks_measure",
      operator: "gte",
      values: [String(MIN_PICKS)],
    },
  ];
  if (trophyMin != null) {
    filters.push({
      member: "map.trophyRange_dimension",
      operator: "gte",
      values: [String(trophyMin)],
    });
  }

  const rows = await cubeQuery<{
    "map.brawler_dimension": string;
    "map.winRate_measure": string | number;
    "map.picks_measure": string | number;
  }>({
    measures: ["map.winRate_measure", "map.picks_measure"],
    dimensions: ["map.brawler_dimension"],
    filters,
  });

  // Aggregate alias merges (e.g., COLONEL RUFFS → RUFFS)
  const agg = new Map<string, { wr: number; picks: number }>();
  for (const r of rows) {
    const b = canonical(String(r["map.brawler_dimension"]));
    if (isRemoved(b)) continue;
    const wr = Number(r["map.winRate_measure"]);
    const picks = Number(r["map.picks_measure"]);
    const prev = agg.get(b);
    if (!prev) agg.set(b, { wr, picks });
    else {
      const total = prev.picks + picks;
      agg.set(b, {
        wr: (prev.wr * prev.picks + wr * picks) / total,
        picks: total,
      });
    }
  }

  const total = [...agg.values()].reduce((s, v) => s + v.picks, 0);

  return [...agg.entries()]
    .map(([brawler, v]): BanRow => ({
      brawler,
      winRate: v.wr,
      picks: v.picks,
      pickShare: total > 0 ? v.picks / total : 0,
      banScore: Math.max(0, v.wr - 0.5) * Math.sqrt(v.picks),
    }))
    .filter((b) => b.banScore > 0)
    .sort((a, b) => b.banScore - a.banScore)
    .slice(0, LIMIT);
}
