import type { LeaderGroup } from "../hooks/use-leader-groups";
import { getQuadrantColor } from "src/sector-rotation/utils/sector-utils";

interface LeaderGroupHeaderProps {
  group: LeaderGroup;
  className?: string;
}

export function LeaderGroupHeader({
  group,
  className = "",
}: LeaderGroupHeaderProps) {
  if (!group.label) return null;

  return (
    <div className={`flex items-center gap-2 min-w-0 text-xs ${className}`}>
      <span className="truncate font-semibold text-slate-200">
        {group.label}
      </span>
      {group.industryGroupRsRating !== null && (
        <span
          className="shrink-0 font-mono text-emerald-400"
          title="Industry group RS rating"
        >
          IG {group.industryGroupRsRating}
        </span>
      )}
      {group.quadrant && (
        <span
          className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getQuadrantColor(group.quadrant)}`}
        >
          {group.quadrant}
        </span>
      )}
      <span className="shrink-0 text-slate-500">
        {group.leaders.length === 1
          ? "1 leader"
          : `${group.leaders.length} leaders`}
      </span>
    </div>
  );
}
