import { NextResponse } from "next/server";
import { cubeQuery } from "@/lib/cube";
import { getCountersForEnemy, warmGlobal, warmMap } from "@/lib/matchups";
import type { DraftPick, DraftResponse } from "@/lib/types";

const MIN_PICKS_MAP = 200;

export async function POST(req: Request) {
  const {
    mode,
    map,
    enemies = [],
    excluded = [],
  } = (await req.json()) as {
    mode?: string;
    map?: string;
    enemies?: string[];
    excluded?: string[];
  };

  const enemiesUC = enemies.map((e) => e.toUpperCase());
  const excludedSet = new Set(excluded.map((e) => e.toUpperCase()));

  warmGlobal();
  if (mode && map) warmMap(mode, map);

  const enemyCountersTask = Promise.all(
    enemiesUC.map(async (enemy) => {
      const counters = (await getCountersForEnemy(enemy)).filter(
        (c) => !excludedSet.has(c.brawler)
      );
      return { enemy, counters };
    })
  );

  const mapStatsTask: Promise<Map<string, { wr: number; picks: number }>> =
    mode && map
      ? cubeQuery<{
          "map.brawler_dimension": string;
          "map.winRate_measure": string | number;
          "map.picks_measure": string | number;
        }>({
          measures: ["map.winRate_measure", "map.picks_measure"],
          dimensions: ["map.brawler_dimension"],
          filters: [
            { member: "map.mode_dimension", operator: "equals", values: [mode] },
            { member: "map.map_dimension", operator: "equals", values: [map] },
            {
              member: "map.picks_measure",
              operator: "gte",
              values: [String(MIN_PICKS_MAP)],
            },
          ],
          order: { "map.winRate_measure": "desc" },
        }).then((rows) => {
          const m = new Map<string, { wr: number; picks: number }>();
          for (const r of rows) {
            const b = String(r["map.brawler_dimension"]);
            if (!b || excludedSet.has(b)) continue;
            m.set(b, {
              wr: Number(r["map.winRate_measure"]),
              picks: Number(r["map.picks_measure"]),
            });
          }
          return m;
        })
      : Promise.resolve(new Map());

  const [perEnemy, mapStats] = await Promise.all([
    enemyCountersTask,
    mapStatsTask,
  ]);

  const enemyMaps = perEnemy.map(
    (e) => new Map(e.counters.map((c) => [c.brawler, c.winRate]))
  );

  const candidateSet = new Set<string>();
  if (mapStats.size > 0) {
    for (const b of mapStats.keys()) candidateSet.add(b);
  } else if (enemyMaps.length > 0) {
    for (const b of enemyMaps[0].keys()) candidateSet.add(b);
    for (let i = 1; i < enemyMaps.length; i++) {
      for (const b of [...candidateSet]) if (!enemyMaps[i].has(b)) candidateSet.delete(b);
    }
  }
  for (const b of excludedSet) candidateSet.delete(b);

  const overall: DraftPick[] = [...candidateSet]
    .map((b) => {
      const ms = mapStats.get(b);
      const vsVals: number[] = [];
      for (const m of enemyMaps) {
        const v = m.get(b);
        if (v != null) vsVals.push(v);
      }
      const avgVs =
        vsVals.length === enemyMaps.length && vsVals.length > 0
          ? vsVals.reduce((a, c) => a + c, 0) / vsVals.length
          : null;

      let score: number;
      if (ms && avgVs != null) score = 0.5 * ms.wr + 0.5 * avgVs;
      else if (ms) score = ms.wr;
      else if (avgVs != null) score = avgVs;
      else score = 0;

      return {
        brawler: b,
        winRateOnMap: ms?.wr ?? null,
        picksOnMap: ms?.picks ?? null,
        avgWinRateVsEnemies: avgVs,
        combinedScore: score,
      };
    })
    .filter((p) => p.combinedScore > 0)
    .sort((a, b) => b.combinedScore - a.combinedScore)
    .slice(0, 30);

  const trimmedPerEnemy = perEnemy.map((e) => ({
    enemy: e.enemy,
    counters: e.counters.slice(0, 8),
  }));

  const body: DraftResponse = { perEnemy: trimmedPerEnemy, overall };
  return NextResponse.json(body);
}
