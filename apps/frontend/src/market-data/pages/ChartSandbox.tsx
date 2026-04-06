import { useState, useCallback, useMemo } from "react";
import { PageContainer } from "src/global/design-system";
import { TechnicalChart } from "src/market-data/components/TechnicalChart";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import type { ChartInterval } from "src/market-data/api/chart-data.client";

const DEMO_SYMBOL = "PL";
const DEMO_EXCHANGE = "NYSE";
const BENCHMARK_SYMBOL = "SPY";
const BENCHMARK_EXCHANGE = "AMEX";

export default function ChartSandbox() {
  const [interval, setInterval] = useState<ChartInterval>("D");

  const bars = interval === "W" ? 156 : 520;

  const { candles, isLoading, error, loadMore, isLoadingMore } = useChartData(
    DEMO_SYMBOL,
    DEMO_EXCHANGE,
    interval,
    bars,
  );
  const {
    candles: spyCandles,
    isLoading: spyLoading,
    error: spyError,
    loadMore: loadMoreSpy,
    isLoadingMore: isLoadingMoreSpy,
  } = useChartData(BENCHMARK_SYMBOL, BENCHMARK_EXCHANGE, interval, bars);

  const movingAverages = useMemo(
    () => getDefaultMovingAverages(interval),
    [interval],
  );

  const loading = isLoading || spyLoading;
  const hasError = error || spyError;

  const handleLoadMore = useCallback(() => {
    loadMore();
    loadMoreSpy();
  }, [loadMore, loadMoreSpy]);

  return (
    <PageContainer>
      <div className="h-[calc(100vh-160px)] rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full text-slate-400">
            Loading chart data...
          </div>
        )}
        {!loading && (hasError || !candles || !spyCandles) && (
          <div className="flex items-center justify-center h-full text-red-400">
            Failed to load data. Make sure the backend is running.
          </div>
        )}
        {!loading && candles && spyCandles && (
          <TechnicalChart
            candles={candles}
            ticker={DEMO_SYMBOL}
            movingAverages={movingAverages}
            visibleBars={interval === "W" ? 52 : 130}
            volume={{ show: true, heatmap: false }}
            rs={{
              benchmarkCandles: spyCandles,
              smaPeriod: 50,
              lookback: interval === "W" ? 52 : 260,
              benchmarkLabel: BENCHMARK_SYMBOL,
            }}
            timeframe={{
              value: interval,
              onChange: setInterval,
              options: ["1", "5", "15", "60", "D", "W", "M"],
            }}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore || isLoadingMoreSpy}
          />
        )}
      </div>
    </PageContainer>
  );
}
