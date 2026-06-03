"use client";
import { useI18n } from "./I18nProvider";

export type ViewMode = "raw" | "delta";

type Props = {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
};

export default function ViewModeToggle({ value, onChange }: Props) {
  const { t } = useI18n();
  const modes: { key: ViewMode; labelKey: "view.raw" | "view.delta"; helpKey: "view.help.raw" | "view.help.delta" }[] = [
    { key: "raw", labelKey: "view.raw", helpKey: "view.help.raw" },
    { key: "delta", labelKey: "view.delta", helpKey: "view.help.delta" },
  ];
  return (
    <div className="flex items-center bg-panel2 rounded-md border border-border overflow-hidden">
      {modes.map((m, i) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            title={t(m.helpKey)}
            className={
              "px-2.5 py-1 text-xs font-medium transition " +
              (active ? "bg-accent text-black" : "text-muted hover:text-white") +
              (i === 0 ? " border-r border-border" : "")
            }
            aria-pressed={active}
          >
            {t(m.labelKey)}
          </button>
        );
      })}
    </div>
  );
}
