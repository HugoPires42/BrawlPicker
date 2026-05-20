"use client";
import Image from "next/image";
import type { GameMap } from "@/lib/types";

type Props = { map: GameMap | null; onClick: () => void };

export default function MapButton({ map, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 w-full card hover:border-accent transition text-left"
    >
      {map ? (
        <>
          <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-panel2 ring-1 ring-border shrink-0">
            <Image
              src={map.imageUrl}
              alt={map.name}
              fill
              sizes="64px"
              className="object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{map.name}</div>
            <div
              className="text-[11px] uppercase tracking-wide"
              style={{ color: map.modeColor }}
            >
              {map.modeName}
            </div>
          </div>
          <div className="text-muted text-sm group-hover:text-accent">
            changer
          </div>
        </>
      ) : (
        <>
          <div className="w-16 h-16 rounded-lg bg-panel2 flex items-center justify-center text-2xl text-muted">
            ?
          </div>
          <div className="flex-1">
            <div className="font-semibold">Choisir une map</div>
            <div className="text-xs text-muted">
              Filtre les recommandations selon la map ranked
            </div>
          </div>
        </>
      )}
    </button>
  );
}
