"use client";
import Link from "next/link";
import BrawlerAvatar from "./BrawlerAvatar";
import { useI18n } from "./I18nProvider";
import { displayBrawlerName } from "@/lib/brawlerNames";
import { brawlerHref } from "@/lib/slug";
import type { Brawler } from "@/lib/types";

type Props = {
  brawler: Brawler | undefined;
  cubeName: string;
  winRate: number;
  onSelect?: (cubeName: string) => void;
};

export default function MiniCounter({
  brawler,
  cubeName,
  winRate,
  onSelect,
}: Props) {
  const { locale } = useI18n();
  const pct = (winRate * 100).toFixed(0);
  const strong = winRate >= 0.6;
  const cls =
    "flex items-center gap-2 px-1.5 py-1 rounded-md border bg-panel2/80 transition hover:border-accent hover:bg-panel2 w-full text-left " +
    (strong ? "border-good/40" : "border-border");
  const inner = (
    <>
      <BrawlerAvatar brawler={brawler} cubeName={cubeName} size={26} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] truncate">
          {displayBrawlerName(brawler, cubeName, locale)}
        </div>
      </div>
      <div
        className={
          "text-xs font-semibold " + (strong ? "text-good" : "text-muted")
        }
      >
        {pct}%
      </div>
    </>
  );
  if (onSelect) {
    return (
      <button onClick={() => onSelect(cubeName)} className={cls}>
        {inner}
      </button>
    );
  }
  return (
    <Link href={brawlerHref(cubeName)} className={cls}>
      {inner}
    </Link>
  );
}
