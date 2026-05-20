"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { GameMap } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  maps: GameMap[];
  onPick: (m: GameMap) => void;
};

export default function MapPickerModal({ open, onClose, maps, onPick }: Props) {
  const [q, setQ] = useState("");
  const [mode, setMode] = useState("Tous");

  useEffect(() => {
    if (open) {
      setQ("");
      setMode("Tous");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const modes = useMemo(() => {
    const set = new Set<string>();
    for (const m of maps) set.add(m.modeName);
    return ["Tous", ...[...set].sort()];
  }, [maps]);

  const modeColors = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of maps) m.set(x.modeName, x.modeColor);
    return m;
  }, [maps]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return maps.filter((m) => {
      if (mode !== "Tous" && m.modeName !== mode) return false;
      if (ql && !m.name.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [maps, q, mode]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center gap-3">
          <h2 className="text-lg font-bold">Choisis une map ranked</h2>
          <button
            onClick={onClose}
            className="ml-auto text-muted hover:text-white text-2xl leading-none px-2"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>

        <div className="p-4 border-b border-border space-y-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une map…"
            className="input"
          />
          <div className="flex flex-wrap gap-1.5">
            {modes.map((m) => {
              const color = modeColors.get(m);
              const active = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={
                    "px-2.5 py-1 rounded-full text-xs transition border " +
                    (active
                      ? "text-black border-transparent"
                      : "bg-panel2 border-border hover:border-muted text-muted")
                  }
                  style={
                    active && color
                      ? { background: color, borderColor: color }
                      : active
                        ? { background: "#ffb000" }
                        : undefined
                  }
                >
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filtered.map((m) => (
              <button
                key={`${m.modeCube}::${m.id}`}
                onClick={() => {
                  onPick(m);
                  onClose();
                }}
                className="group text-left rounded-xl overflow-hidden border border-border bg-panel2 hover:border-accent transition"
              >
                <div className="relative aspect-[4/3] bg-panel">
                  <Image
                    src={m.imageUrl}
                    alt={m.name}
                    fill
                    sizes="(max-width: 768px) 50vw, 240px"
                    className="object-contain group-hover:scale-105 transition"
                  />
                </div>
                <div className="p-2.5">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div
                    className="text-[10px] uppercase tracking-wide mt-0.5"
                    style={{ color: m.modeColor }}
                  >
                    {m.modeName}
                  </div>
                </div>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-muted py-10">
                Aucune map.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
