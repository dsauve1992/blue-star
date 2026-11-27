import { cn } from "src/global/design-system";

interface SegmentedControlProps<T extends string> {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-700"
    >
      {options.map((option) => (
        <button
          key={option.id}
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded border-0 px-3 py-1 text-sm font-medium transition-colors duration-150",
            value === option.id
              ? "bg-slate-100 text-slate-900 dark:bg-slate-700 dark:text-slate-50"
              : "bg-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
