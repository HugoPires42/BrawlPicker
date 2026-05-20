"use client";
import Image from "next/image";
import type { GameMap, GameMode } from "@/lib/types";

type Props = {
  mode: GameMode;
  maps: GameMap[];
  onPick: (m: GameMap) => void;
  onBack: () => void;
};

export default function MapGrid({ mode, maps, onPick, onBack }: Props) {
  const filtered = maps.filter((m) => m.modeCube === mode.cube);

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="btn-ghost text-sm">
          ← Changer de mode
        </button>
        <div className="flex items-center gap-2">
          <Image
            src={mode.imageUrl}
            alt=""
            width={28}
            height={28}
            unoptimized
            className="rounded"
          />
          <div>
            <div className="text-xs text-muted uppercase">Mode</div>
            <div className="font-bold" style={{ color: mode.color }}>
              {mode.name}
            </div>
          </div>
        </div>
      </div>

      <div className="text-center mb-4">
        <h2 className="text-2xl font-extrabold tracking-tight">
          Choisis la map
        </h2>
        <p className="text-muted text-sm mt-1">
          {filtered.length} maps en ranked
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((m) => (
          <button
            key={m.id}
            onClick={() => onPick(m)}
            className="group rounded-2xl border-2 border-border bg-panel overflow-hidden hover:border-accent transition hover:scale-[1.02]"
          >
            <div className="relative aspect-[4/5] bg-panel2">
              <Image
                src={m.imageUrl}
                alt={m.name}
                fill
                sizes="(max-width: 768px) 45vw, 240px"
                className="object-contain group-hover:scale-105 transition"
              />
            </div>
            <div className="p-3">
              <div className="font-bold text-sm truncate">{m.name}</div>
              <div
                className="text-[10px] uppercase tracking-wide mt-0.5"
                style={{ color: m.modeColor }}
              >
                {m.modeName}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
