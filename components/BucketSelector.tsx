"use client";
import { BUCKETS, BUCKET_META, type Bucket } from "@/lib/buckets";
import { useI18n } from "./I18nProvider";
import type { StringKey } from "@/lib/i18n";

type Props = {
  value: Bucket;
  onChange: (b: Bucket) => void;
};

const DESC_KEY: Record<Bucket, StringKey> = {
  all: "bucket.all.desc",
  diamond: "bucket.diamond.desc",
  mythic: "bucket.mythic.desc",
};

export default function BucketSelector({ value, onChange }: Props) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-1 bg-panel2 rounded-lg p-0.5 border border-border">
      {BUCKETS.map((b) => {
        const meta = BUCKET_META[b];
        const active = value === b;
        return (
          <button
            key={b}
            onClick={() => onChange(b)}
            title={t(DESC_KEY[b])}
            className={
              "px-2.5 py-1 rounded text-xs font-medium transition " +
              (active
                ? "bg-accent text-black"
                : "text-muted hover:text-white")
            }
          >
            {meta.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
