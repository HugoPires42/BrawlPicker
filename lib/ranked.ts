import { cubeQuery } from "./cube";
import { getMaps } from "./brawlify";
import type { GameMap } from "./types";

// "Currently ranked" = appeared in cube `powerplay=1` data over the last
// N seasons, with at least MIN_PICKS games played. Tunable below.
const MIN_PICKS = 50_000;
const SEASON_FROM = "2026-03-30"; // align with extract.ts
const TTL_MS = 60 * 60 * 1000;

let cache: { value: GameMap[]; at: number } | null = null;

export async function getRankedMaps(): Promise<GameMap[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;

  const rows = await cubeQuery<{
    "map.mode_dimension": string;
    "map.map_dimension": string;
    "map.picks_measure": string | number;
  }>({
    measures: ["map.picks_measure"],
    dimensions: ["map.mode_dimension", "map.map_dimension"],
    filters: [
      { member: "map.powerplay_dimension", operator: "equals", values: ["1"] },
      {
        member: "map.season_dimension",
        operator: "gte",
        values: [SEASON_FROM],
      },
      {
        member: "map.picks_measure",
        operator: "gte",
        values: [String(MIN_PICKS)],
      },
    ],
    order: { "map.picks_measure": "desc" },
  });

  // Normalize map names for fuzzy comparison — cube uses "Belle's Rock" but
  // Brawlify writes "Belles Rock"; cube has "Out in the Open" but Brawlify
  // has "Out In The Open". Lowercase + strip apostrophes handles both.
  const norm = (s: string) => s.toLowerCase().replace(/['’]/g, "").trim();
  const cubeInfo = new Map<string, { picks: number; cubeName: string }>();
  for (const r of rows) {
    const mapName = String(r["map.map_dimension"]);
    const key = `${r["map.mode_dimension"]}::${norm(mapName)}`;
    cubeInfo.set(key, {
      picks: Number(r["map.picks_measure"]),
      cubeName: mapName,
    });
  }

  const allMaps = await getMaps();
  const matched = allMaps
    .map((m) => {
      const info = cubeInfo.get(`${m.modeCube}::${norm(m.name)}`);
      if (!info) return null;
      return { ...m, cubeName: info.cubeName, _picks: info.picks };
    })
    .filter((m): m is GameMap & { _picks: number } => m != null)
    .sort((a, b) => {
      if (a.modeName !== b.modeName) return a.modeName.localeCompare(b.modeName);
      return b._picks - a._picks;
    })
    .map(({ _picks, ...rest }) => {
      void _picks;
      return rest;
    });

  cache = { value: matched, at: Date.now() };
  return matched;
}
