import { useCallback } from "react";
import { ChevronUp, ChevronDown, BarChart3 } from "lucide-react";
import { Button } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import {
  leaderTickerFullName,
  type MomentumLeader,
  type MomentumLeadersResponse,
} from "../api/momentum-leaders.client";
import type { SectorStatus } from "src/sector-rotation/api/sector-rotation.client";
import { MomentumLeaderItem } from "./MomentumLeaderItem";
import {
  LEADER_SORT_OPTIONS,
  type LeaderRsRatings,
  type LeaderSortKey,
} from "../hooks/use-sorted-leaders";

const SELECT_CHEVRON_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "1rem",
};

interface MomentumLeadersSidebarProps {
  leaders: MomentumLeader[];
  rsBySymbol: Map<string, LeaderRsRatings>;
  sortKey: LeaderSortKey;
  onSortChange: (key: LeaderSortKey) => void;
  selectedTicker: string | null;
  industryGroupStatuses: SectorStatus[];
  currentIndex: number;
  isLoading: boolean;
  error: Error | null;
  data: MomentumLeadersResponse | undefined;
  isRunningScan: boolean;
  onTickerSelect: (tickerFullName: string) => void;
  onNavigate: (direction: "up" | "down") => void;
  onRunScan: () => void;
  tickerRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function MomentumLeadersSidebar({
  leaders,
  rsBySymbol,
  sortKey,
  onSortChange,
  selectedTicker,
  industryGroupStatuses,
  currentIndex,
  isLoading,
  error,
  data,
  isRunningScan,
  onTickerSelect,
  onNavigate,
  onRunScan,
  tickerRefs,
  listContainerRef,
}: MomentumLeadersSidebarProps) {
  const setTickerRef = useCallback(
    (ticker: string, el: HTMLDivElement | null) => {
      if (el) {
        tickerRefs.current.set(ticker, el);
      } else {
        tickerRefs.current.delete(ticker);
      }
    },
    [tickerRefs],
  );

  const hasData = (data?.count ?? 0) > 0;

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
      <div className="p-3 border-b border-slate-700/50 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">
              Momentum Leaders
            </h1>
            <p className="text-[10px] text-slate-400">
              Top 2% by 1M / 3M / 6M performance
            </p>
          </div>
        </div>
        <label className="block">
          <span className="block text-[10px] text-slate-500 mb-0.5">
            Sort by
          </span>
          <select
            value={sortKey}
            onChange={(e) => onSortChange(e.target.value as LeaderSortKey)}
            className="w-full appearance-none rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 pr-8 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
            style={SELECT_CHEVRON_STYLE}
          >
            {LEADER_SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasData && data && (
        <div className="px-3 py-2 border-b border-slate-700/50 bg-slate-900/30 space-y-0.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Leaders</span>
            <span className="font-semibold text-white">
              {data.count}
              <span className="text-slate-500 font-normal">
                {" "}
                / {data.universeSize}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Consolidating</span>
            <span className="font-semibold text-purple-300">
              {data.consolidatingCount}
            </span>
          </div>
          {data.scanDate && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Scan</span>
              <span className="text-slate-300">{data.scanDate}</span>
            </div>
          )}
        </div>
      )}

      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
        tabIndex={0}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <LoadingSpinner />
            <span className="text-sm text-slate-400">Loading leaders...</span>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="m-2">
            <AlertDescription>
              Failed to load momentum leaders. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && !hasData && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Alert variant="warning" className="mb-4">
              <AlertDescription>No scan has been run yet.</AlertDescription>
            </Alert>
            <Button
              variant="default"
              onClick={onRunScan}
              disabled={isRunningScan}
              className="mt-2"
            >
              {isRunningScan ? "Running Scan..." : "Run Scan Now"}
            </Button>
          </div>
        )}

        {!isLoading &&
          !error &&
          hasData &&
          leaders.map((leader) => {
            const tickerFullName = leaderTickerFullName(leader);
            const rs = rsBySymbol.get(leader.symbol);
            return (
              <div
                key={tickerFullName}
                ref={(el) => setTickerRef(tickerFullName, el)}
              >
                <MomentumLeaderItem
                  leader={leader}
                  isSelected={selectedTicker === tickerFullName}
                  industryGroupStatuses={industryGroupStatuses}
                  rsRating={rs?.rsRating}
                  industryGroupRsRating={rs?.industryGroupRsRating ?? null}
                  onSelect={onTickerSelect}
                />
              </div>
            );
          })}
      </div>

      {hasData && leaders.length > 0 && (
        <div className="p-2 border-t border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => onNavigate("up")}
              disabled={currentIndex <= 0}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
                    bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              <ChevronUp className="w-3.5 h-3.5" />
              Prev
            </button>
            <span className="text-[10px] text-slate-500 min-w-[48px] text-center">
              {currentIndex + 1}/{leaders.length}
            </span>
            <button
              onClick={() => onNavigate("down")}
              disabled={currentIndex >= leaders.length - 1}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium
                    bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white
                    disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              Next
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 text-center mt-1">
            ↑↓ to navigate
          </p>
        </div>
      )}
    </aside>
  );
}
