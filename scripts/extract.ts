/**
 * Extract training data from brawltime cube.
 *
 * Restricts to the most recent SEASONS_BACK seasons so the meta is current.
 * Merges renamed brawlers (see lib/aliases.ts) by summing picks and computing
 * pick-weighted average WR.
 *
 * Output: data/training/raw.json with three arrays.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { getRankedMaps } from "../lib/ranked";
import { cubeQuery } from "../lib/cube";
import { canonical } from "../lib/aliases";

const MIN_PICKS_SOLO = 200;
const MIN_PICKS_PAIR = 500;
const CONCURRENCY = 4;
const SEASON_FROM = "2026-03-30";

// Bucket controls the trophy-range filter on cube queries.
//   all       — no trophy filter (default)
//   diamond   — trophyRange >= 13  (~1300+ trophies, competitive)
//   mythic    — trophyRange >= 18  (~1800+ trophies, top players)
// Set via env: BUCKET=diamond npm run ai:extract
type Bucket = "all" | "diamond" | "mythic";
const BUCKET: Bucket = (process.env.BUCKET as Bucket) || "all";
const BUCKET_TROPHY_MIN: Record<Bucket, number | null> = {
  all: null,
  diamond: 13,
  mythic: 18,
};
const trophyMin = BUCKET_TROPHY_MIN[BUCKET];
if (trophyMin == null && BUCKET !== "all") {
  console.error(`Unknown BUCKET=${BUCKET}, use one of: all, diamond, mythic`);
  process.exit(1);
}

const OUT_PATH = resolve(process.cwd(), `data/training/raw-${BUCKET}.json`);

type SoloSample = {
  kind: "solo";
  brawler: string;
  mode: string;
  map: string;
  wr: number;
  picks: number;
};
type PairSample = {
  kind: "ally" | "enemy";
  brawler: string;
  partner: string;
  mode: string;
  map: string;
  wr: number;
  picks: number;
};
type Sample = SoloSample | PairSample;

/** Sum picks + pick-weighted average WR over rows sharing the same key. */
function aggregate<K extends string>(
  rows: { key: K; wr: number; picks: number }[]
): Map<K, { wr: number; picks: number }> {
  const out = new Map<K, { wr: number; picks: number }>();
  for (const r of rows) {
    const prev = out.get(r.key);
    if (!prev) out.set(r.key, { wr: r.wr, picks: r.picks });
    else {
      const totalPicks = prev.picks + r.picks;
      const wr = (prev.wr * prev.picks + r.wr * r.picks) / totalPicks;
      out.set(r.key, { wr, picks: totalPicks });
    }
  }
  return out;
}

async function extractSolo(mode: string, map: string): Promise<SoloSample[]> {
  const filters: Parameters<typeof cubeQuery>[0]["filters"] = [
    { member: "map.mode_dimension", operator: "equals", values: [mode] },
    { member: "map.map_dimension", operator: "equals", values: [map] },
    {
      member: "map.season_dimension",
      operator: "gte",
      values: [SEASON_FROM],
    },
    {
      member: "map.picks_measure",
      operator: "gte",
      values: [String(MIN_PICKS_SOLO)],
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

  const agg = aggregate(
    rows.map((r) => ({
      key: canonical(String(r["map.brawler_dimension"])),
      wr: Number(r["map.winRate_measure"]),
      picks: Number(r["map.picks_measure"]),
    }))
  );

  return [...agg].map(([brawler, v]) => ({
    kind: "solo",
    brawler,
    mode,
    map,
    wr: v.wr,
    picks: v.picks,
  }));
}

async function extractPair(
  mode: string,
  map: string,
  cube: "brawlerAllies" | "brawlerEnemies"
): Promise<PairSample[]> {
  const partnerDim =
    cube === "brawlerAllies"
      ? "brawlerAllies.ally_dimension"
      : "brawlerEnemies.enemy_dimension";
  const brawlerDim = `${cube}.brawler_dimension`;
  const wrM = `${cube}.winRate_measure`;
  const picksM = `${cube}.picks_measure`;
  const modeDim = `${cube}.mode_dimension`;
  const mapDim = `${cube}.map_dimension`;
  const seasonDim = `${cube}.season_dimension`;

  const trophyDim = `${cube}.trophyRange_dimension`;
  const filters: Parameters<typeof cubeQuery>[0]["filters"] = [
    { member: modeDim, operator: "equals", values: [mode] },
    { member: mapDim, operator: "equals", values: [map] },
    { member: seasonDim, operator: "gte", values: [SEASON_FROM] },
    { member: picksM, operator: "gte", values: [String(MIN_PICKS_PAIR)] },
  ];
  if (trophyMin != null) {
    filters.push({
      member: trophyDim,
      operator: "gte",
      values: [String(trophyMin)],
    });
  }
  const rows = await cubeQuery<Record<string, string | number>>({
    measures: [wrM, picksM],
    dimensions: [brawlerDim, partnerDim],
    filters,
  });

  const agg = aggregate(
    rows.map((r) => ({
      key: `${canonical(String(r[brawlerDim]))}|${canonical(String(r[partnerDim]))}`,
      wr: Number(r[wrM]),
      picks: Number(r[picksM]),
    }))
  );

  const k = cube === "brawlerAllies" ? "ally" : "enemy";
  return [...agg].map(([key, v]) => {
    const [brawler, partner] = key.split("|");
    return {
      kind: k as "ally" | "enemy",
      brawler,
      partner,
      mode,
      map,
      wr: v.wr,
      picks: v.picks,
    };
  });
}

async function main() {
  const t0 = Date.now();
  const maps = await getRankedMaps();
  console.log(`Bucket: ${BUCKET}${trophyMin != null ? ` (trophyRange >= ${trophyMin})` : " (no trophy filter)"}`);
  console.log(`Maps ranked: ${maps.length}`);
  console.log(`Season filter: >= ${SEASON_FROM} (recent meta)`);
  console.log(`Brawler aliases applied (cube → canonical)`);

  const tasks: Array<() => Promise<Sample[]>> = [];
  for (const m of maps) {
    tasks.push(() => extractSolo(m.modeCube, m.cubeName));
    tasks.push(() => extractPair(m.modeCube, m.cubeName, "brawlerAllies"));
    tasks.push(() => extractPair(m.modeCube, m.cubeName, "brawlerEnemies"));
  }

  console.log(`Tasks queued: ${tasks.length}`);
  const all: Sample[] = [];
  let done = 0;
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < tasks.length) {
        const idx = i++;
        try {
          const r = await tasks[idx]();
          all.push(...r);
        } catch (e) {
          console.warn(`task ${idx} failed:`, (e as Error).message);
        }
        done++;
        if (done % 10 === 0 || done === tasks.length) {
          const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
          console.log(
            `  ${done}/${tasks.length} done (${elapsed}s, ${all.length} samples)`
          );
        }
      }
    })
  );

  const solo = all.filter((s): s is SoloSample => s.kind === "solo");
  const ally = all.filter((s): s is PairSample => s.kind === "ally");
  const enemy = all.filter((s): s is PairSample => s.kind === "enemy");

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(
    OUT_PATH,
    JSON.stringify(
      {
        extractedAt: new Date().toISOString(),
        seasonFrom: SEASON_FROM,
        bucket: BUCKET,
        trophyMin,
        maps: maps.length,
        solo,
        ally,
        enemy,
      },
      null,
      0
    )
  );

  console.log(`\nWrote ${OUT_PATH}`);
  console.log(`  solo:  ${solo.length}`);
  console.log(`  ally:  ${ally.length}`);
  console.log(`  enemy: ${enemy.length}`);
  console.log(`  total: ${all.length} samples`);
  console.log(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
