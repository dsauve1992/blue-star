import { useCallback, useMemo, useState } from "react";
import type { Time } from "lightweight-charts";
import { ChevronDown, RefreshCw } from "lucide-react";
import { Button, LoadingSpinner } from "src/global/design-system";
import { useRsBenchmarkChart } from "src/market-data/hooks/use-rs-benchmark-chart";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import { useCompanyProfile } from "src/market-data/hooks/use-company-profile";
import { useIndustryGroupSymbol } from "src/sector-rotation/hooks/use-industry-group-symbol";
import { useIndustryGroupQuadrantHistory } from "src/sector-rotation/hooks/use-industry-group-quadrant-history";
import { buildQuadrantSegments } from "src/stock-analysis/utils/quadrant-segments";
import { getQuadrantColor } from "src/sector-rotation/utils/sector-utils";
import type { QuadrantType } from "src/sector-rotation/api/sector-rotation.client";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import {
  MAIN_CHART_TIMEFRAME_OPTIONS,
  type ChartInterval,
} from "src/market-data/api/chart-data.client";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { FinancialReportChartFooter } from "src/fundamental/components/FinancialReportChartFooter";
import { AddToWatchlistButton } from "src/watchlist/components/AddToWatchlistButton";
import {
  useWatchlists,
  useAddTickerToWatchlist,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
} from "src/watchlist/hooks/use-watchlists";

interface IndustryGroupMemberDetailProps {
  symbol: string;
  exchange: string;
  industryGroup: string;
  quadrant: QuadrantType | null;
}

export function IndustryGroupMemberDetail({
  symbol,
  exchange,
  industryGroup,
  quadrant,
}: IndustryGroupMemberDetailProps) {
  const tickerFullName = `${exchange}:${symbol}`;
  const [interval, setInterval] = useState<ChartInterval>("D");
  const [includeExtendedHours, setIncludeExtendedHours] = useState(true);
  const [showFinancialFooter, setShowFinancialFooter] = useState(true);
  const [showQuadrantBackground, setShowQuadrantBackground] = useState(true);

  const movingAverages = useMemo(
    () => getDefaultMovingAverages(interval),
    [interval],
  );

  const { data: profileData } = useCompanyProfile(symbol);

  const groupSymbol = useIndustryGroupSymbol(industryGroup);
  const {
    candles,
    isLoading: chartLoading,
    error: chartError,
    refetch: refetchChart,
    loadMore,
    isLoadingMore,
    rs,
    visibleBars,
  } = useRsBenchmarkChart({
    symbol,
    exchange,
    groupSymbol,
    groupLabel: industryGroup,
    interval,
    includeExtendedHours,
  });

  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
    refetch: refetchFinancials,
  } = useFinancialReport(symbol);

  const { data: watchlistsData } = useWatchlists();
  const addTickerToWatchlist = useAddTickerToWatchlist();
  const removeTickerFromWatchlist = useRemoveTickerFromWatchlist();
  const createWatchlist = useCreateWatchlist();

  const handleToggleWatchlist = useCallback(
    async (watchlistId: string, isTickerInWatchlist: boolean) => {
      const tickerToUse =
        watchlistsData?.watchlists
          .find((w) => w.id === watchlistId)
          ?.tickers.find((t) => t === tickerFullName || t === symbol) ||
        tickerFullName;
      if (isTickerInWatchlist) {
        await removeTickerFromWatchlist.mutateAsync({
          watchlistId,
          ticker: tickerToUse,
        });
      } else {
        await addTickerToWatchlist.mutateAsync({
          watchlistId,
          request: { ticker: tickerFullName },
        });
      }
    },
    [
      symbol,
      tickerFullName,
      watchlistsData,
      addTickerToWatchlist,
      removeTickerFromWatchlist,
    ],
  );

  const handleCreateWatchlist = useCallback(
    async (name: string) => {
      const response = await createWatchlist.mutateAsync({ name });
      await addTickerToWatchlist.mutateAsync({
        watchlistId: response.watchlistId,
        request: { ticker: tickerFullName },
      });
    },
    [tickerFullName, createWatchlist, addTickerToWatchlist],
  );

  const chartStartDate =
    typeof candles?.[0]?.time === "string" ? candles[0].time : undefined;
  const chartEndDate =
    typeof candles?.[candles.length - 1]?.time === "string"
      ? (candles[candles.length - 1].time as string)
      : undefined;
  const { data: quadrantHistory } = useIndustryGroupQuadrantHistory(
    industryGroup,
    chartStartDate,
    chartEndDate,
  );
  const quadrantSegments = useMemo(
    () =>
      buildQuadrantSegments(
        quadrantHistory ?? [],
        (candles ?? []).map((c) => c.time as Time),
      ),
    [quadrantHistory, candles],
  );

  return (
    <div className="h-full flex flex-col min-h-0 min-w-0">
      <header className="relative z-30 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5 border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-xl">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <h2 className="text-xl font-bold text-white">{symbol}</h2>
          {profileData?.profile?.sector && (
            <span className="text-xs text-slate-400">
              {profileData.profile.sector}
              {profileData.profile.industry && (
                <span className="text-slate-500">
                  {" "}
                  · {profileData.profile.industry}
                </span>
              )}
            </span>
          )}
          {quadrant && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border ${getQuadrantColor(quadrant)}`}
            >
              {quadrant}
            </span>
          )}
        </div>
        <AddToWatchlistButton
          ticker={tickerFullName}
          watchlists={watchlistsData?.watchlists ?? []}
          onToggleWatchlist={handleToggleWatchlist}
          onCreateWatchlist={handleCreateWatchlist}
          isAddingToWatchlist={addTickerToWatchlist.isPending}
          isRemovingFromWatchlist={removeTickerFromWatchlist.isPending}
          isCreatingWatchlist={createWatchlist.isPending}
        />
      </header>

      <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-1 gap-1 overflow-y-auto md:overflow-hidden">
        <div className="flex-1 min-h-[280px] md:min-h-0 rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : chartError ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-red-400 text-sm">
              Failed to load chart data
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchChart()}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : candles ? (
            <TechnicalChart
              candles={candles}
              ticker={symbol}
              exchange={exchange}
              movingAverages={movingAverages}
              visibleBars={visibleBars}
              volume={{ show: true }}
              showTradingView
              rs={rs}
              timeframe={{
                value: interval,
                onChange: setInterval,
                options: MAIN_CHART_TIMEFRAME_OPTIONS,
              }}
              extendedHours={{
                includeExtendedHours,
                onIncludeExtendedHoursChange: setIncludeExtendedHours,
              }}
              quadrantBackground={{
                segments: quadrantSegments,
                show: showQuadrantBackground,
                onShowChange: setShowQuadrantBackground,
              }}
              onLoadMore={loadMore}
              isLoadingMore={isLoadingMore}
            />
          ) : null}
        </div>

        <div className="flex-shrink-0">
          <button
            onClick={() => setShowFinancialFooter(!showFinancialFooter)}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors duration-150"
            aria-expanded={showFinancialFooter}
            aria-label={
              showFinancialFooter
                ? "Hide financial data"
                : "Show financial data"
            }
          >
            <span>{showFinancialFooter ? "Hide" : "Show"} Financials</span>
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
              onRetry={() => refetchFinancials()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
