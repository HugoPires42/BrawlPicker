/**
 * Train a Matrix-Factorization model over solo/synergy/matchup aggregates.
 *
 * Model:
 *   solo(b, m)        logit = mapB[m,b] + bias[b]
 *   ally(a, p, m)     logit = mapB[m,a] + bias[a] + S_a · S_p
 *   enemy(a, e, m)    logit = (mapB[m,a] - mapB[m,e]) + (bias[a] - bias[e])
 *                              + O_a · D_e - O_e · D_a
 *
 *   pred = sigmoid(logit),  target = observed WR ∈ [0, 1]
 *   loss = √picks * (pred - target)²       (confidence-weighted)
 *
 * Optimizer: SGD + momentum, with L2.
 * Output: data/model.json
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

// Bucket selects which extracted dataset to train on.
//   BUCKET=all      → data/training/raw-all.json     → data/model-all.json
//   BUCKET=diamond  → data/training/raw-diamond.json → data/model-diamond.json
//   BUCKET=mythic   → data/training/raw-mythic.json  → data/model-mythic.json
const BUCKET = process.env.BUCKET || "all";
const RAW_PATH = resolve(process.cwd(), `data/training/raw-${BUCKET}.json`);
const MODEL_PATH = resolve(process.cwd(), `data/model-${BUCKET}.json`);

const D = 16;
const EPOCHS = 80;
const LR = 0.05;
const MOMENTUM = 0.85;
const L2 = 1e-5;
const HOLDOUT = 0.1;
const SEED = 1337;
const WEIGHT_CAP_PERCENTILE = 0.95; // cap weights at p95 to avoid gradient explosion

type RawRow = { brawler: string; mode: string; map: string; wr: number; picks: number; partner?: string };
type Raw = { solo: RawRow[]; ally: RawRow[]; enemy: RawRow[] };

type Sample = {
  type: 0 | 1 | 2; // solo | ally | enemy
  a: number;
  b: number; // -1 if solo
  m: number;
  target: number;
  weight: number;
};

let rngState = SEED;
function rand() {
  rngState = (rngState * 1664525 + 1013904223) >>> 0;
  return rngState / 0x100000000;
}
function gaussian(stdev: number) {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * stdev;
}
function sigmoid(x: number) {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

async function main() {
  const t0 = Date.now();
  console.log("Loading raw…");
  const raw = JSON.parse(await readFile(RAW_PATH, "utf8")) as Raw;

  const brawlerIdx = new Map<string, number>();
  const mapIdx = new Map<string, number>();
  const idxBrawler: string[] = [];
  const idxMap: string[] = [];
  const ensureB = (b: string) => {
    let i = brawlerIdx.get(b);
    if (i == null) {
      i = idxBrawler.length;
      brawlerIdx.set(b, i);
      idxBrawler.push(b);
    }
    return i;
  };
  const ensureM = (k: string) => {
    let i = mapIdx.get(k);
    if (i == null) {
      i = idxMap.length;
      mapIdx.set(k, i);
      idxMap.push(k);
    }
    return i;
  };

  const samples: Sample[] = [];
  const pushPair = (
    type: 1 | 2,
    rows: RawRow[]
  ) => {
    for (const r of rows) {
      if (!r.partner) continue;
      const a = ensureB(r.brawler);
      const p = ensureB(r.partner);
      const m = ensureM(`${r.mode}::${r.map}`);
      if (!Number.isFinite(r.wr) || r.picks <= 0) continue;
      samples.push({
        type,
        a,
        b: p,
        m,
        target: Math.min(0.99, Math.max(0.01, r.wr)),
        weight: Math.sqrt(r.picks),
      });
    }
  };
  for (const r of raw.solo) {
    const a = ensureB(r.brawler);
    const m = ensureM(`${r.mode}::${r.map}`);
    if (!Number.isFinite(r.wr) || r.picks <= 0) continue;
    samples.push({
      type: 0,
      a,
      b: -1,
      m,
      target: Math.min(0.99, Math.max(0.01, r.wr)),
      weight: Math.sqrt(r.picks),
    });
  }
  pushPair(1, raw.ally);
  pushPair(2, raw.enemy);

  const B = idxBrawler.length;
  const M = idxMap.length;
  console.log(`B=${B} brawlers, M=${M} maps, samples=${samples.length}`);

  // Normalize weights: clip to p95 then divide by mean → most weights end up near 1
  const sortedW = samples.map((s) => s.weight).sort((a, b) => a - b);
  const cap = sortedW[Math.floor(sortedW.length * WEIGHT_CAP_PERCENTILE)];
  for (const s of samples) s.weight = Math.min(s.weight, cap);
  const meanW = samples.reduce((sum, s) => sum + s.weight, 0) / samples.length;
  for (const s of samples) s.weight = s.weight / meanW;
  console.log(
    `weight stats: cap=${cap.toFixed(0)}, mean=${meanW.toFixed(0)} → normalized to ~1`
  );

  // Train/holdout split
  for (let i = samples.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [samples[i], samples[j]] = [samples[j], samples[i]];
  }
  const cut = Math.floor(samples.length * (1 - HOLDOUT));
  const train = samples.slice(0, cut);
  const test = samples.slice(cut);
  console.log(`train=${train.length} test=${test.length}`);

  // Parameters
  const initStd = 0.02;
  const O = new Float64Array(B * D).map(() => gaussian(initStd));
  const Dv = new Float64Array(B * D).map(() => gaussian(initStd));
  const Sv = new Float64Array(B * D).map(() => gaussian(initStd));
  const bias = new Float64Array(B);
  const mapB = new Float64Array(M * B);

  // Velocities (momentum)
  const vO = new Float64Array(O.length);
  const vD = new Float64Array(Dv.length);
  const vS = new Float64Array(Sv.length);
  const vBias = new Float64Array(bias.length);
  const vMapB = new Float64Array(mapB.length);

  function predictLogit(s: Sample): number {
    const aOff = s.a * D;
    const mB = s.m * B;
    let logit = mapB[mB + s.a] + bias[s.a];
    if (s.type === 0) return logit;
    if (s.type === 1) {
      const pOff = s.b * D;
      let dot = 0;
      for (let k = 0; k < D; k++) dot += Sv[aOff + k] * Sv[pOff + k];
      return logit + dot;
    }
    // enemy
    const eOff = s.b * D;
    let dotAE = 0;
    let dotEA = 0;
    for (let k = 0; k < D; k++) {
      dotAE += O[aOff + k] * Dv[eOff + k];
      dotEA += O[eOff + k] * Dv[aOff + k];
    }
    return logit - mapB[mB + s.b] - bias[s.b] + dotAE - dotEA;
  }

  function applyGradients(
    s: Sample,
    gradLogit: number,
    lr: number
  ) {
    const aOff = s.a * D;
    const mB = s.m * B;

    // bias[a] += grad
    const ga = gradLogit;
    vBias[s.a] = MOMENTUM * vBias[s.a] - lr * (ga + L2 * bias[s.a]);
    bias[s.a] += vBias[s.a];

    // mapB[m, a] += grad
    vMapB[mB + s.a] = MOMENTUM * vMapB[mB + s.a] - lr * (ga + L2 * mapB[mB + s.a]);
    mapB[mB + s.a] += vMapB[mB + s.a];

    if (s.type === 1) {
      const pOff = s.b * D;
      // d/d S_a[k] = grad * S_p[k]; d/d S_p[k] = grad * S_a[k]
      for (let k = 0; k < D; k++) {
        const sa = Sv[aOff + k];
        const sp = Sv[pOff + k];
        const gA = ga * sp + L2 * sa;
        const gP = ga * sa + L2 * sp;
        vS[aOff + k] = MOMENTUM * vS[aOff + k] - lr * gA;
        vS[pOff + k] = MOMENTUM * vS[pOff + k] - lr * gP;
        Sv[aOff + k] += vS[aOff + k];
        Sv[pOff + k] += vS[pOff + k];
      }
    } else if (s.type === 2) {
      const eOff = s.b * D;
      // bias[b] -= grad
      const ge = -ga;
      vBias[s.b] = MOMENTUM * vBias[s.b] - lr * (ge + L2 * bias[s.b]);
      bias[s.b] += vBias[s.b];
      vMapB[mB + s.b] = MOMENTUM * vMapB[mB + s.b] - lr * (ge + L2 * mapB[mB + s.b]);
      mapB[mB + s.b] += vMapB[mB + s.b];
      // O_a · D_e - O_e · D_a
      // d/d O_a[k] = grad * D_e[k]; d/d D_e[k] = grad * O_a[k]
      // d/d O_e[k] = -grad * D_a[k]; d/d D_a[k] = -grad * O_e[k]
      for (let k = 0; k < D; k++) {
        const oa = O[aOff + k];
        const oe = O[eOff + k];
        const da = Dv[aOff + k];
        const de = Dv[eOff + k];
        const gOa = ga * de + L2 * oa;
        const gDe = ga * oa + L2 * de;
        const gOe = -ga * da + L2 * oe;
        const gDa = -ga * oe + L2 * da;
        vO[aOff + k] = MOMENTUM * vO[aOff + k] - lr * gOa;
        vO[eOff + k] = MOMENTUM * vO[eOff + k] - lr * gOe;
        vD[aOff + k] = MOMENTUM * vD[aOff + k] - lr * gDa;
        vD[eOff + k] = MOMENTUM * vD[eOff + k] - lr * gDe;
        O[aOff + k] += vO[aOff + k];
        O[eOff + k] += vO[eOff + k];
        Dv[aOff + k] += vD[aOff + k];
        Dv[eOff + k] += vD[eOff + k];
      }
    }
  }

  function evalLoss(set: Sample[]) {
    let totalLoss = 0;
    let totalWeight = 0;
    let errsAbs = 0;
    for (const s of set) {
      const p = sigmoid(predictLogit(s));
      const e = p - s.target;
      totalLoss += s.weight * e * e;
      totalWeight += s.weight;
      errsAbs += s.weight * Math.abs(e);
    }
    return {
      mse: totalLoss / totalWeight,
      mae: errsAbs / totalWeight,
    };
  }

  console.log("Training…");
  for (let epoch = 0; epoch < EPOCHS; epoch++) {
    // Shuffle each epoch
    for (let i = train.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [train[i], train[j]] = [train[j], train[i]];
    }
    const lr = LR * Math.pow(0.95, epoch);
    for (const s of train) {
      const logit = predictLogit(s);
      const p = sigmoid(logit);
      const err = p - s.target;
      const gLogit = s.weight * err * p * (1 - p);
      applyGradients(s, gLogit, lr);
    }
    if (epoch % 5 === 0 || epoch === EPOCHS - 1) {
      const tr = evalLoss(train);
      const te = evalLoss(test);
      console.log(
        `epoch ${epoch.toString().padStart(2)}  lr=${lr.toFixed(3)}  ` +
          `train mae=${(tr.mae * 100).toFixed(2)}%  ` +
          `test mae=${(te.mae * 100).toFixed(2)}%`
      );
    }
  }

  // Final eval
  const finalTrain = evalLoss(train);
  const finalTest = evalLoss(test);
  console.log(
    `\nFinal: train MAE ${(finalTrain.mae * 100).toFixed(2)}%, test MAE ${(finalTest.mae * 100).toFixed(2)}%`
  );

  // Save model
  const model = {
    version: 1,
    bucket: BUCKET,
    trainedAt: new Date().toISOString(),
    dim: D,
    brawlers: idxBrawler,
    maps: idxMap,
    O: Array.from(O),
    D: Array.from(Dv),
    S: Array.from(Sv),
    bias: Array.from(bias),
    mapB: Array.from(mapB),
    metrics: {
      train: finalTrain,
      test: finalTest,
      trainSamples: train.length,
      testSamples: test.length,
    },
  };
  await writeFile(MODEL_PATH, JSON.stringify(model));
  const sizeMB = (JSON.stringify(model).length / 1024 / 1024).toFixed(2);
  console.log(`Saved ${MODEL_PATH} (${sizeMB} MB)`);
  console.log(`Elapsed: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
