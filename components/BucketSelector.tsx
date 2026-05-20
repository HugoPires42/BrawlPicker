"use client";
import { BUCKETS, BUCKET_META, type Bucket } from "@/lib/buckets";

type Props = {
  value: Bucket;
  onChange: (b: Bucket) => void;
};

export default function BucketSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-panel2 rounded-lg p-0.5 border border-border">
      {BUCKETS.map((b) => {
        const meta = BUCKET_META[b];
        const active = value === b;
        return (
          <button
            key={b}
            onClick={() => onChange(b)}
            title={meta.description}
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
