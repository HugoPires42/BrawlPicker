"use client";
import Image from "next/image";
import type { Brawler } from "@/lib/types";

type Props = {
  brawler: Brawler | null;
  label?: string;
  onClick: () => void;
  onClear?: () => void;
  variant?: "enemy" | "ally";
  size?: "md" | "lg";
};

export default function BrawlerSlot({
  brawler,
  label,
  onClick,
  onClear,
  variant = "enemy",
  size = "md",
}: Props) {
  const ring =
    variant === "enemy" ? "ring-bad/50" : "ring-good/50";
  const accent =
    variant === "enemy" ? "text-bad" : "text-good";
  const dim = size === "lg" ? "w-24 h-24" : "w-20 h-20";

  return (
    <div className="flex flex-col items-center gap-1.5">
      {label && (
        <div className={"text-[10px] uppercase tracking-wide " + accent}>
          {label}
        </div>
      )}
      <button
        onClick={onClick}
        className={
          "relative rounded-full overflow-hidden bg-panel2 ring-2 transition " +
          ring +
          " " +
          dim +
          " hover:ring-4 hover:scale-105"
        }
        aria-label={brawler ? brawler.name : "Choisir un brawler"}
      >
        {brawler ? (
          <Image
            src={brawler.imageUrl}
            alt={brawler.name}
            fill
            sizes="96px"
            className="object-cover"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-3xl text-muted">
            +
          </span>
        )}
      </button>
      <div className="text-xs h-4 truncate max-w-[100px] flex items-center gap-1">
        {brawler && (
          <>
            <span className="truncate">{brawler.name}</span>
            {onClear && (
              <button
                onClick={onClear}
                className="text-muted hover:text-bad"
                aria-label="Retirer"
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
