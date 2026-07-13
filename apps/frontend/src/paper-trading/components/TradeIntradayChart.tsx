import type { SeriesMarker, Time } from "lightweight-charts";
import { Alert, AlertDescription, LoadingSpinner } from "../../global/design-system";
import { TechnicalChart } from "../../market-data/components/TechnicalChart";
import { useTradeIntradayCandles } from "../hooks/use-trade-charts";
import { entryBarTime } from "../utils/trade-window";
import type { PaperTrade } from "../api/paper-trading.types";

interface TradeIntradayChartProps {
  trade: PaperTrade;
}

const ENTRY_COLOR = "#3b82f6";

export function TradeIntradayChart({ trade }: TradeIntradayChartProps) {
  const { candles, isLoading, isError } = useTradeIntradayCandles(trade);

  if (isLoading) {
    return (
      <div className="flex h-[480px] items-center justify-center">
        <LoadingSpinner label="Loading 5-minute chart..." />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger">
        <AlertDescription>Couldn’t load intraday chart data.</AlertDescription>
      </Alert>
    );
  }

  if (candles.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Intraday data unavailable for this trade.
      </p>
    );
  }

  const markers: SeriesMarker<Time>[] = [];
  const entryTime = entryBarTime(candles, trade.openedAt);
  if (entryTime !== null) {
    markers.push({
      time: entryTime as Time,
      position: "belowBar",
      shape: "arrowUp",
      color: ENTRY_COLOR,
      text: "BUY",
    });
  }

  return (
    <div className="h-[480px] rounded-xl border border-slate-200 dark:border-slate-700/50">
      <TechnicalChart
        candles={candles}
        ticker={trade.ticker}
        priceLines={[{ price: trade.entryPrice, color: ENTRY_COLOR, title: "Entry" }]}
        markers={markers}
      />
    </div>
  );
}
