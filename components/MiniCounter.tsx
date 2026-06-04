"use client";
import Link from "next/link";
import BrawlerAvatar from "./BrawlerAvatar";
import { brawlerHref } from "@/lib/slug";
import type { Brawler } from "@/lib/types";

type Props = {
  brawler: Brawler | undefined;
  cubeName: string;
  winRate: number;
};

function displayName(b: Brawler | undefined, cubeName: string): string {
  if (b) return b.name;
  return cubeName
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export default function MiniCounter({ brawler, cubeName, winRate }: Props) {
  const pct = (winRate * 100).toFixed(0);
  const strong = winRate >= 0.6;
  return (
    <Link
      href={brawlerHref(cubeName)}
      className={
        "flex items-center gap-2 px-1.5 py-1 rounded-md border bg-panel2/80 transition hover:border-accent hover:bg-panel2 " +
        (strong ? "border-good/40" : "border-border")
      }
    >
      <BrawlerAvatar brawler={brawler} cubeName={cubeName} size={26} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] truncate">{displayName(brawler, cubeName)}</div>
      </div>
      <div
        className={
          "text-xs font-semibold " + (strong ? "text-good" : "text-muted")
        }
      >
        {pct}%
      </div>
    </Link>
  );
}
