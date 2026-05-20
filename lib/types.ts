export type Brawler = {
  id: number;
  name: string;
  cubeName: string;
  rarity: string;
  className?: string;
  imageUrl: string;
};

export type GameMap = {
  id: number;
  name: string;
  /** Map name as stored in the cube — may differ from `name` for a handful
   *  of maps (e.g. "Belle's Rock" in cube vs "Belles Rock" in Brawlify). */
  cubeName: string;
  hash: string;
  modeName: string;
  modeCube: string;
  modeColor: string;
  modeImageUrl: string;
  imageUrl: string;
};

export type GameMode = {
  name: string;
  cube: string;
  color: string;
  imageUrl: string;
  mapCount: number;
};

export type CounterRow = {
  brawler: string;
  winRate: number;
  picks: number;
};

export type DraftPick = {
  brawler: string;
  winRateOnMap: number | null;
  picksOnMap: number | null;
  avgWinRateVsEnemies: number | null;
  combinedScore: number;
};

export type DraftResponse = {
  perEnemy: { enemy: string; counters: CounterRow[] }[];
  overall: DraftPick[];
};

export type BanRow = {
  brawler: string;
  winRate: number;
  picks: number;
  pickShare: number;
  banScore: number;
};

export type ScoredCandidate = {
  brawler: string;
  solo: number;
  synergy: number | null;
  matchup: number | null;
  score: number;
  source: "ml" | "heuristic";
};
