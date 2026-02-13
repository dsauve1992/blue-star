import { useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  BarChart3,
} from "lucide-react";
import { Button } from "src/global/design-system";
import { LoadingSpinner } from "src/global/design-system";
import { Alert, AlertDescription } from "src/global/design-system";
import type {
  ConsolidationResult,
  AnalyzeConsolidationsResponse,
} from "../api/consolidation.client";
import type { SectorStatus } from "src/sector-rotation/api/sector-rotation.client";
import type {
  AnalysisType,
  SectorFilterMode,
} from "../hooks/use-consolidation-selection";
import { ConsolidationTickerItem } from "./ConsolidationTickerItem";

const SELECT_CHEVRON_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "1rem",
};

interface ConsolidationSidebarProps {
  consolidations: ConsolidationResult[];
  selectedTicker: string | null;
  analysisType: AnalysisType;
  sectorFilterMode: SectorFilterMode;
  sectorStatuses: SectorStatus[];
  currentIndex: number;
  isLoading: boolean;
  error: Error | null;
  data: AnalyzeConsolidationsResponse | undefined;
  isRunningAnalysis: boolean;
  onTickerSelect: (tickerFullName: string) => void;
  onNavigate: (direction: "up" | "down") => void;
  onTypeChange: (type: AnalysisType) => void;
  onSectorFilterChange: (mode: SectorFilterMode) => void;
  onRunAnalysis: () => void;
  tickerRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  listContainerRef: React.RefObject<HTMLDivElement | null>;
}

export function ConsolidationSidebar({
  consolidations,
  selectedTicker,
  analysisType,
  sectorFilterMode,
  sectorStatuses,
  currentIndex,
  isLoading,
  error,
  data,
  isRunningAnalysis,
  onTickerSelect,
  onNavigate,
  onTypeChange,
  onSectorFilterChange,
  onRunAnalysis,
  tickerRefs,
  listContainerRef,
}: ConsolidationSidebarProps) {
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

  return (
    <aside className="w-56 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
      {/* Sidebar Header */}
      <div className="p-3 border-b border-slate-700/50 space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-md">
            <BarChart3 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white truncate">
              Consolidation Analysis
            </h1>
            <p className="text-[10px] text-slate-400">Technical patterns</p>
          </div>
        </div>

        {/* Timeframe & Sector Filter */}
        <div className="grid grid-cols-1 gap-2">
          <label className="block">
            <span className="sr-only">Timeframe</span>
            <select
              value={analysisType}
              onChange={(e) => onTypeChange(e.target.value as AnalysisType)}
              className="w-full appearance-none rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 pr-8 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
              style={SELECT_CHEVRON_STYLE}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[10px] text-slate-500 mb-0.5">
              Sector
            </span>
            <select
              value={sectorFilterMode}
              onChange={(e) =>
                onSectorFilterChange(e.target.value as SectorFilterMode)
              }
              className="w-full appearance-none rounded-lg border border-slate-700/50 bg-slate-900/50 px-3 py-1.5 pr-8 text-sm text-slate-200 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/50 cursor-pointer"
              style={SELECT_CHEVRON_STYLE}
            >
              <option value="off">Off</option>
              <option value="filter">Filter</option>
              <option value="highlight">Highlight</option>
            </select>
          </label>
        </div>
      </div>

      {/* Stats Bar */}
      {data?.hasData && (
        <div className="px-3 py-2 border-b border-slate-700/50 bg-slate-900/30">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Signals</span>
            <span className="font-semibold text-white">
              {analysisType === "daily" ? data.dailyCount : data.weeklyCount}
            </span>
          </div>
        </div>
      )}

      {/* Ticker List */}
      <div
        ref={listContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
        tabIndex={0}
      >
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <LoadingSpinner />
            <span className="text-sm text-slate-400">
              Loading consolidations...
            </span>
          </div>
        )}

        {error && (
          <Alert variant="danger" className="m-2">
            <AlertDescription>
              Failed to load consolidation data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading &&
          !error &&
          data?.hasData &&
          consolidations.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="p-4 rounded-full bg-slate-700/50 mb-4">
                <BarChart3 className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-slate-400 text-sm">
                No consolidation signals found for{" "}
                {analysisType === "daily" ? "daily" : "weekly"} timeframe.
              </p>
            </div>
          )}

        {!isLoading && !error && !data?.hasData && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Alert
              variant={data?.runStatus === "failed" ? "danger" : "warning"}
              className="mb-4"
            >
              <AlertDescription>
                {data?.runStatus === "running" && (
                  <>
                    Analysis is currently running. Data will be available
                    shortly.
                  </>
                )}
                {data?.runStatus === "failed" && (
                  <>
                    Analysis failed: {data?.errorMessage || "Unknown error"}.
                  </>
                )}
                {data?.runStatus === "not_found" && (
                  <>No analysis has been run yet for today.</>
                )}
              </AlertDescription>
            </Alert>
            <Button
              variant="default"
              onClick={onRunAnalysis}
              disabled={isRunningAnalysis}
              className="mt-2"
            >
              {isRunningAnalysis ? "Running Analysis..." : "Run Analysis Now"}
            </Button>
          </div>
        )}

        {!isLoading &&
          !error &&
          data?.hasData &&
          consolidations.map((consolidation) => (
            <div
              key={consolidation.symbol}
              ref={(el) =>
                setTickerRef(consolidation.tickerFullName, el)
              }
            >
              <ConsolidationTickerItem
                consolidation={consolidation}
                isSelected={selectedTicker === consolidation.tickerFullName}
                sectorFilterMode={sectorFilterMode}
                sectorStatuses={sectorStatuses}
                onSelect={onTickerSelect}
              />
            </div>
          ))}
      </div>

      {/* Navigation Footer */}
      {data?.hasData && consolidations.length > 0 && (
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
              {currentIndex + 1}/{consolidations.length}
            </span>
            <button
              onClick={() => onNavigate("down")}
              disabled={currentIndex >= consolidations.length - 1}
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
