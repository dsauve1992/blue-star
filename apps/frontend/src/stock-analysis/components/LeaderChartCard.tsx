import { memo, useRef, type RefObject } from "react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";
import { useInViewOnce } from "../hooks/use-in-view-once";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import { LoadingSpinner } from "src/global/design-system";

const GRID_CHART_BARS = 200;
const GRID_VISIBLE_BARS = 130;
const GRID_MOVING_AVERAGES = getDefaultMovingAverages("D");

interface LeaderChartCardProps {
  leader: MomentumLeader;
  rsRating?: number;
  scrollRootRef: RefObject<HTMLElement | null>;
  isSelected?: boolean;
  onOpen: (tickerFullName: string) => void;
}

function LeaderChartCardInner({
  leader,
  rsRating,
  scrollRootRef,
  isSelected = false,
  onOpen,
}: LeaderChartCardProps) {
  const tickerFullName = leaderTickerFullName(leader);
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInViewOnce(cardRef, scrollRootRef);
  const { candles, error } = useChartData(
    inView ? leader.symbol : null,
    inView ? leader.exchange : null,
    "D",
    GRID_CHART_BARS,
  );

  return (
    <div
      ref={cardRef}
      data-ticker={tickerFullName}
      className={`flex flex-col h-80 rounded-xl overflow-hidden border bg-slate-800/30 transition-colors duration-150 ${
        isSelected
          ? "border-blue-400 ring-1 ring-blue-400/60"
          : "border-slate-700/50 hover:border-blue-500/50"
      }`}
    >
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-700/50 text-xs">
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
        {leader.industryGroup && (
          <span className="ml-auto min-w-0 truncate text-slate-500">
            {leader.industryGroup}
          </span>
        )}
      </div>
      <div className="relative flex-1 min-h-0">
        {error ? (
          <div className="h-full flex items-center justify-center text-red-400 text-sm">
            Failed to load chart data
          </div>
        ) : candles ? (
          <TechnicalChart
            candles={candles}
            ticker={leader.symbol}
            exchange={leader.exchange}
            movingAverages={GRID_MOVING_AVERAGES}
            visibleBars={GRID_VISIBLE_BARS}
            volume={{ show: true }}
            showTooltip={false}
            showExport={false}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner />
          </div>
        )}
        <button
          type="button"
          onClick={() => onOpen(tickerFullName)}
          aria-pressed={isSelected}
          className="absolute inset-0 z-10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400"
          aria-label={`Open ${leader.symbol} chart`}
        />
      </div>
    </div>
  );
}

export const LeaderChartCard = memo(LeaderChartCardInner);
