import { useCallback, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  leaderTickerFullName,
  type MomentumLeader,
} from "../api/momentum-leaders.client";
import { useFinancialReport } from "src/fundamental/hooks/use-financial-report";
import {
  useWatchlists,
  useAddTickerToWatchlist,
  useRemoveTickerFromWatchlist,
  useCreateWatchlist,
} from "src/watchlist/hooks/use-watchlists";
import {
  MAIN_CHART_TIMEFRAME_OPTIONS,
  type ChartInterval,
} from "src/market-data/api/chart-data.client";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { useIndustryGroupSymbol } from "src/sector-rotation/hooks/use-industry-group-symbol";
import {
  buildRsBenchmarks,
  GROUP_BENCHMARK_EXCHANGE,
} from "src/market-data/utils/rs-benchmarks";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import { LoadingSpinner } from "src/global/design-system";
import { MomentumLeadersChartHeader } from "./MomentumLeadersChartHeader";
import { FinancialReportChartFooter } from "src/fundamental/components/FinancialReportChartFooter";
import { ChartLoadError } from "./ChartLoadError";

const BENCHMARK_SYMBOL = "SPY";
const BENCHMARK_EXCHANGE = "AMEX";

interface LeaderDetailProps {
  leader: MomentumLeader;
}

export function LeaderDetail({ leader }: LeaderDetailProps) {
  const tickerFullName = leaderTickerFullName(leader);

  const { data: watchlistsData } = useWatchlists();
  const addTickerToWatchlist = useAddTickerToWatchlist();
  const removeTickerFromWatchlist = useRemoveTickerFromWatchlist();
  const createWatchlist = useCreateWatchlist();

  const {
    data: financialData,
    isLoading: financialLoading,
    error: financialError,
    refetch: refetchFinancials,
  } = useFinancialReport(leader.symbol);
  const [showFinancials, setShowFinancials] = useState(true);

  const [interval, setInterval] = useState<ChartInterval>("D");
  const [includeExtendedHours, setIncludeExtendedHours] = useState(true);
  const movingAverages = useMemo(
    () => getDefaultMovingAverages(interval),
    [interval],
  );
  const bars = interval === "W" ? 156 : 520;

  const {
    candles,
    isLoading: chartLoading,
    error: chartError,
    refetch: refetchChart,
    loadMore,
    isLoadingMore,
  } = useChartData(
    leader.symbol,
    leader.exchange,
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
  const groupSymbol = useIndustryGroupSymbol(leader.industryGroup);
  const { candles: groupCandles, loadMore: loadMoreGroup } = useChartData(
    groupSymbol,
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

  const rsBenchmarks = buildRsBenchmarks({
    spyCandles,
    spyLabel: BENCHMARK_SYMBOL,
    groupCandles,
    groupLabel: leader.industryGroup,
  });

  const handleToggleWatchlist = useCallback(
    async (watchlistId: string, isTickerInWatchlist: boolean) => {
      const tickerToUse =
        watchlistsData?.watchlists
          .find((w) => w.id === watchlistId)
          ?.tickers.find((t) => t === tickerFullName || t === leader.symbol) ||
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
      tickerFullName,
      leader.symbol,
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

  return (
    <div className="h-full flex flex-col min-h-0 min-w-0">
      <MomentumLeadersChartHeader
        selectedTicker={tickerFullName}
        selectedLeader={leader}
        watchlists={watchlistsData?.watchlists ?? []}
        onToggleWatchlist={handleToggleWatchlist}
        onCreateWatchlist={handleCreateWatchlist}
        isAddingToWatchlist={addTickerToWatchlist.isPending}
        isRemovingFromWatchlist={removeTickerFromWatchlist.isPending}
        isCreatingWatchlist={createWatchlist.isPending}
      />
      <div className="flex-1 flex flex-col min-h-0 px-4 pt-3 pb-1 gap-1 overflow-y-auto md:overflow-hidden">
        <div className="flex-1 min-h-[280px] md:min-h-0 rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-800/30">
          {chartLoading ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner />
            </div>
          ) : chartError ? (
            <ChartLoadError
              symbol={leader.symbol}
              onRetry={() => refetchChart()}
            />
          ) : candles ? (
            <TechnicalChart
              candles={candles}
              ticker={leader.symbol}
              exchange={leader.exchange}
              movingAverages={movingAverages}
              visibleBars={interval === "W" ? 52 : 130}
              volume={{ show: true }}
              showTradingView
              rs={
                rsBenchmarks
                  ? {
                      benchmarks: rsBenchmarks,
                      smaPeriod: 50,
                      lookback: interval === "W" ? 52 : 260,
                    }
                  : undefined
              }
              timeframe={{
                value: interval,
                onChange: setInterval,
                options: MAIN_CHART_TIMEFRAME_OPTIONS,
              }}
              extendedHours={{
                includeExtendedHours,
                onIncludeExtendedHoursChange: setIncludeExtendedHours,
              }}
              onLoadMore={handleLoadMore}
              isLoadingMore={isLoadingMore || isLoadingMoreSpy}
            />
          ) : null}
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={() => setShowFinancials(!showFinancials)}
            className="w-full flex items-center justify-center gap-1.5 py-1 text-xs text-slate-400 hover:text-slate-200 transition-colors duration-150"
            aria-expanded={showFinancials}
            aria-label={
              showFinancials ? "Hide financial data" : "Show financial data"
            }
          >
            <span>
              {showFinancials ? "Hide" : "Show"} Financials
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ease-out ${
                showFinancials ? "rotate-180" : ""
              }`}
            />
          </button>
          <div
            className={`overflow-hidden transition-all duration-200 ease-out ${
              showFinancials ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
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
