/**
 * Loads trained matrix-factorization models per ELO bucket and exposes
 * inference helpers. Each bucket has its own model file (data/model-{bucket}.json),
 * loaded lazily on first use and cached in memory.
 */

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Bucket } from "./buckets";

type ModelFile = {
  version: number;
  bucket?: Bucket;
  trainedAt: string;
  dim: number;
  brawlers: string[];
  maps: string[];
  O: number[];
  D: number[];
  S: number[];
  bias: number[];
  mapB: number[];
  metrics: {
    train: { mse: number; mae: number };
    test: { mse: number; mae: number };
  };
};

export type ScoreContext = {
  mode?: string;
  map?: string;
  allies: string[];
  enemies: string[];
  excluded: Set<string>;
};

export type ScoredCandidate = {
  brawler: string;
  solo: number;
  synergy: number | null;
  matchup: number | null;
  score: number;
};

export type ModelHandle = {
  bucket: Bucket;
  trainedAt: string;
  dim: number;
  brawlerCount: number;
  mapCount: number;
  knowsBrawler: (cube: string) => boolean;
  knowsMap: (mode: string, map: string) => boolean;
  scoreCandidates: (ctx: ScoreContext) => ScoredCandidate[];
  metrics: ModelFile["metrics"];
};

const cache = new Map<Bucket, ModelHandle>();
const loading = new Map<Bucket, Promise<ModelHandle>>();

function sigmoid(x: number) {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}

function dot(a: Float64Array, ai: number, b: Float64Array, bi: number, d: number) {
  let s = 0;
  for (let k = 0; k < d; k++) s += a[ai + k] * b[bi + k];
  return s;
}

async function loadOne(bucket: Bucket): Promise<ModelHandle> {
  const path = resolve(process.cwd(), `data/model-${bucket}.json`);
  const buf = await readFile(path, "utf8");
  const m = JSON.parse(buf) as ModelFile;
  const D = m.dim;
  const B = m.brawlers.length;
  const Mn = m.maps.length;

  const brawlerIdx = new Map<string, number>();
  m.brawlers.forEach((b, i) => brawlerIdx.set(b, i));
  const mapIdx = new Map<string, number>();
  m.maps.forEach((k, i) => mapIdx.set(k, i));

  const O = Float64Array.from(m.O);
  const Dv = Float64Array.from(m.D);
  const Sv = Float64Array.from(m.S);
  const bias = Float64Array.from(m.bias);
  const mapB = Float64Array.from(m.mapB);

  const knowsBrawler = (cube: string) => brawlerIdx.has(cube);
  const knowsMap = (mode: string, map: string) =>
    mapIdx.has(`${mode}::${map}`);

  function scoreCandidates(ctx: ScoreContext): ScoredCandidate[] {
    const m_idx =
      ctx.mode && ctx.map ? mapIdx.get(`${ctx.mode}::${ctx.map}`) : undefined;

    const allies = ctx.allies
      .map((a) => brawlerIdx.get(a))
      .filter((x): x is number => x != null);
    const enemies = ctx.enemies
      .map((e) => brawlerIdx.get(e))
      .filter((x): x is number => x != null);

    const out: ScoredCandidate[] = [];

    for (const [name, X] of brawlerIdx) {
      if (ctx.excluded.has(name)) continue;
      const xOff = X * D;

      const soloLogit =
        (m_idx != null ? mapB[m_idx * B + X] : 0) + bias[X];
      const solo = sigmoid(soloLogit);

      let synergy: number | null = null;
      if (allies.length > 0) {
        let sumSyn = 0;
        for (const a of allies) {
          const synLogit = soloLogit + dot(Sv, xOff, Sv, a * D, D);
          sumSyn += sigmoid(synLogit);
        }
        synergy = sumSyn / allies.length;
      }

      let matchup: number | null = null;
      if (enemies.length > 0) {
        let sumMat = 0;
        for (const e of enemies) {
          const eOff = e * D;
          const matLogit =
            (m_idx != null
              ? mapB[m_idx * B + X] - mapB[m_idx * B + e]
              : 0) +
            (bias[X] - bias[e]) +
            dot(O, xOff, Dv, eOff, D) -
            dot(O, eOff, Dv, xOff, D);
          sumMat += sigmoid(matLogit);
        }
        matchup = sumMat / enemies.length;
      }

      const parts: number[] = [solo];
      const weights: number[] = [0.4];
      if (synergy != null) {
        parts.push(synergy);
        weights.push(0.3);
      }
      if (matchup != null) {
        parts.push(matchup);
        weights.push(0.3);
      }
      const wSum = weights.reduce((s, w) => s + w, 0);
      let score = 0;
      for (let i = 0; i < parts.length; i++) score += parts[i] * (weights[i] / wSum);

      out.push({ brawler: name, solo, synergy, matchup, score });
    }

    out.sort((a, b) => b.score - a.score);
    return out;
  }

  return {
    bucket,
    trainedAt: m.trainedAt,
    dim: D,
    brawlerCount: B,
    mapCount: Mn,
    knowsBrawler,
    knowsMap,
    scoreCandidates,
    metrics: m.metrics,
  };
}

export async function getModel(bucket: Bucket = "all"): Promise<ModelHandle> {
  const hit = cache.get(bucket);
  if (hit) return hit;
  const pending = loading.get(bucket);
  if (pending) return pending;
  const p = loadOne(bucket)
    .then((m) => {
      cache.set(bucket, m);
      return m;
    })
    .finally(() => loading.delete(bucket));
  loading.set(bucket, p);
  return p;
}

export async function hasModel(bucket: Bucket = "all"): Promise<boolean> {
  try {
    await getModel(bucket);
    return true;
  } catch {
    return false;
  }
}
