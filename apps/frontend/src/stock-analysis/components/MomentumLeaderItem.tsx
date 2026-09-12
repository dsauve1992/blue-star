import { useState } from "react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";
import type { SectorStatus } from "src/sector-rotation/api/sector-rotation.client";
import { getQuadrantColor } from "../utils/sector-utils";
import { getIndustryGroupQuadrant } from "../utils/industry-group-utils";

function getTickerLogoUrl(symbol: string): string {
  return `https://images.financialmodelingprep.com/symbol/${symbol}.png`;
}

function getRsRatingColor(rsRating: number): string {
  if (rsRating >= 80)
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
  if (rsRating >= 50)
    return "bg-amber-500/20 text-amber-400 border-amber-500/30";
  return "bg-slate-500/20 text-slate-400 border-slate-500/30";
}

function formatPerf(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;
}

const CONSOLIDATING_BADGE =
  "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30";

interface MomentumLeaderItemProps {
  leader: MomentumLeader;
  isSelected: boolean;
  industryGroupStatuses: SectorStatus[];
  rsRating?: number;
  industryGroupRsRating?: number | null;
  onSelect: (tickerFullName: string) => void;
}

export function MomentumLeaderItem({
  leader,
  isSelected,
  industryGroupStatuses,
  rsRating,
  industryGroupRsRating,
  onSelect,
}: MomentumLeaderItemProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const tickerFullName = leaderTickerFullName(leader);
  const groupQuadrant = getIndustryGroupQuadrant(
    leader.industryGroup,
    industryGroupStatuses,
  );

  return (
    <div
      onClick={() => onSelect(tickerFullName)}
      className={`
        group relative flex items-center overflow-hidden rounded-lg cursor-pointer
        transition-all duration-200 ease-out
        ${
          isSelected
            ? "border border-blue-500/50 shadow-md shadow-blue-500/10"
            : "border border-transparent hover:border-slate-600/50"
        }
      `}
    >
      {!logoFailed ? (
        <>
          <img
            src={getTickerLogoUrl(leader.symbol)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-80 pointer-events-none"
            onError={() => setLogoFailed(true)}
          />
          <div
            className={`absolute inset-0 pointer-events-none ${
              isSelected
                ? "bg-gradient-to-r from-slate-900 via-slate-900/92 to-blue-900/40"
                : "bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-800/70"
            }`}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold text-slate-600/40 select-none">
            {leader.symbol.slice(0, 3)}
          </span>
        </div>
      )}

      <div className="relative z-10 flex-1 min-w-0 p-2">
        <div className="flex items-center gap-1 flex-wrap">
          <span
            className={`font-semibold text-xs truncate ${isSelected ? "text-white" : "text-slate-100"}`}
          >
            {leader.symbol}
          </span>
          {leader.consolidatingDaily && (
            <span className={CONSOLIDATING_BADGE} title="Consolidating (daily)">
              D
            </span>
          )}
          {leader.consolidatingWeekly && (
            <span
              className={CONSOLIDATING_BADGE}
              title="Consolidating (weekly)"
            >
              W
            </span>
          )}
        </div>
        <div className="flex gap-1.5 text-[10px] font-mono text-slate-400 mt-0.5">
          <span
            className={leader.top1M ? "text-emerald-400" : undefined}
            title="1-month performance"
          >
            {formatPerf(leader.perf1M)}
          </span>
          <span
            className={leader.top3M ? "text-emerald-400" : undefined}
            title="3-month performance"
          >
            {formatPerf(leader.perf3M)}
          </span>
          <span
            className={leader.top6M ? "text-emerald-400" : undefined}
            title="6-month performance"
          >
            {formatPerf(leader.perf6M)}
          </span>
          <span
            className="ml-auto text-slate-300"
            title="Average daily range (14d)"
          >
            ADR {leader.adrPct.toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-wrap gap-0.5 mt-1">
          {rsRating !== undefined && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getRsRatingColor(rsRating)}`}
              title="Market-wide RS rating (1-99)"
            >
              RS {rsRating}
            </span>
          )}
          {industryGroupRsRating != null && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getRsRatingColor(industryGroupRsRating)}`}
              title={
                leader.industryGroup
                  ? `RS ${industryGroupRsRating} within ${leader.industryGroup}`
                  : "Industry-group RS rating (1-99)"
              }
            >
              IG {industryGroupRsRating}
            </span>
          )}
          {leader.industryGroup && groupQuadrant && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${getQuadrantColor(groupQuadrant)}`}
              title={leader.industryGroup}
            >
              {groupQuadrant}
            </span>
          )}
          {leader.themes.length > 0 && (
            <>
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-[80px]"
                title={leader.themes[0]}
              >
                {leader.themes[0]}
              </span>
              {leader.themes.length > 1 && (
                <span className="inline-flex items-center px-1 py-0.5 rounded text-[10px] font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50">
                  +{leader.themes.length - 1}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      {isSelected && (
        <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 w-1 h-5 bg-gradient-to-b from-blue-400 to-purple-500 rounded-l-full" />
      )}
    </div>
  );
}
