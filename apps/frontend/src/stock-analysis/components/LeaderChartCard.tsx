import { memo, type RefObject } from "react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";
import type { LeaderSortKey } from "../hooks/use-sorted-leaders";
import { ChartGridCard } from "./ChartGridCard";

function perfHorizon(leader: MomentumLeader, sortKey: LeaderSortKey) {
  switch (sortKey) {
    case "perf1M":
      return { label: "1M", value: leader.perf1M };
    case "perf3M":
      return { label: "3M", value: leader.perf3M };
    case "perf6M":
      return { label: "6M", value: leader.perf6M };
    default:
      return null;
  }
}

function perfBadge(leader: MomentumLeader, sortKey: LeaderSortKey) {
  const horizon = perfHorizon(leader, sortKey);
  if (!horizon || !Number.isFinite(horizon.value)) return null;
  const rounded = Number(horizon.value.toFixed(1));
  const sign = rounded < 0 ? "-" : "+";
  return {
    text: `${horizon.label} ${sign}${Math.abs(rounded).toFixed(1)}%`,
    color: rounded < 0 ? "text-red-400" : "text-emerald-400",
  };
}

interface LeaderChartCardProps {
  leader: MomentumLeader;
  rsRating?: number;
  sortKey: LeaderSortKey;
  showIndustryGroup: boolean;
  scrollRootRef: RefObject<HTMLElement | null>;
  isSelected?: boolean;
  onOpen: (tickerFullName: string) => void;
}

function LeaderChartCardInner({
  leader,
  rsRating,
  sortKey,
  showIndustryGroup,
  scrollRootRef,
  isSelected = false,
  onOpen,
}: LeaderChartCardProps) {
  const perf = perfBadge(leader, sortKey);

  return (
    <ChartGridCard
      symbol={leader.symbol}
      exchange={leader.exchange}
      tickerId={leaderTickerFullName(leader)}
      scrollRootRef={scrollRootRef}
      isSelected={isSelected}
      onOpen={onOpen}
      header={
        <>
          <span className="shrink-0 font-semibold text-sm text-white">
            {leader.symbol}
          </span>
          {rsRating !== undefined && (
            <span className="shrink-0 whitespace-nowrap font-mono text-emerald-400">
              RS {rsRating}
            </span>
          )}
          <span className="shrink-0 whitespace-nowrap font-mono text-slate-400">
            ADR {leader.adrPct.toFixed(1)}%
          </span>
          {perf && (
            <span
              className={`shrink-0 whitespace-nowrap font-mono ${perf.color}`}
            >
              {perf.text}
            </span>
          )}
          {showIndustryGroup && leader.industryGroup && (
            <span className="ml-auto min-w-0 truncate text-slate-500">
              {leader.industryGroup}
            </span>
          )}
        </>
      }
    />
  );
}

export const LeaderChartCard = memo(LeaderChartCardInner);
