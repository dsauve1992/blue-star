import type { SeriesMarker, Time } from "lightweight-charts";
import { Alert, AlertDescription, LoadingSpinner } from "../../global/design-system";
import { TechnicalChart } from "../../market-data/components/TechnicalChart";
import { useTradeDailyCandles } from "../hooks/use-trade-charts";
import { entryBarTime } from "../utils/trade-window";
import type { PaperTrade } from "../api/paper-trading.types";

interface TradeDailyChartProps {
  trade: PaperTrade;
}

const ENTRY_COLOR = "#3b82f6";
const STOP_COLOR = "#ef4444";
const TARGET_COLOR = "#22c55e";
const EXIT_WIN_COLOR = "#22c55e";
const EXIT_LOSS_COLOR = "#ef4444";

export function TradeDailyChart({ trade }: TradeDailyChartProps) {
  const { candles, isLoading, isError } = useTradeDailyCandles(trade);

  if (isLoading) {
    return (
      <div className="flex h-[480px] items-center justify-center">
        <LoadingSpinner label="Loading daily chart..." />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger">
        <AlertDescription>Couldn’t load daily chart data.</AlertDescription>
      </Alert>
    );
  }

  if (candles.length === 0) {
    return (
      <Alert>
        <AlertDescription>No daily data available for this trade.</AlertDescription>
      </Alert>
    );
  }

  const priceLines = [
    { price: trade.entryPrice, color: ENTRY_COLOR, title: "Entry" },
    { price: trade.stopPrice, color: STOP_COLOR, title: "Stop" },
    { price: trade.targetPrice, color: TARGET_COLOR, title: "Target" },
  ];

  if (trade.status === "CLOSED" && trade.exitPrice !== null) {
    const isWin = trade.pnl !== null && trade.pnl >= 0;
    priceLines.push({
      price: trade.exitPrice,
      color: isWin ? EXIT_WIN_COLOR : EXIT_LOSS_COLOR,
      title: "Exit",
    });
  }

  const markers: SeriesMarker<Time>[] = [];
  const entryTime = entryBarTime(candles, trade.marketDate);
  if (entryTime !== null) {
    markers.push({
      time: entryTime as Time,
      position: "belowBar",
      shape: "arrowUp",
      color: ENTRY_COLOR,
      text: "BUY",
    });
  }

  if (trade.status === "CLOSED" && trade.exitReason !== null) {
    const lastCandle = candles[candles.length - 1];
    const isWin = trade.pnl !== null && trade.pnl >= 0;
    markers.push({
      time: lastCandle.time as Time,
      position: "aboveBar",
      shape: "arrowDown",
      color: isWin ? EXIT_WIN_COLOR : EXIT_LOSS_COLOR,
      text: trade.exitReason,
    });
  }

  return (
    <div className="h-[480px] rounded-xl border border-slate-200 dark:border-slate-700/50">
      <TechnicalChart
        candles={candles}
        ticker={trade.ticker}
        movingAverages={[{ type: "SMA", length: 50 }]}
        priceLines={priceLines}
        markers={markers}
      />
    </div>
  );
}
