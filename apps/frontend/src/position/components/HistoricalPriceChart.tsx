import { Card, Alert } from "src/global/design-system";
import { TrendingUp, TrendingDown, Shield } from "lucide-react";
import type { HistoricalData } from "../api/market-data.client";

interface PositionEvent {
  action: string;
  timestamp: string;
  qty?: number;
  price?: number;
  stop?: number;
  note?: string;
}

interface HistoricalPriceChartProps {
  historicalData: HistoricalData;
  events: PositionEvent[];
  instrument: string;
}

export function HistoricalPriceChart({
  historicalData,
  events,
  instrument,
}: HistoricalPriceChartProps) {
  if (!historicalData.pricePoints || historicalData.pricePoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Alert variant="danger">
          No historical price data available for {instrument}.
        </Alert>
      </Card>
    );
  }

  // Sort events by timestamp
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Chart dimensions
  const chartWidth = 800;
  const chartHeight = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Filter out weekends (keep only trading days)
  const tradingDays = historicalData.pricePoints.filter((point) => {
    const date = new Date(point.date);
    const dayOfWeek = date.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
  });

  // Calculate price range from trading days only
  const prices = tradingDays
    .map((point) => [point.open, point.high, point.low, point.close])
    .flat();
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const pricePadding = priceRange * 0.1; // 10% padding

  // Create a mapping from date to sequential position (no gaps)
  const dateToIndex = new Map<string, number>();
  tradingDays.forEach((point, index) => {
    dateToIndex.set(point.date, index);
  });

  // Scale functions - use sequential positioning for trading days
  const xScale = (date: string) => {
    const index = dateToIndex.get(date) || 0;
    return margin.left + (index / (tradingDays.length - 1)) * innerWidth;
  };

  const yScale = (price: number) => {
    const scaledPrice =
      (price - (minPrice - pricePadding)) / (priceRange + 2 * pricePadding);
    return margin.top + innerHeight - scaledPrice * innerHeight;
  };

  // Get event icon and color
  const getEventIcon = (action: string) => {
    switch (action) {
      case "BUY":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "SELL":
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case "STOP_LOSS":
        return <Shield className="h-4 w-4 text-amber-600" />;
      default:
        return <div className="h-4 w-4 bg-slate-400 rounded-full" />;
    }
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case "BUY":
        return "#10b981"; // green-500
      case "SELL":
        return "#ef4444"; // red-500
      case "STOP_LOSS":
        return "#f59e0b"; // amber-500
      default:
        return "#64748b"; // slate-500
    }
  };

  // Create candlestick data (trading days only)
  const candlesticks = tradingDays.map((point) => ({
    x: xScale(point.date),
    open: yScale(point.open),
    high: yScale(point.high),
    low: yScale(point.low),
    close: yScale(point.close),
    date: point.date,
  }));

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {instrument} Historical Price Chart
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Price movement (trading days only) with demo trading events overlaid
        </p>
      </div>

      <div className="overflow-x-auto">
        <svg
          width={chartWidth}
          height={chartHeight}
          className="border border-slate-200 dark:border-slate-700 rounded-lg"
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = margin.top + innerHeight * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={margin.left}
                y1={y}
                x2={margin.left + innerWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="2,2"
              />
            );
          })}

          {/* Candlesticks */}
          {candlesticks.map((candle, index) => {
            const isGreen = candle.close > candle.open;
            const color = isGreen ? "#10b981" : "#ef4444";

            return (
              <g key={index}>
                {/* High-Low line */}
                <line
                  x1={candle.x}
                  y1={candle.high}
                  x2={candle.x}
                  y2={candle.low}
                  stroke={color}
                  strokeWidth={1}
                />

                {/* Open-Close rectangle */}
                <rect
                  x={candle.x - 2}
                  y={Math.min(candle.open, candle.close)}
                  width={4}
                  height={Math.abs(candle.close - candle.open)}
                  fill={isGreen ? color : "white"}
                  stroke={color}
                  strokeWidth={1}
                />
              </g>
            );
          })}

          {/* Event markers */}
          {sortedEvents.map((event, index) => {
            // For stop loss events, use the stop price; for others, use the price
            const eventPrice = event.action === "STOP_LOSS" ? event.stop : event.price;
            if (eventPrice === undefined) return null;

            return (
              <g key={`event-${index}`}>
                <circle
                  cx={xScale(event.timestamp)}
                  cy={yScale(eventPrice)}
                  r={6}
                  fill={getEventColor(event.action)}
                  stroke="white"
                  strokeWidth={2}
                />
                <circle
                  cx={xScale(event.timestamp)}
                  cy={yScale(eventPrice)}
                  r={3}
                  fill="white"
                />
              </g>
            );
          })}

          {/* Y-axis labels (prices) - lowest at bottom, highest at top */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const price =
              minPrice -
              pricePadding +
              (priceRange + 2 * pricePadding) * ratio;
            const y = margin.top + innerHeight * (1 - ratio);
            return (
              <text
                key={`price-${ratio}`}
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-slate-600 dark:fill-slate-400"
              >
                ${price.toFixed(2)}
              </text>
            );
          })}

          {/* X-axis labels (dates) - trading days only */}
          {tradingDays
            .filter(
              (_, index) =>
                index % Math.ceil(tradingDays.length / 5) === 0,
            )
            .map((point, index) => (
              <text
                key={`date-${index}`}
                x={xScale(point.date)}
                y={chartHeight - margin.bottom + 20}
                textAnchor="middle"
                className="text-xs fill-slate-600 dark:fill-slate-400"
              >
                {new Date(point.date).toLocaleDateString()}
              </text>
            ))}

          {/* Y-axis label */}
          <text
            x={20}
            y={chartHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 20, ${chartHeight / 2})`}
            className="text-sm fill-slate-700 dark:fill-slate-300 font-medium"
          >
            Price ($)
          </text>

          {/* X-axis label */}
          <text
            x={chartWidth / 2}
            y={chartHeight - 10}
            textAnchor="middle"
            className="text-sm fill-slate-700 dark:fill-slate-300 font-medium"
          >
            Time
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Price Up
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Price Down
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Buy
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <TrendingDown className="h-4 w-4 text-red-600" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Sell
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Shield className="h-4 w-4 text-amber-600" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            Stop Loss
          </span>
        </div>
      </div>

      {/* Event details */}
      {sortedEvents.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center space-x-2">
            <h4 className="text-md font-medium text-slate-900 dark:text-slate-100">
              Trading Events
            </h4>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
              DEMO
            </span>
          </div>
          {sortedEvents.map((event, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                {getEventIcon(event.action)}
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {event.action}
                  </span>
                  {event.qty && (
                    <span className="text-slate-600 dark:text-slate-400 ml-2">
                      {event.qty} shares
                    </span>
                  )}
                  {event.price && (
                    <span className="text-slate-600 dark:text-slate-400 ml-2">
                      at ${event.price.toFixed(2)}
                    </span>
                  )}
                  {event.stop && (
                    <span className="text-slate-600 dark:text-slate-400 ml-2">
                      stop: ${event.stop.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {new Date(event.timestamp).toLocaleDateString()}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
