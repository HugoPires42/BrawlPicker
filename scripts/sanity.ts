/**
 * Load the trained model and print a few human-readable sanity checks:
 *  - Top counters of a known meta brawler (compare to observed cube data)
 *  - Top picks on a specific ranked map with a given enemy team
 *  - Nearest-neighbor brawler embeddings (does the model cluster classes?)
 */

import { getModel } from "../lib/aiModel";

const ENEMY_PROBES = ["SHELLY", "PIPER", "FRANK", "EDGAR"];
const MAP_PROBES = [
  { mode: "gemGrab", map: "Hard Rock Mine" },
  { mode: "brawlBall", map: "Pinball Dreams" },
  { mode: "knockout", map: "Out in the Open" },
  { mode: "heist", map: "Safe Zone" },
];
const NEIGHBORS_OF = ["SHELLY", "PIPER", "FRANK", "EDGAR", "MORTIS"];

async function main() {
  const m = await getModel();
  console.log(
    `Model trained ${m.trainedAt}, brawlers=${m.brawlerCount}, maps=${m.mapCount}, dim=${m.dim}`
  );
  console.log(
    `Test MAE: ${(m.metrics.test.mae * 100).toFixed(2)}%   Train MAE: ${(m.metrics.train.mae * 100).toFixed(2)}%`
  );

  console.log("\n=== Top model picks vs single enemy (no map) ===");
  for (const enemy of ENEMY_PROBES) {
    if (!m.knowsBrawler(enemy)) {
      console.log(`  (unknown brawler ${enemy})`);
      continue;
    }
    const ranked = m.scoreCandidates({
      allies: [],
      enemies: [enemy],
      excluded: new Set([enemy]),
    });
    const top = ranked.slice(0, 5).map((c) => {
      const mu = c.matchup != null ? `${(c.matchup * 100).toFixed(0)}%` : "—";
      return `${c.brawler}(${mu})`;
    });
    console.log(`  vs ${enemy.padEnd(10)} → ${top.join("  ")}`);
  }

  console.log("\n=== Top picks per map ===");
  for (const p of MAP_PROBES) {
    if (!m.knowsMap(p.mode, p.map)) {
      console.log(`  (unknown map ${p.mode}/${p.map})`);
      continue;
    }
    const ranked = m.scoreCandidates({
      mode: p.mode,
      map: p.map,
      allies: [],
      enemies: [],
      excluded: new Set(),
    });
    const top = ranked
      .slice(0, 5)
      .map((c) => `${c.brawler}(${(c.solo * 100).toFixed(0)}%)`);
    console.log(`  ${p.map.padEnd(20)} → ${top.join("  ")}`);
  }

  console.log("\n=== Picks on map vs full enemy team ===");
  const scenario = {
    mode: "gemGrab",
    map: "Hard Rock Mine",
    enemies: ["SHELLY", "COLT", "PIPER"],
  };
  if (m.knowsMap(scenario.mode, scenario.map)) {
    const ranked = m.scoreCandidates({
      mode: scenario.mode,
      map: scenario.map,
      allies: [],
      enemies: scenario.enemies,
      excluded: new Set(scenario.enemies),
    });
    console.log(`  ${scenario.map} vs [${scenario.enemies.join(", ")}]`);
    for (const c of ranked.slice(0, 8)) {
      const solo = (c.solo * 100).toFixed(0);
      const mu = c.matchup != null ? (c.matchup * 100).toFixed(0) : "--";
      const score = (c.score * 100).toFixed(1);
      console.log(
        `    ${c.brawler.padEnd(15)} score=${score}  solo=${solo}%  vs=${mu}%`
      );
    }
  }

  console.log("\n=== Brawler embedding neighbors (S vectors) ===");
  // To compute neighbors we need raw vectors. We reach into the model file directly.
  const { readFile } = await import("node:fs/promises");
  const { resolve } = await import("node:path");
  const raw = JSON.parse(
    await readFile(resolve(process.cwd(), "data/model.json"), "utf8")
  ) as {
    dim: number;
    brawlers: string[];
    S: number[];
    O: number[];
    D: number[];
  };
  const D = raw.dim;
  const idx = new Map<string, number>();
  raw.brawlers.forEach((b, i) => idx.set(b, i));
  const cos = (a: number[], b: number[]) => {
    let dot = 0;
    let na = 0;
    let nb = 0;
    for (let i = 0; i < D; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-9);
  };

  const slice = (arr: number[], i: number) =>
    arr.slice(i * D, (i + 1) * D);
  for (const target of NEIGHBORS_OF) {
    const ti = idx.get(target);
    if (ti == null) continue;
    const tS = slice(raw.S, ti);
    const tO = slice(raw.O, ti);
    const sims: { name: string; sS: number; sO: number }[] = [];
    for (const [name, i] of idx) {
      if (name === target) continue;
      sims.push({
        name,
        sS: cos(tS, slice(raw.S, i)),
        sO: cos(tO, slice(raw.O, i)),
      });
    }
    sims.sort((a, b) => b.sS - a.sS);
    const synLine = sims
      .slice(0, 5)
      .map((s) => `${s.name}(${s.sS.toFixed(2)})`)
      .join(", ");
    sims.sort((a, b) => b.sO - a.sO);
    const offLine = sims
      .slice(0, 5)
      .map((s) => `${s.name}(${s.sO.toFixed(2)})`)
      .join(", ");
    console.log(`  ${target}`);
    console.log(`    synergy-similar: ${synLine}`);
    console.log(`    offense-similar: ${offLine}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
