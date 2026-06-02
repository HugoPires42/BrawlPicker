"use client";
import Image from "next/image";
import type { GameMode } from "@/lib/types";
import { useI18n } from "./I18nProvider";

type Props = {
  modes: GameMode[];
  onPick: (mode: GameMode) => void;
};

export default function ModePicker({ modes, onPick }: Props) {
  const { t } = useI18n();
  return (
    <div>
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">
          {t("mode.title")}
        </h1>
        <p className="text-muted text-sm mt-1">{t("mode.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {modes.map((m) => (
          <button
            key={m.cube}
            onClick={() => onPick(m)}
            className="group relative rounded-2xl border-2 border-border bg-panel overflow-hidden transition hover:scale-[1.02] hover:border-transparent"
            style={
              {
                "--mode-color": m.color,
              } as React.CSSProperties
            }
          >
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition pointer-events-none"
              style={{
                background: `linear-gradient(135deg, ${m.color}30, transparent 60%)`,
                boxShadow: `inset 0 0 0 2px ${m.color}`,
              }}
            />
            <div
              className="relative aspect-[16/9] bg-panel2 flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${m.color}25, ${m.color}05)`,
              }}
            >
              <Image
                src={m.imageUrl}
                alt={m.name}
                width={120}
                height={120}
                className="drop-shadow-lg object-contain max-h-[90%]"
                unoptimized
              />
            </div>
            <div className="relative p-3">
              <div className="font-bold text-base" style={{ color: m.color }}>
                {m.name}
              </div>
              <div className="text-[11px] text-muted">
                {m.mapCount}{" "}
                {t(
                  m.mapCount > 1
                    ? "mode.mapCount.many"
                    : "mode.mapCount.one"
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
