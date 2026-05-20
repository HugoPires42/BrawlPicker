"use client";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Brawler } from "@/lib/types";

type Props = {
  brawlers: Brawler[];
  selected: string[];
  onChange: (next: string[]) => void;
  max?: number;
  label?: string;
  placeholder?: string;
  excluded?: Set<string>;
};

export default function BrawlerPicker({
  brawlers,
  selected,
  onChange,
  max = 6,
  label,
  placeholder = "Cherche un brawler…",
  excluded,
}: Props) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const byCube = useMemo(
    () => new Map(brawlers.map((b) => [b.cubeName, b])),
    [brawlers]
  );

  const filtered = useMemo(() => {
    const sel = new Set(selected);
    const ql = q.trim().toLowerCase();
    return brawlers
      .filter((b) => !sel.has(b.cubeName))
      .filter((b) => !excluded || !excluded.has(b.cubeName))
      .filter((b) => !ql || b.name.toLowerCase().includes(ql))
      .slice(0, 30);
  }, [brawlers, q, selected, excluded]);

  const add = (cubeName: string) => {
    if (selected.includes(cubeName) || selected.length >= max) return;
    onChange([...selected, cubeName]);
    setQ("");
  };
  const remove = (cubeName: string) =>
    onChange(selected.filter((n) => n !== cubeName));

  return (
    <div ref={wrapRef} className="relative">
      {label && (
        <label className="block text-xs uppercase text-muted mb-1">{label}</label>
      )}
      <div className="card flex flex-wrap gap-2 items-center">
        {selected.map((cn) => {
          const b = byCube.get(cn);
          return (
            <span key={cn} className="chip">
              {b && (
                <Image
                  src={b.imageUrl}
                  alt=""
                  width={20}
                  height={20}
                  className="rounded-full"
                />
              )}
              <span>{b?.name ?? cn}</span>
              <button
                onClick={() => remove(cn)}
                className="ml-1 text-muted hover:text-bad"
                aria-label="Retirer"
              >
                ×
              </button>
            </span>
          );
        })}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={
            selected.length >= max
              ? `Max ${max} brawlers`
              : selected.length === 0
                ? placeholder
                : ""
          }
          disabled={selected.length >= max}
          className="flex-1 min-w-[120px] bg-transparent outline-none text-sm placeholder:text-muted"
        />
      </div>

      {open && filtered.length > 0 && selected.length < max && (
        <div className="absolute z-30 mt-1 w-full max-h-72 overflow-auto bg-panel border border-border rounded-xl shadow-lg">
          {filtered.map((b) => (
            <button
              key={b.id}
              onClick={() => add(b.cubeName)}
              className="w-full flex items-center gap-3 px-3 py-2 hover:bg-panel2 text-left"
            >
              <Image
                src={b.imageUrl}
                alt=""
                width={28}
                height={28}
                className="rounded-full"
              />
              <span className="text-sm">{b.name}</span>
              <span className="ml-auto text-[11px] text-muted">{b.rarity}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
