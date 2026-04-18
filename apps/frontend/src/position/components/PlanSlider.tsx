export type PlanSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
};

export function PlanSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: PlanSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <span>{label}</span>
        <span className="font-mono text-slate-900 dark:text-slate-100 tabular-nums">
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        className="w-full h-2 accent-blue-600 rounded-full appearance-none bg-slate-200 dark:bg-slate-700 cursor-pointer"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}
