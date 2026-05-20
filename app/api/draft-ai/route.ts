import { NextResponse } from "next/server";
import { getCountersForEnemy, warmGlobal, warmMap } from "@/lib/matchups";
import { getBansForMap } from "@/lib/bans";
import { getModel, hasModel } from "@/lib/aiModel";
import {
  bucketTrophyMin,
  parseBucket,
  type Bucket,
} from "@/lib/buckets";
import type {
  BanRow,
  CounterRow,
  ScoredCandidate,
} from "@/lib/types";

export const dynamic = "force-dynamic";

type Body = {
  mode: string;
  map: string;
  enemies?: string[];
  allies?: string[];
  bucket?: string;
};

export async function POST(req: Request) {
  const {
    mode,
    map,
    enemies = [],
    allies = [],
    bucket: bucketRaw,
  } = (await req.json()) as Body;
  if (!mode || !map) {
    return NextResponse.json(
      { error: "mode and map required" },
      { status: 400 }
    );
  }

  const bucket: Bucket = parseBucket(bucketRaw);
  const trophyMin = bucketTrophyMin(bucket);

  const enemiesUC = enemies.map((e) => e.toUpperCase()).filter(Boolean);
  const alliesUC = allies.map((e) => e.toUpperCase()).filter(Boolean);
  const excludedSet = new Set<string>([...enemiesUC, ...alliesUC]);

  warmGlobal(trophyMin);
  warmMap(mode, map, trophyMin);

  const enemyCountersTask = Promise.all(
    enemiesUC.map(async (enemy) => {
      const counters = (await getCountersForEnemy(enemy, trophyMin))
        .filter((c) => !excludedSet.has(c.brawler))
        .slice(0, 4);
      return { enemy, counters };
    })
  );

  const bansTask = getBansForMap(mode, map, trophyMin);

  const aiTask = hasModel(bucket)
    .then((ok) =>
      ok
        ? getModel(bucket).then((m) => {
            if (!m.knowsMap(mode, map)) return null;
            return m.scoreCandidates({
              mode,
              map,
              allies: alliesUC.filter((a) => m.knowsBrawler(a)),
              enemies: enemiesUC.filter((e) => m.knowsBrawler(e)),
              excluded: excludedSet,
            });
          })
        : null
    )
    .catch(() => null);

  const [perEnemy, bans, ai] = await Promise.all([
    enemyCountersTask,
    bansTask,
    aiTask,
  ]);

  const N_PER_LIST = 10;
  const N_OVERALL = 15;

  const toRow = (r: NonNullable<typeof ai>[number]): ScoredCandidate => ({
    brawler: r.brawler,
    solo: r.solo,
    synergy: r.synergy,
    matchup: r.matchup,
    score: r.score,
    source: "ml" as const,
  });

  const recommendations: ScoredCandidate[] =
    ai != null ? ai.slice(0, N_OVERALL).map(toRow) : [];

  // Per-axis lists: re-rank ALL candidates by each axis, top N each.
  const topByMap: ScoredCandidate[] =
    ai != null
      ? [...ai]
          .sort((a, b) => b.solo - a.solo)
          .slice(0, N_PER_LIST)
          .map(toRow)
      : [];

  const topBySynergy: ScoredCandidate[] =
    ai != null && alliesUC.length > 0
      ? [...ai]
          .filter((c) => c.synergy != null)
          .sort((a, b) => (b.synergy ?? 0) - (a.synergy ?? 0))
          .slice(0, N_PER_LIST)
          .map(toRow)
      : [];

  const topByCounter: ScoredCandidate[] =
    ai != null && enemiesUC.length > 0
      ? [...ai]
          .filter((c) => c.matchup != null)
          .sort((a, b) => (b.matchup ?? 0) - (a.matchup ?? 0))
          .slice(0, N_PER_LIST)
          .map(toRow)
      : [];

  return NextResponse.json({
    bucket,
    perEnemy: perEnemy as { enemy: string; counters: CounterRow[] }[],
    bans: bans as BanRow[],
    recommendations,
    topByMap,
    topBySynergy,
    topByCounter,
    modelLoaded: ai != null,
  });
}
