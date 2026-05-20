"use client";
import Image from "next/image";
import type { Brawler } from "@/lib/types";

type Props = {
  brawler: Brawler | undefined;
  cubeName: string;
  size?: number;
  className?: string;
};

const PALETTE = [
  "#ff6b6b",
  "#ffb000",
  "#3ecf8e",
  "#5da8ff",
  "#c879ff",
  "#ff7eb6",
  "#71f5dc",
  "#ff9f43",
];

function hashColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function initials(name: string): string {
  return name
    .split(/[\s.&-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

/** Renders a brawler portrait, or a colored initials chip if the brawler
 *  isn't in the brawler list (e.g. a recently renamed brawler still in cube). */
export default function BrawlerAvatar({
  brawler,
  cubeName,
  size = 36,
  className = "",
}: Props) {
  if (brawler) {
    return (
      <div
        className={
          "relative rounded-full overflow-hidden bg-panel2 ring-1 ring-border shrink-0 " +
          className
        }
        style={{ width: size, height: size }}
      >
        <Image
          src={brawler.imageUrl}
          alt={brawler.name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      </div>
    );
  }
  const bg = hashColor(cubeName);
  return (
    <div
      className={
        "rounded-full flex items-center justify-center text-black font-bold shrink-0 ring-1 ring-border " +
        className
      }
      style={{
        width: size,
        height: size,
        background: bg,
        fontSize: size * 0.4,
      }}
      title={cubeName}
    >
      {initials(cubeName)}
    </div>
  );
}
