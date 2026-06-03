import { NextResponse } from "next/server";
import {
  getCountersForEnemy,
  getSynergyForAlly,
  warmGlobal,
  warmMap,
} from "@/lib/matchups";
import { getBansForMap } from "@/lib/bans";
import { getBaselineWRs } from "@/lib/baseline";
import { getBrawlers } from "@/lib/brawlify";
import { getHardCounter } from "@/lib/hardCounters";
import { buildClassBalance, classBalanceBonus } from "@/lib/roleBalance";
import { getModel, hasModel } from "@/lib/aiModel";
import {
  bucketTrophyMin,
  parseBucket,
  type Bucket,
} from "@/lib/buckets";
import type {
  Badge,
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
const META_THRESHOLD = 0.65; // baseline WR considered "meta tier"
const TOP_MAP_THRESHOLD = 0.6; // raw WR considered "top map"

/**
 * For each candidate, mean WR (raw) and mean ΔWR (vs baseline) across the
 * supplied per-partner lists. Intersection — a candidate only ranks if it
 * has data with EVERY picked partner.
 */
function aggregatePartnerLists(
  lists: CounterRow[][],
  excluded: Set<string>,
  baseline: Map<string, number>
): Map<string, { mean: number; delta: number; picks: number; perPartner: number[]; perPartnerDelta: number[] }> {
  const candidateWRs = new Map<string, number[]>();
  const candidatePicks = new Map<string, number>();
  for (const list of lists) {
    const seen = new Set<string>();
    for (const c of list) {
      if (excluded.has(c.brawler)) continue;
      if (seen.has(c.brawler)) continue;
      seen.add(c.brawler);
      const arr = candidateWRs.get(c.brawler) ?? [];
      arr.push(c.winRate);
      candidateWRs.set(c.brawler, arr);
      candidatePicks.set(
        c.brawler,
        (candidatePicks.get(c.brawler) ?? 0) + c.picks
      );
    }
  }
  const out = new Map<
    string,
    {
      mean: number;
      delta: number;
      picks: number;
      perPartner: number[];
      perPartnerDelta: number[];
    }
  >();
  for (const [b, wrs] of candidateWRs) {
    if (wrs.length !== lists.length) continue;
    const mean = wrs.reduce((s, x) => s + x, 0) / wrs.length;
    const base = baseline.get(b);
    const perPartnerDelta = base != null ? wrs.map((w) => w - base) : [];
    const delta =
      perPartnerDelta.length > 0
        ? perPartnerDelta.reduce((s, x) => s + x, 0) / perPartnerDelta.length
        : 0;
    out.set(b, {
      mean,
      delta,
      picks: candidatePicks.get(b) ?? 0,
      perPartner: wrs,
      perPartnerDelta,
    });
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

  const enemyCounterListsTask = Promise.all(
    enemiesUC.map((e) => getCountersForEnemy(e, trophyMin))
  );
  const allySynergyListsTask = Promise.all(
    alliesUC.map((a) => getSynergyForAlly(a, trophyMin))
  );

  const bansTask = getBansForMap(mode, map, trophyMin);
  const baselineTask = getBaselineWRs(trophyMin);
  const brawlersTask = getBrawlers();

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

  const [
    enemyCounterLists,
    allySynergyLists,
    bans,
    baseline,
    brawlers,
    ai,
  ] = await Promise.all([
    enemyCounterListsTask,
    allySynergyListsTask,
    bansTask,
    baselineTask,
    brawlersTask,
    aiTask,
  ]);

  const classByCube = new Map(
    brawlers.map((b) => [b.cubeName, b.className])
  );
  const allyClassBonusByClass = buildClassBalance(alliesUC, brawlers);

  // perEnemy: top 4 raw counters per enemy
  const perEnemy = enemiesUC.map((enemy, i) => ({
    enemy,
    counters: enemyCounterLists[i]
      .filter((c) => !excludedSet.has(c.brawler))
      .slice(0, 4),
  }));

  // Counter aggregates (raw + delta)
  const counterAgg = aggregatePartnerLists(
    enemyCounterLists,
    excludedSet,
    baseline
  );

  const topByCounter: ScoredCandidate[] = [...counterAgg.entries()]
    .map(([brawler, v]) => ({
      brawler,
      solo: 0,
      synergy: null,
      matchup: v.mean,
      delta: v.delta,
      score: v.mean,
      source: "ml" as const,
      badges: buildBadges({
        kind: "counter",
        brawler,
        delta: v.delta,
        perPartnerDelta: v.perPartnerDelta,
        partners: enemiesUC,
        baseline,
        classByCube,
        allyClassBonusByClass,
        alliesUC,
      }),
    }))
    .sort((a, b) => (b.matchup ?? 0) - (a.matchup ?? 0))
    .slice(0, N_PER_LIST);

  // Apply hard counter bonuses + sort by ΔWR for the delta variant.
  const topByCounterDelta: ScoredCandidate[] = [...counterAgg.entries()]
    .map(([brawler, v]) => {
      let hardBonus = 0;
      const hardReasons: string[] = [];
      for (const enemy of enemiesUC) {
        const hc = getHardCounter(brawler, enemy);
        if (hc) {
          hardBonus += hc.bonus;
          hardReasons.push(hc.reasonKey);
        }
      }
      hardBonus = hardBonus / Math.max(1, enemiesUC.length);
      const delta = (v.delta ?? 0) + hardBonus;
      return {
        brawler,
        solo: 0,
        synergy: null,
        matchup: v.mean,
        delta,
        score: delta,
        source: "ml" as const,
        badges: buildBadges({
          kind: "counterDelta",
          brawler,
          delta,
          perPartnerDelta: v.perPartnerDelta,
          partners: enemiesUC,
          hardReasons,
          baseline,
          classByCube,
          allyClassBonusByClass,
          alliesUC,
        }),
      };
    })
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, N_PER_LIST);

  // Synergy aggregates (raw + delta)
  const synergyAgg = aggregatePartnerLists(
    allySynergyLists,
    excludedSet,
    baseline
  );

  const topBySynergy: ScoredCandidate[] = [...synergyAgg.entries()]
    .map(([brawler, v]) => ({
      brawler,
      solo: 0,
      synergy: v.mean,
      matchup: null,
      delta: v.delta,
      score: v.mean,
      source: "ml" as const,
      badges: buildBadges({
        kind: "synergy",
        brawler,
        delta: v.delta,
        perPartnerDelta: v.perPartnerDelta,
        partners: alliesUC,
        baseline,
        classByCube,
        allyClassBonusByClass,
        alliesUC,
      }),
    }))
    .sort((a, b) => (b.synergy ?? 0) - (a.synergy ?? 0))
    .slice(0, N_PER_LIST);

  const topBySynergyDelta: ScoredCandidate[] = [...synergyAgg.entries()]
    .map(([brawler, v]) => ({
      brawler,
      solo: 0,
      synergy: v.mean,
      matchup: null,
      delta: v.delta,
      score: v.delta,
      source: "ml" as const,
      badges: buildBadges({
        kind: "synergyDelta",
        brawler,
        delta: v.delta,
        perPartnerDelta: v.perPartnerDelta,
        partners: alliesUC,
        baseline,
        classByCube,
        allyClassBonusByClass,
        alliesUC,
      }),
    }))
    .sort((a, b) => (b.delta ?? 0) - (a.delta ?? 0))
    .slice(0, N_PER_LIST);

  // topByMap: raw WR per brawler on this map
  const topByMap: ScoredCandidate[] = bans
    .filter((b) => !excludedSet.has(b.brawler))
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, N_PER_LIST)
    .map(
      (b): ScoredCandidate => ({
        brawler: b.brawler,
        solo: b.winRate,
        synergy: null,
        matchup: null,
        score: b.winRate,
        source: "ml" as const,
        badges: buildBadges({
          kind: "map",
          brawler: b.brawler,
          mapWR: b.winRate,
          baseline,
          classByCube,
          allyClassBonusByClass,
          alliesUC,
        }),
      })
    );

  // Combined IA (model output) with role-balance tweak and badges.
  const recommendations: ScoredCandidate[] =
    ai != null
      ? ai
          .map((r) => {
            const cls = classByCube.get(r.brawler);
            const { bonus, missingRole } = classBalanceBonus(
              cls,
              allyClassBonusByClass,
              alliesUC.length
            );
            const adjusted = r.score + bonus;
            return {
              brawler: r.brawler,
              solo: r.solo,
              synergy: r.synergy,
              matchup: r.matchup,
              score: adjusted,
              source: "ml" as const,
              badges: buildBadges({
                kind: "combined",
                brawler: r.brawler,
                missingRole,
                solo: r.solo,
                synergy: r.synergy,
                matchup: r.matchup,
                baseline,
                classByCube,
                allyClassBonusByClass,
                alliesUC,
              }),
            } satisfies ScoredCandidate;
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, N_OVERALL)
      : [];

  return NextResponse.json({
    bucket,
    perEnemy: perEnemy as { enemy: string; counters: CounterRow[] }[],
    bans: bans as BanRow[],
    recommendations,
    topByMap,
    topBySynergy,
    topBySynergyDelta,
    topByCounter,
    topByCounterDelta,
    modelLoaded: ai != null,
  });
}

/* ─────────────────────────── badge builder ────────────────────────────── */

type BuildBadgeOpts = {
  kind: "counter" | "counterDelta" | "synergy" | "synergyDelta" | "map" | "combined";
  brawler: string;
  delta?: number;
  perPartnerDelta?: number[];
  partners?: string[];
  hardReasons?: string[];
  mapWR?: number;
  solo?: number;
  synergy?: number | null;
  matchup?: number | null;
  missingRole?: boolean;
  baseline: Map<string, number>;
  classByCube: Map<string, string | undefined>;
  allyClassBonusByClass: Map<string, number>;
  alliesUC: string[];
};

function buildBadges(opts: BuildBadgeOpts): Badge[] {
  const badges: Badge[] = [];
  const baseWR = opts.baseline.get(opts.brawler);

  // ΔWR badge — for any column showing a delta.
  if (
    (opts.kind === "counterDelta" || opts.kind === "synergyDelta") &&
    opts.delta != null
  ) {
    const pp = Math.round(opts.delta * 100);
    if (Math.abs(pp) >= 3) {
      // For counterDelta, highlight the strongest matchup specifically.
      let against: string | undefined;
      if (opts.perPartnerDelta && opts.partners && opts.partners.length > 0) {
        let max = -Infinity;
        let maxIdx = -1;
        opts.perPartnerDelta.forEach((d, i) => {
          if (d > max) {
            max = d;
            maxIdx = i;
          }
        });
        if (maxIdx >= 0 && max > 0.02) against = opts.partners[maxIdx];
      }
      badges.push({
        kind:
          opts.kind === "counterDelta" ? "topCounter" : "topSynergy",
        value: against ? `${pp}|${against}` : `${pp}`,
      });
    }
  }

  // Hard counter badge — kit-level interaction.
  if (opts.hardReasons && opts.hardReasons.length > 0) {
    badges.push({ kind: "hardCounter", value: opts.hardReasons[0] });
  }

  // Top map badge — raw WR > threshold on the map.
  if (
    opts.kind === "map" &&
    opts.mapWR != null &&
    opts.mapWR >= TOP_MAP_THRESHOLD
  ) {
    badges.push({ kind: "topMap" });
  }
  if (
    opts.kind === "combined" &&
    opts.solo != null &&
    opts.solo >= TOP_MAP_THRESHOLD
  ) {
    badges.push({ kind: "topMap" });
  }

  // Missing role / meta — for the combined column.
  if (opts.kind === "combined") {
    if (opts.missingRole) badges.push({ kind: "missingRole" });
    if (baseWR != null && baseWR >= META_THRESHOLD)
      badges.push({ kind: "metaPick" });
  }

  return badges;
}
