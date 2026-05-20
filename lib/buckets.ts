/**
 * ELO buckets — trophy-range bins used by extraction, training, and runtime
 * cube queries. Each bucket has its own trained model file.
 */
export type Bucket = "all" | "diamond" | "mythic";

export const BUCKETS: Bucket[] = ["all", "diamond", "mythic"];

export type BucketMeta = {
  key: Bucket;
  label: string;
  shortLabel: string;
  trophyMin: number | null;
  description: string;
};

export const BUCKET_META: Record<Bucket, BucketMeta> = {
  all: {
    key: "all",
    label: "Tous les joueurs",
    shortLabel: "All",
    trophyMin: null,
    description: "Pas de filtre — toutes les tranches de trophées",
  },
  diamond: {
    key: "diamond",
    label: "Diamant et +",
    shortLabel: "Diamond+",
    trophyMin: 13,
    description: "≥ 1 300 trophées — joueurs compétitifs",
  },
  mythic: {
    key: "mythic",
    label: "Mythique et +",
    shortLabel: "Mythic+",
    trophyMin: 18,
    description: "≥ 1 800 trophées — top compétitif",
  },
};

export function parseBucket(value: string | null | undefined): Bucket {
  if (value === "diamond" || value === "mythic") return value;
  return "all";
}

export function bucketTrophyMin(b: Bucket): number | null {
  return BUCKET_META[b].trophyMin;
}
