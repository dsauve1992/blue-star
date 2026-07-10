import { useEffect, useMemo, useState, useCallback } from "react";
import { BarChart3, ChevronDown } from "lucide-react";
import { ChevronUp, Layers } from "lucide-react";
import { PageContainer } from "src/global/design-system/page-container";
import {
  LoadingSpinner,
  Alert,
  AlertDescription,
} from "src/global/design-system";
import { useIndustryGroups } from "../hooks/use-industry-groups";
import { useIndustryGroupRatings } from "../hooks/use-industry-group-ratings";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import { useCompanyProfile } from "src/market-data/hooks/use-company-profile";
import { useLatestSectorStatus } from "src/sector-rotation/hooks/use-latest-sector-status";
import { useIndustryGroupSymbol } from "src/sector-rotation/hooks/use-industry-group-symbol";
import { useIndustryGroupQuadrantHistory } from "src/sector-rotation/hooks/use-industry-group-quadrant-history";
import { buildQuadrantSegments } from "src/stock-analysis/utils/quadrant-segments";
import {
  buildRsBenchmarks,
  GROUP_BENCHMARK_EXCHANGE,
} from "src/market-data/utils/rs-benchmarks";
import {
  getIndustryGroupQuadrant,
  INDUSTRY_GROUP_UNIVERSE_ID,
} from "src/stock-analysis/utils/industry-group-utils";
import { getQuadrantColor } from "src/stock-analysis/utils/sector-utils";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import {
  MAIN_CHART_TIMEFRAME_OPTIONS,
  type ChartInterval,
} from "src/market-data/api/chart-data.client";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { FinancialReportChartFooter } from "src/stock-analysis/components/FinancialReportChartFooter";
import { IndustryGroupSelector } from "../components/IndustryGroupSelector";
import { IndustryGroupListItem } from "../components/IndustryGroupListItem";

const BENCHMARK_SYMBOL = "SPY";
const BENCHMARK_EXCHANGE = "AMEX";
// Industry-group RS ratings are keyed only by symbol; we don't track the
// listing exchange. Yahoo (the wired chart-data service) ignores it for
// candle fetches; it only affects the TradingView deep-link target.
const DEFAULT_EXCHANGE = "NASDAQ";

export default function IndustryGroupExplorer() {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [interval, setInterval] = useState<ChartInterval>("D");
  const [includeExtendedHours, setIncludeExtendedHours] = useState(true);
  const [showFinancialFooter, setShowFinancialFooter] = useState(true);
  const [showQuadrantBackground, setShowQuadrantBackground] = useState(true);

  const {
    data: groupsData,
    isLoading: groupsLoading,
    error: groupsError,
  } = useIndustryGroups();

  const {
    data: ratingsData,
    isLoading: ratingsLoading,
    error: ratingsError,
  } = useIndustryGroupRatings(selectedGroup);

  // Auto-select first ticker when group changes / data loads.
  useEffect(() => {
    if (!ratingsData?.ratings || ratingsData.ratings.length === 0) {
      setSelectedSymbol(null);
      return;
    }
    const symbols = ratingsData.ratings.map((r) => r.symbol);
    if (!selectedSymbol || !symbols.includes(selectedSymbol)) {
      setSelectedSymbol(symbols[0]);
    }
  }, [ratingsData, selectedSymbol]);

  const handleSelectGroup = useCallback((group: string) => {
    setSelectedGroup(group);
    setSelectedSymbol(null);
  }, []);

  const movingAverages = useMemo(
    () => getDefaultMovingAverages(interval),
    [interval],
  );
  const bars = interval === "W" ? 156 : 520;

  const { data: profileData } = useCompanyProfile(selectedSymbol);
  const { data: industryGroupStatusData } = useLatestSectorStatus(
    INDUSTRY_GROUP_UNIVERSE_ID,
  );
  const quadrant = industryGroupStatusData?.sectors
    ? getIndustryGroupQuadrant(selectedGroup, industryGroupStatusData.sectors)
    : null;

  const {
    candles,
    isLoading: chartLoading,
    error: chartError,
    loadMore,
    isLoadingMore,
  } = useChartData(
    selectedSymbol,
    selectedSymbol ? DEFAULT_EXCHANGE : null,
    interval,
    bars,
    includeExtendedHours,
  );

  const {
    candles: spyCandles,
    loadMore: loadMoreSpy,
    isLoadingMore: isLoadingMoreSpy,
  } = useChartData(
    BENCHMARK_SYMBOL,
    BENCHMARK_EXCHANGE,
    interval,
    bars,
    includeExtendedHours,
  );

  const groupSymbol = useIndustryGroupSymbol(selectedGroup);
  const { candles: groupCandles, loadMore: loadMoreGroup } = useChartData(
    groupSymbol,
    // Yahoo ignores exchange for the candle fetch; the GICS subindex
    // (^SP500-XXXX) needs none. A truthy placeholder enables the query.
    groupSymbol ? GROUP_BENCHMARK_EXCHANGE : null,
    interval,
    bars,
    includeExtendedHours,
  );

  const handleLoadMore = useCallback(() => {
    loadMore();
    loadMoreSpy();
    loadMoreGroup();
  }, [loadMore, loadMoreSpy, loadMoreGroup]);

  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
  } = useFinancialReport(selectedSymbol);

  const chartStartDate =
    typeof candles?.[0]?.time === "string" ? candles[0].time : undefined;
  const chartEndDate =
    typeof candles?.[candles.length - 1]?.time === "string"
      ? (candles[candles.length - 1].time as string)
      : undefined;
  const { data: quadrantHistory } = useIndustryGroupQuadrantHistory(
    selectedGroup,
    chartStartDate,
    chartEndDate,
  );
  const quadrantSegments = useMemo(
    () =>
      buildQuadrantSegments(
        quadrantHistory ?? [],
        candles?.[0]?.time,
        candles?.[candles.length - 1]?.time,
      ),
    [quadrantHistory, candles],
  );

  const ratings = ratingsData?.ratings ?? [];
  const currentIndex = ratings.findIndex((r) => r.symbol === selectedSymbol);

  const navigate = (direction: "up" | "down") => {
    if (ratings.length === 0) return;
    let newIndex: number;
    if (currentIndex === -1) {
      newIndex = 0;
    } else if (direction === "down") {
      newIndex = Math.min(currentIndex + 1, ratings.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }
    setSelectedSymbol(ratings[newIndex].symbol);
  };

  return (
    <PageContainer fullWidth noPadding>
      <div className="w-full relative min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex flex-col h-screen">
          <div className="flex-1 flex min-h-0">
            <aside className="w-72 flex-shrink-0 border-r border-slate-700/50 bg-slate-800/30 backdrop-blur-xl flex flex-col">
              <div className="px-3 py-2 border-b border-slate-700/50 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Industry Group</span>
                </div>
                <IndustryGroupSelector
                  groups={groupsData?.groups ?? []}
                  selectedGroup={selectedGroup}
                  isLoading={groupsLoading}
                  onSelect={handleSelectGroup}
                />
                {groupsError && (
                  <Alert variant="danger">
                    <AlertDescription>
                      Failed to load industry groups.
                    </AlertDescription>
                  </Alert>
                )}
                {selectedGroup && ratingsData && (
                  <div className="text-[10px] text-slate-500 px-1">
                    {ratingsData.ratings.length} members · ranked as of{" "}
                    {ratingsData.computedAt}
                  </div>
                )}
              </div>

              <div
                className="flex-1 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
                tabIndex={0}
              >
                {!selectedGroup && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div className="p-3 rounded-full bg-slate-700/50 mb-3">
                      <Layers className="w-6 h-6 text-slate-500" />
                    </div>
                    <p className="text-slate-400 text-xs">
                      Pick an industry group to see its ranked members.
                    </p>
                  </div>
                )}

                {selectedGroup && ratingsLoading && (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <LoadingSpinner />
                    <span className="text-sm text-slate-400">
                      Loading ratings...
                    </span>
                  </div>
                )}

                {selectedGroup && ratingsError && (
                  <div className="p-3">
                    <Alert variant="danger">
                      <AlertDescription>
                        Failed to load ratings for this group.
                      </AlertDescription>
                    </Alert>
                  </div>
                )}

                {selectedGroup &&
                  !ratingsLoading &&
                  !ratingsError &&
                  ratings.map((r, idx) => (
                    <IndustryGroupListItem
                      key={r.symbol}
                      symbol={r.symbol}
                      rsRating={r.rsRating}
                      rank={idx + 1}
                      isSelected={selectedSymbol === r.symbol}
                      onSelect={setSelectedSymbol}
                    />
                  ))}
              </div>

              {ratings.length > 0 && (
                <div className="px-3 py-2 border-t border-slate-700/50 bg-slate-900/30">
                  <div className="flex items-center justify-between gap-1">
                    <button
                      onClick={() => navigate("up")}
                      disabled={currentIndex <= 0}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      {currentIndex + 1}/{ratings.length}
                    </span>
                    <button
                      onClick={() => navigate("down")}
                      disabled={currentIndex >= ratings.length - 1}
                      className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-700/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </aside>

            <main className="flex-1 flex flex-col min-w-0">
              <div className="flex-1 flex flex-col min-h-0 p-4 gap-2 overflow-hidden">
                {selectedSymbol && profileData?.profile?.sector && (
                  <div className="flex-shrink-0 flex items-center gap-3 px-1 py-1">
                    <span className="text-xs text-slate-400">
                      {profileData.profile.sector}
                      {profileData.profile.industry && (
                        <span className="text-slate-500">
                          {" "}
                          · {profileData.profile.industry}
                        </span>
                      )}
                    </span>
                    {quadrant && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getQuadrantColor(quadrant)}`}
                      >
                        {quadrant}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex-1 min-h-0">
                  {selectedSymbol ? (
                    <div className="h-full rounded-xl overflow-hidden border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl shadow-2xl">
                      {chartLoading ? (
                        <div className="h-full flex items-center justify-center">
                          <LoadingSpinner />
                        </div>
                      ) : chartError ? (
                        <div className="h-full flex items-center justify-center text-red-400 text-sm">
                          Failed to load chart data
                        </div>
                      ) : candles ? (
                        <TechnicalChart
                          candles={candles}
                          ticker={selectedSymbol}
                          exchange={DEFAULT_EXCHANGE}
                          movingAverages={movingAverages}
                          visibleBars={interval === "W" ? 52 : 130}
                          volume={{ show: true }}
                          showTradingView
                          rs={(() => {
                            const benchmarks = buildRsBenchmarks({
                              spyCandles,
                              spyLabel: BENCHMARK_SYMBOL,
                              groupCandles,
                              groupLabel: selectedGroup,
                            });
                            return benchmarks
                              ? {
                                  benchmarks,
                                  smaPeriod: 50,
                                  lookback: interval === "W" ? 52 : 260,
                                }
                              : undefined;
                          })()}
                          timeframe={{
                            value: interval,
                            onChange: setInterval,
                            options: MAIN_CHART_TIMEFRAME_OPTIONS,
                          }}
                          extendedHours={{
                            includeExtendedHours,
                            onIncludeExtendedHoursChange:
                              setIncludeExtendedHours,
                          }}
                          quadrantBackground={{
                            segments: quadrantSegments,
                            show: showQuadrantBackground,
                            onShowChange: setShowQuadrantBackground,
                          }}
                          onLoadMore={handleLoadMore}
                          isLoadingMore={isLoadingMore || isLoadingMoreSpy}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center rounded-xl border border-slate-700/50 border-dashed bg-slate-800/20">
                      <div className="p-6 rounded-full bg-slate-700/30 mb-6">
                        <BarChart3 className="w-16 h-16 text-slate-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-slate-300 mb-2">
                        No Ticker Selected
                      </h3>
                      <p className="text-slate-500 text-center max-w-md">
                        {selectedGroup
                          ? "Select a ticker from the list on the left."
                          : "Select an industry group to begin."}
                      </p>
                    </div>
                  )}
                </div>

                {selectedSymbol && (
                  <div className="flex-shrink-0">
                    <button
                      onClick={() =>
                        setShowFinancialFooter(!showFinancialFooter)
                      }
                      className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors duration-150 group"
                      aria-expanded={showFinancialFooter}
                      aria-label={
                        showFinancialFooter
                          ? "Hide financial data"
                          : "Show financial data"
                      }
                    >
                      <span className="opacity-70 group-hover:opacity-100 transition-opacity">
                        {showFinancialFooter ? "Hide" : "Show"} Financials
                      </span>
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                          showFinancialFooter ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-200 ease-out ${
                        showFinancialFooter
                          ? "max-h-[500px] opacity-100"
                          : "max-h-0 opacity-0"
                      }`}
                    >
                      <FinancialReportChartFooter
                        report={financialData?.report ?? null}
                        isLoading={financialLoading}
                        error={financialError}
                      />
                    </div>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
