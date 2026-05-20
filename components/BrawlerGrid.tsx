"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import type { Brawler } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  brawlers: Brawler[];
  onPick: (cubeName: string) => void;
  disabled?: Set<string>;
  title?: string;
};

export default function BrawlerGrid({
  open,
  onClose,
  brawlers,
  onPick,
  disabled,
  title = "Choisis un brawler",
}: Props) {
  const [q, setQ] = useState("");
  const [cls, setCls] = useState<string>("Tous");

  useEffect(() => {
    if (open) {
      setQ("");
      setCls("Tous");
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

  const classes = useMemo(() => {
    const set = new Set<string>();
    for (const b of brawlers) if (b.className) set.add(b.className);
    return ["Tous", ...[...set].sort()];
  }, [brawlers]);

  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return brawlers.filter((b) => {
      if (cls !== "Tous" && b.className !== cls) return false;
      if (ql && !b.name.toLowerCase().includes(ql)) return false;
      return true;
    });
  }, [brawlers, q, cls]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
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
            placeholder="Rechercher…"
            className="input"
          />
          <div className="flex flex-wrap gap-1.5">
            {classes.map((c) => (
              <button
                key={c}
                onClick={() => setCls(c)}
                className={
                  "px-2.5 py-1 rounded-full text-xs transition border " +
                  (cls === c
                    ? "bg-accent text-black border-accent"
                    : "bg-panel2 border-border hover:border-muted text-muted")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-auto p-4">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {filtered.map((b) => {
              const dis = disabled?.has(b.cubeName);
              return (
                <button
                  key={b.id}
                  disabled={dis}
                  onClick={() => {
                    onPick(b.cubeName);
                    onClose();
                  }}
                  className={
                    "group relative flex flex-col items-center gap-1 p-2 rounded-lg border transition " +
                    (dis
                      ? "border-border opacity-30 cursor-not-allowed"
                      : "border-border hover:border-accent hover:bg-panel2")
                  }
                >
                  <div className="relative w-14 h-14 rounded-full overflow-hidden bg-panel2 ring-1 ring-border group-hover:ring-accent">
                    <Image
                      src={b.imageUrl}
                      alt={b.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="text-[11px] font-medium truncate w-full text-center">
                    {b.name}
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-full text-center text-muted py-10">
                Aucun brawler ne correspond.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
