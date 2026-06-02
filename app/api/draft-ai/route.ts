import { NextResponse } from "next/server";
import {
  getCountersForEnemy,
  getSynergyForAlly,
  warmGlobal,
  warmMap,
} from "@/lib/matchups";
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

const N_PER_LIST = 10;
const N_OVERALL = 15;

/**
 * Mean WR per candidate across the supplied per-partner lists (cube data).
 * Intersection — a candidate only ranks if it has observed data with EVERY
 * picked partner (same shape as the per-enemy counter cards under each
 * enemy slot, just aggregated across multiple partners).
 */
function aggregatePartnerLists(
  lists: CounterRow[][],
  excluded: Set<string>
): Map<string, { mean: number; picks: number }> {
  const candidateWRs = new Map<string, number[]>();
  const candidatePicks = new Map<string, number>();
  for (const list of lists) {
    const seenInThisList = new Set<string>();
    for (const c of list) {
      if (excluded.has(c.brawler)) continue;
      if (seenInThisList.has(c.brawler)) continue;
      seenInThisList.add(c.brawler);
      const arr = candidateWRs.get(c.brawler) ?? [];
      arr.push(c.winRate);
      candidateWRs.set(c.brawler, arr);
      candidatePicks.set(
        c.brawler,
        (candidatePicks.get(c.brawler) ?? 0) + c.picks
      );
    }
  }
  const out = new Map<string, { mean: number; picks: number }>();
  for (const [b, wrs] of candidateWRs) {
    if (wrs.length !== lists.length) continue; // intersection only
    const mean = wrs.reduce((s, x) => s + x, 0) / wrs.length;
    out.set(b, { mean, picks: candidatePicks.get(b) ?? 0 });
  }
  return out;
}

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

  // Fetch full pairwise lists from cube. perEnemy display reuses the same
  // data, so the per-enemy counter cards under each slot and the "Enemy
  // counters" column are guaranteed to agree.
  const enemyCounterListsTask = Promise.all(
    enemiesUC.map((e) => getCountersForEnemy(e, trophyMin))
  );
  const allySynergyListsTask = Promise.all(
    alliesUC.map((a) => getSynergyForAlly(a, trophyMin))
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

  const [enemyCounterLists, allySynergyLists, bans, ai] = await Promise.all([
    enemyCounterListsTask,
    allySynergyListsTask,
    bansTask,
    aiTask,
  ]);

  // perEnemy: top 4 counters per enemy (filtered excluded)
  const perEnemy = enemiesUC.map((enemy, i) => ({
    enemy,
    counters: enemyCounterLists[i]
      .filter((c) => !excludedSet.has(c.brawler))
      .slice(0, 4),
  }));

  // topByCounter: intersection of per-enemy lists, mean WR
  let topByCounter: ScoredCandidate[] = [];
  if (enemyCounterLists.length > 0) {
    const agg = aggregatePartnerLists(enemyCounterLists, excludedSet);
    topByCounter = [...agg.entries()]
      .map(([brawler, v]): ScoredCandidate => ({
        brawler,
        solo: 0,
        synergy: null,
        matchup: v.mean,
        score: v.mean,
        source: "ml" as const,
      }))
      .sort((a, b) => (b.matchup ?? 0) - (a.matchup ?? 0))
      .slice(0, N_PER_LIST);
  }

  // topBySynergy: intersection of per-ally lists, mean WR
  let topBySynergy: ScoredCandidate[] = [];
  if (allySynergyLists.length > 0) {
    const agg = aggregatePartnerLists(allySynergyLists, excludedSet);
    topBySynergy = [...agg.entries()]
      .map(([brawler, v]): ScoredCandidate => ({
        brawler,
        solo: 0,
        synergy: v.mean,
        matchup: null,
        score: v.mean,
        source: "ml" as const,
      }))
      .sort((a, b) => (b.synergy ?? 0) - (a.synergy ?? 0))
      .slice(0, N_PER_LIST);
  }

  // topByMap: raw WR per brawler on this map (bans data already has this)
  const topByMap: ScoredCandidate[] = bans
    .filter((b) => !excludedSet.has(b.brawler))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, N_PER_LIST)
    .map((b): ScoredCandidate => ({
      brawler: b.brawler,
      solo: b.winRate,
      synergy: null,
      matchup: null,
      score: b.winRate,
      source: "ml" as const,
    }));

  // recommendations (combined IA): the ML model is still the best smoothed
  // ranking — it generalizes beyond observed pairs via embeddings.
  const recommendations: ScoredCandidate[] =
    ai != null
      ? ai.slice(0, N_OVERALL).map((r) => ({
          brawler: r.brawler,
          solo: r.solo,
          synergy: r.synergy,
          matchup: r.matchup,
          score: r.score,
          source: "ml" as const,
        }))
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
