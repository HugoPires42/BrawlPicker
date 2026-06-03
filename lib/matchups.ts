import { cubeQuery, type CubeFilter } from "./cube";
import { canonical, expandAliases } from "./aliases";
import { isRemoved } from "./removed";
import type { CounterRow } from "./types";

const MIN_PICKS = 1000;
const TTL_MS = 30 * 60 * 1000;
const TOP_GLOBAL = 80;
const TOP_PER_MAP = 20;

type Entry = { value: CounterRow[]; at: number };

// All caches are keyed by `${trophyKey}:${name}` where trophyKey is "all"
// or the trophyMin number — so each ELO bucket has its own warm + lookup.
const cache = new Map<string, Entry>();
const inflightSingle = new Map<string, Promise<CounterRow[]>>();
const synergyCache = new Map<string, Entry>();
const synergyInflight = new Map<string, Promise<CounterRow[]>>();
const globalWarmAt = new Map<string, number>();
const globalWarmInflight = new Map<string, Promise<void>>();
const mapWarmAt = new Map<string, number>();
const mapWarmInflight = new Map<string, Promise<void>>();

function tKey(trophyMin: number | null): string {
  return trophyMin == null ? "all" : String(trophyMin);
}
function ck(trophyMin: number | null, name: string): string {
  return `${tKey(trophyMin)}:${name}`;
}
function fresh(e: Entry | undefined): boolean {
  return !!e && Date.now() - e.at < TTL_MS;
}

function trophyFilter(trophyMin: number | null, dim: string): CubeFilter[] {
  return trophyMin == null
    ? []
    : [{ member: dim, operator: "gte", values: [String(trophyMin)] }];
}

async function bulkFetch(
  enemies: string[],
  trophyMin: number | null
): Promise<void> {
  if (enemies.length === 0) return;
  const queryEnemies = [...new Set(enemies.flatMap((e) => expandAliases(e)))];

  const rows = await cubeQuery<{
    "brawlerEnemies.enemy_dimension": string;
    "brawlerEnemies.brawler_dimension": string;
    "brawlerEnemies.winRate_measure": string | number;
    "brawlerEnemies.picks_measure": string | number;
  }>({
    measures: [
      "brawlerEnemies.winRate_measure",
      "brawlerEnemies.picks_measure",
    ],
    dimensions: [
      "brawlerEnemies.enemy_dimension",
      "brawlerEnemies.brawler_dimension",
    ],
    filters: [
      {
        member: "brawlerEnemies.enemy_dimension",
        operator: "equals",
        values: queryEnemies,
      },
      {
        member: "brawlerEnemies.picks_measure",
        operator: "gte",
        values: [String(MIN_PICKS)],
      },
      ...trophyFilter(trophyMin, "brawlerEnemies.trophyRange_dimension"),
    ],
  });

  const grouped = new Map<string, Map<string, { wr: number; picks: number }>>();
  for (const r of rows) {
    const enemyCanon = canonical(String(r["brawlerEnemies.enemy_dimension"]));
    const brawlerCanon = canonical(
      String(r["brawlerEnemies.brawler_dimension"])
    );
    if (isRemoved(brawlerCanon)) continue;
    const picks = Number(r["brawlerEnemies.picks_measure"]);
    const wr = Number(r["brawlerEnemies.winRate_measure"]);
    const perEnemy = grouped.get(enemyCanon) ?? new Map();
    const prev = perEnemy.get(brawlerCanon);
    if (!prev) perEnemy.set(brawlerCanon, { wr, picks });
    else {
      const total = prev.picks + picks;
      perEnemy.set(brawlerCanon, {
        wr: (prev.wr * prev.picks + wr * picks) / total,
        picks: total,
      });
    }
    grouped.set(enemyCanon, perEnemy);
  }

  const now = Date.now();
  for (const [e, mp] of grouped) {
    const list: CounterRow[] = [...mp.entries()]
      .map(([brawler, v]) => ({ brawler, winRate: v.wr, picks: v.picks }))
      .sort((a, b) => b.winRate - a.winRate);
    cache.set(ck(trophyMin, e), { value: list, at: now });
  }
  for (const e of enemies) {
    if (!grouped.has(e))
      cache.set(ck(trophyMin, e), { value: [], at: now });
  }
}

async function topGlobalBrawlers(
  limit: number,
  trophyMin: number | null
): Promise<string[]> {
  const rows = await cubeQuery<{ "battle.brawler_dimension": string }>({
    measures: ["battle.useRate_measure", "battle.picks_measure"],
    dimensions: ["battle.brawler_dimension"],
    filters: [
      {
        member: "battle.picks_measure",
        operator: "gte",
        values: ["100000"],
      },
      ...trophyFilter(trophyMin, "battle.trophyRange_dimension"),
    ],
    order: { "battle.useRate_measure": "desc" },
    limit,
  });
  return rows
    .map((r) => String(r["battle.brawler_dimension"]))
    .filter(Boolean);
}

async function topMapBrawlers(
  mode: string,
  map: string,
  limit: number,
  trophyMin: number | null
): Promise<string[]> {
  const rows = await cubeQuery<{ "map.brawler_dimension": string }>({
    measures: ["map.picks_measure"],
    dimensions: ["map.brawler_dimension"],
    filters: [
      { member: "map.mode_dimension", operator: "equals", values: [mode] },
      { member: "map.map_dimension", operator: "equals", values: [map] },
      ...trophyFilter(trophyMin, "map.trophyRange_dimension"),
    ],
    order: { "map.picks_measure": "desc" },
    limit,
  });
  return rows
    .map((r) => String(r["map.brawler_dimension"]))
    .filter(Boolean);
}

export function warmGlobal(trophyMin: number | null = null): void {
  const key = tKey(trophyMin);
  if (globalWarmInflight.has(key)) return;
  if (Date.now() - (globalWarmAt.get(key) ?? 0) < TTL_MS) return;
  const p = (async () => {
    try {
      const top = await topGlobalBrawlers(TOP_GLOBAL, trophyMin);
      await bulkFetch(top, trophyMin);
      globalWarmAt.set(key, Date.now());
    } catch {
      /* swallow */
    } finally {
      globalWarmInflight.delete(key);
    }
  })();
  globalWarmInflight.set(key, p);
}

export function warmMap(
  mode: string,
  map: string,
  trophyMin: number | null = null
): void {
  const key = `${tKey(trophyMin)}::${mode}::${map}`;
  if (mapWarmInflight.has(key)) return;
  if (Date.now() - (mapWarmAt.get(key) ?? 0) < TTL_MS) return;
  const p = (async () => {
    try {
      const enemies = await topMapBrawlers(mode, map, TOP_PER_MAP, trophyMin);
      const missing = enemies.filter((e) => !fresh(cache.get(ck(trophyMin, e))));
      if (missing.length > 0) await bulkFetch(missing, trophyMin);
      mapWarmAt.set(key, Date.now());
    } catch {
      /* swallow */
    } finally {
      mapWarmInflight.delete(key);
    }
  })();
  mapWarmInflight.set(key, p);
}

export async function getCountersForEnemy(
  enemy: string,
  trophyMin: number | null = null
): Promise<CounterRow[]> {
  const upper = canonical(enemy.toUpperCase());
  const key = ck(trophyMin, upper);
  const hit = cache.get(key);
  if (fresh(hit)) return hit!.value;

  const gWarm = globalWarmInflight.get(tKey(trophyMin));
  if (gWarm) {
    await gWarm.catch(() => {});
    const after = cache.get(key);
    if (fresh(after)) return after!.value;
  }
  if (mapWarmInflight.size > 0) {
    await Promise.allSettled([...mapWarmInflight.values()]);
    const after = cache.get(key);
    if (fresh(after)) return after!.value;
  }

  const pending = inflightSingle.get(key);
  if (pending) return pending;

  const p = (async () => {
    const queryEnemies = expandAliases(upper);
    const rows = await cubeQuery<{
      "brawlerEnemies.brawler_dimension": string;
      "brawlerEnemies.winRate_measure": string | number;
      "brawlerEnemies.picks_measure": string | number;
    }>({
      measures: [
        "brawlerEnemies.winRate_measure",
        "brawlerEnemies.picks_measure",
      ],
      dimensions: ["brawlerEnemies.brawler_dimension"],
      filters: [
        {
          member: "brawlerEnemies.enemy_dimension",
          operator: "equals",
          values: queryEnemies,
        },
        {
          member: "brawlerEnemies.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS)],
        },
        ...trophyFilter(trophyMin, "brawlerEnemies.trophyRange_dimension"),
      ],
      order: { "brawlerEnemies.winRate_measure": "desc" },
    });
    const merged = new Map<string, { wr: number; picks: number }>();
    for (const r of rows) {
      const b = canonical(String(r["brawlerEnemies.brawler_dimension"]));
      if (isRemoved(b)) continue;
      const wr = Number(r["brawlerEnemies.winRate_measure"]);
      const picks = Number(r["brawlerEnemies.picks_measure"]);
      const prev = merged.get(b);
      if (!prev) merged.set(b, { wr, picks });
      else {
        const total = prev.picks + picks;
        merged.set(b, {
          wr: (prev.wr * prev.picks + wr * picks) / total,
          picks: total,
        });
      }
    }
    const list: CounterRow[] = [...merged.entries()]
      .map(([brawler, v]) => ({ brawler, winRate: v.wr, picks: v.picks }))
      .sort((a, b) => b.winRate - a.winRate);
    cache.set(key, { value: list, at: Date.now() });
    return list;
  })().finally(() => inflightSingle.delete(key));

  inflightSingle.set(key, p);
  return p;
}

/**
 * Mirror of getCountersForEnemy but for the brawlerAllies cube — returns,
 * for each candidate brawler, their observed WR when teamed with the given
 * ally. Used to derive the "Ally synergy" column from raw cube aggregates
 * (same data shape as the per-enemy counter cards under each enemy slot).
 */
export async function getSynergyForAlly(
  ally: string,
  trophyMin: number | null = null
): Promise<CounterRow[]> {
  const upper = canonical(ally.toUpperCase());
  const key = ck(trophyMin, upper);
  const hit = synergyCache.get(key);
  if (fresh(hit)) return hit!.value;

  const pending = synergyInflight.get(key);
  if (pending) return pending;

  const p = (async () => {
    const queryAllies = expandAliases(upper);
    const rows = await cubeQuery<{
      "brawlerAllies.brawler_dimension": string;
      "brawlerAllies.winRate_measure": string | number;
      "brawlerAllies.picks_measure": string | number;
    }>({
      measures: [
        "brawlerAllies.winRate_measure",
        "brawlerAllies.picks_measure",
      ],
      dimensions: ["brawlerAllies.brawler_dimension"],
      filters: [
        {
          member: "brawlerAllies.ally_dimension",
          operator: "equals",
          values: queryAllies,
        },
        {
          member: "brawlerAllies.picks_measure",
          operator: "gte",
          values: [String(MIN_PICKS)],
        },
        ...trophyFilter(trophyMin, "brawlerAllies.trophyRange_dimension"),
      ],
      order: { "brawlerAllies.winRate_measure": "desc" },
    });
    const merged = new Map<string, { wr: number; picks: number }>();
    for (const r of rows) {
      const b = canonical(String(r["brawlerAllies.brawler_dimension"]));
      if (isRemoved(b)) continue;
      const wr = Number(r["brawlerAllies.winRate_measure"]);
      const picks = Number(r["brawlerAllies.picks_measure"]);
      const prev = merged.get(b);
      if (!prev) merged.set(b, { wr, picks });
      else {
        const total = prev.picks + picks;
        merged.set(b, {
          wr: (prev.wr * prev.picks + wr * picks) / total,
          picks: total,
        });
      }
    }
    const list: CounterRow[] = [...merged.entries()]
      .map(([brawler, v]) => ({ brawler, winRate: v.wr, picks: v.picks }))
      .sort((a, b) => b.winRate - a.winRate);
    synergyCache.set(key, { value: list, at: Date.now() });
    return list;
  })().finally(() => synergyInflight.delete(key));

  synergyInflight.set(key, p);
  return p;
}
