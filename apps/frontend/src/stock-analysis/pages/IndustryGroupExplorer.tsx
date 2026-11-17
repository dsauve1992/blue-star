import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { BarChart3, Layers, RefreshCw } from "lucide-react";
import { PageContainer } from "src/global/design-system/page-container";
import {
  LoadingSpinner,
  Alert,
  AlertDescription,
  Button,
} from "src/global/design-system";
import { useIndustryGroups } from "../hooks/use-industry-groups";
import { useIndustryGroupRatings } from "../hooks/use-industry-group-ratings";
import { useConsolidationKeyboardNavigation } from "../hooks/use-consolidation-keyboard-navigation";
import { useLatestSectorStatus } from "src/sector-rotation/hooks/use-latest-sector-status";
import { useIndustryGroupQuadrantHistory } from "src/sector-rotation/hooks/use-industry-group-quadrant-history";
import {
  getIndustryGroupQuadrant,
  INDUSTRY_GROUP_UNIVERSE_ID,
} from "src/sector-rotation/utils/industry-group-utils";
import { getQuadrantColor } from "src/sector-rotation/utils/sector-utils";
import { IndustryGroupSelector } from "../components/IndustryGroupSelector";
import { ChartGridCard } from "../components/ChartGridCard";
import { IndustryGroupMemberDetail } from "../components/IndustryGroupMemberDetail";
import { formatScanDate } from "../utils/format-scan-date";

// Industry-group RS ratings are keyed only by symbol; we don't track the
// listing exchange. Yahoo (the wired chart-data service) ignores it for
// candle fetches; it only affects the TradingView deep-link target.
const DEFAULT_EXCHANGE = "NASDAQ";

const GRID_QUADRANT_LOOKBACK_DAYS = 300;

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function memberTickerId(symbol: string): string {
  return `${DEFAULT_EXCHANGE}:${symbol}`;
}

export default function IndustryGroupExplorer() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
    refetch: refetchGroups,
  } = useIndustryGroups();

  const firstGroup = groupsData?.groups[0]?.industryGroup ?? null;
  useEffect(() => {
    if (!selectedGroup && firstGroup) setSelectedGroup(firstGroup);
  }, [selectedGroup, firstGroup]);

  const {
    data: ratingsData,
    isLoading: ratingsLoading,
    error: ratingsError,
    refetch: refetchRatings,
  } = useIndustryGroupRatings(selectedGroup);

  const ratings = useMemo(() => ratingsData?.ratings ?? [], [ratingsData]);

  useEffect(() => {
    if (ratings.length === 0) {
      setSelectedSymbol(null);
      return;
    }
    if (!selectedSymbol || !ratings.some((r) => r.symbol === selectedSymbol)) {
      setSelectedSymbol(ratings[0].symbol);
    }
  }, [ratings, selectedSymbol]);

  const handleSelectGroup = useCallback((group: string) => {
    setSelectedGroup(group);
    setSelectedSymbol(null);
  }, []);

  const handleSelectTicker = useCallback((tickerId: string) => {
    setSelectedSymbol(tickerId.split(":")[1] ?? tickerId);
  }, []);

  const tickerGroups = useMemo(
    () => [ratings.map((r) => memberTickerId(r.symbol))],
    [ratings],
  );
  const selectedTicker = selectedSymbol ? memberTickerId(selectedSymbol) : null;

  useConsolidationKeyboardNavigation({
    tickerGroups,
    selectedTicker,
    onTickerChange: handleSelectTicker,
  });

  useEffect(() => {
    if (!selectedTicker) return;
    gridRef.current
      ?.querySelector(`[data-ticker="${CSS.escape(selectedTicker)}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selectedTicker]);

  const { data: industryGroupStatusData } = useLatestSectorStatus(
    INDUSTRY_GROUP_UNIVERSE_ID,
  );
  const [quadrantHistoryRange] = useState(() => ({
    start: isoDaysAgo(GRID_QUADRANT_LOOKBACK_DAYS),
    end: isoDaysAgo(0),
  }));
  const { data: gridQuadrantHistory } = useIndustryGroupQuadrantHistory(
    selectedGroup,
    quadrantHistoryRange.start,
    quadrantHistoryRange.end,
  );
  const quadrant = industryGroupStatusData?.sectors
    ? getIndustryGroupQuadrant(selectedGroup, industryGroupStatusData.sectors)
    : null;

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full h-[calc(100vh-var(--app-top-offset))] flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="relative z-40 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Layers className="w-3.5 h-3.5" />
            <span>Industry Group</span>
          </div>
          <div className="w-full sm:w-96">
            <IndustryGroupSelector
              groups={groupsData?.groups ?? []}
              selectedGroup={selectedGroup}
              isLoading={groupsLoading}
              onSelect={handleSelectGroup}
            />
          </div>
          {quadrant && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border ${getQuadrantColor(quadrant)}`}
            >
              {quadrant}
            </span>
          )}
          {selectedGroup && ratingsData && (
            <span className="text-xs text-slate-500">
              {ratingsData.ratings.length} members · ranked as of{" "}
              {formatScanDate(ratingsData.computedAt)}
            </span>
          )}
          {groupsError && (
            <div className="flex items-center gap-2 text-xs text-red-400">
              Failed to load industry groups.
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchGroups()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 min-h-0 flex">
          {!selectedGroup ? (
            <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
              <div className="p-6 rounded-full bg-slate-700/30 mb-6">
                <BarChart3 className="w-16 h-16 text-slate-500" />
              </div>
              <h3 className="text-xl font-semibold text-slate-300 mb-2">
                No industry group selected
              </h3>
              <p className="text-slate-500 max-w-md">
                Pick an industry group to see its ranked members.
              </p>
            </div>
          ) : ratingsLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <LoadingSpinner
                label="Loading ratings..."
                className="[&>span]:text-slate-400"
              />
            </div>
          ) : ratingsError ? (
            <div className="flex-1 flex items-center justify-center">
              <Alert variant="danger" className="max-w-md">
                <AlertDescription>
                  Failed to load ratings for this group.
                </AlertDescription>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => refetchRatings()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </Alert>
            </div>
          ) : ratings.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <Alert variant="warning" className="max-w-md">
                <AlertDescription>This group has no members.</AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="flex-1 min-w-0 min-h-0 flex flex-col md:flex-row">
              <div
                key={selectedGroup}
                ref={gridRef}
                className="flex-1 min-h-0 md:flex-none md:w-[55%] md:shrink-0 overflow-y-auto px-4 pb-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  {ratings.map((r, idx) => {
                    const tickerId = memberTickerId(r.symbol);
                    return (
                      <ChartGridCard
                        key={tickerId}
                        symbol={r.symbol}
                        exchange={DEFAULT_EXCHANGE}
                        tickerId={tickerId}
                        quadrantHistory={gridQuadrantHistory}
                        scrollRootRef={gridRef}
                        isSelected={tickerId === selectedTicker}
                        onOpen={handleSelectTicker}
                        header={
                          <>
                            <span className="shrink-0 w-6 font-mono text-slate-500 tabular-nums">
                              #{idx + 1}
                            </span>
                            <span className="shrink-0 font-semibold text-sm text-white">
                              {r.symbol}
                            </span>
                            <span className="shrink-0 whitespace-nowrap font-mono text-emerald-400">
                              RS {r.rsRating}
                            </span>
                          </>
                        }
                      />
                    );
                  })}
                </div>
              </div>

              <aside className="order-first h-[55vh] shrink-0 md:order-none md:h-auto md:flex-1 md:shrink min-w-0 border-b md:border-b-0 md:border-l border-slate-700/50 bg-slate-900/30">
                {selectedSymbol ? (
                  <IndustryGroupMemberDetail
                    symbol={selectedSymbol}
                    exchange={DEFAULT_EXCHANGE}
                    industryGroup={selectedGroup}
                    quadrant={quadrant}
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                    <BarChart3 className="w-10 h-10 text-slate-600" />
                    <p className="text-sm text-slate-400">
                      Select a chart to see its details
                    </p>
                  </div>
                )}
              </aside>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
