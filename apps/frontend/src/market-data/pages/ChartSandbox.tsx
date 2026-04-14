import { useState, useCallback, useMemo } from "react";
import { PageContainer } from "src/global/design-system";
import { TechnicalChart, type ChartDrawingTool, type LongPositionSummary } from "src/market-data/components/TechnicalChart";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import { getDefaultMovingAverages } from "src/market-data/utils/chart-utils";
import type { ChartInterval } from "src/market-data/api/chart-data.client";

const DEMO_SYMBOL = "PL";
const DEMO_EXCHANGE = "NYSE";
const BENCHMARK_SYMBOL = "SPY";
const BENCHMARK_EXCHANGE = "AMEX";

export default function ChartSandbox() {
  const [interval, setInterval] = useState<ChartInterval>("D");
  const [activeTool, setActiveTool] = useState<ChartDrawingTool>("none");
  const [riskAmount, setRiskAmount] = useState(1000);

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

  const handleSubmitLongPosition = useCallback((summary: LongPositionSummary) => {
    alert(
      `Long Position — ${DEMO_SYMBOL}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Entry:       $${summary.entry.toFixed(2)}\n` +
      `Stop Loss:   $${summary.stop.toFixed(2)}\n` +
      `Take Profit: $${summary.target.toFixed(2)}\n` +
      `R:R Ratio:   ${summary.riskReward.toFixed(2)}:1\n` +
      `Risk $:      $${summary.riskAmount.toLocaleString()}\n` +
      `Qty:         ${summary.qty} shares`,
    );
  }, []);

  return (
    <PageContainer>
      {/* Risk amount input — only visible when long-position tool is active */}
      {activeTool === "long-position" && (
        <div className="flex items-center gap-3 mb-2">
          <label className="text-xs text-slate-400 font-mono">Risk $</label>
          <input
            type="number"
            value={riskAmount}
            onChange={(e) => setRiskAmount(Math.max(0, Number(e.target.value)))}
            className="w-24 px-2 py-1 text-xs font-mono rounded border border-slate-600 bg-slate-800 text-slate-200 focus:border-blue-500 focus:outline-none"
          />
        </div>
      )}
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
            drawingTool={{
              activeTool,
              onToolChange: setActiveTool,
              riskAmount,
              onRiskAmountChange: setRiskAmount,
              onSubmitLongPosition: handleSubmitLongPosition,
            }}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore || isLoadingMoreSpy}
          />
        )}
      </div>
    </PageContainer>
  );
}
