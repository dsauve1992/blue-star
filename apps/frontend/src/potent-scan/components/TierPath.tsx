import { cn } from "src/global/design-system";
import type { MemberTierPoint, Tier } from "../api/potent-scan.client";
import { formatSessionDate } from "../utils/format";

const TIER_CELL_CLASS: Record<Tier, string> = {
  Lead: "bg-success-500 dark:bg-success-400",
  Mediocre: "bg-warning-400 dark:bg-warning-500",
  Lag: "bg-danger-500 dark:bg-danger-400",
};

interface TierPathProps {
  dates: string[];
  tiers: MemberTierPoint[];
}

export function TierPath({ dates, tiers }: TierPathProps) {
  const tierByDate = new Map(tiers.map((point) => [point.date, point.tier]));

  return (
    <div className="flex gap-0.5">
      {dates.map((date) => {
        const tier = tierByDate.get(date);
        const label = `${formatSessionDate(date)}: ${tier ?? "no data"}`;
        return (
          <span
            key={date}
            title={label}
            aria-label={label}
            data-date={date}
            data-tier={tier ?? ""}
            className={cn(
              "h-5 w-3 shrink-0 rounded-sm",
              tier
                ? TIER_CELL_CLASS[tier]
                : "border border-dashed border-slate-300 dark:border-slate-600",
            )}
          />
        );
      })}
    </div>
  );
}
