type Props = { value: number; baseline?: number };

export default function WrBar({ value, baseline = 0.5 }: Props) {
  const pct = Math.max(0, Math.min(1, value));
  const above = pct >= baseline;
  const w = `${(pct * 100).toFixed(1)}%`;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs">
        <span className={above ? "text-good" : "text-bad"}>
          {(pct * 100).toFixed(1)}%
        </span>
      </div>
      <div className="h-1.5 bg-panel2 rounded-full overflow-hidden mt-1">
        <div
          className={above ? "bg-good h-full" : "bg-bad h-full"}
          style={{ width: w }}
        />
      </div>
    </div>
  );
}
