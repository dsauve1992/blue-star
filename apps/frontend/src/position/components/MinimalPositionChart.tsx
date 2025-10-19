import ReactECharts from "echarts-for-react";
import { useTheme } from "src/global/design-system";
import { useHistoricalData } from "../hooks/use-market-data";
import type { PricePoint } from "src/position/api/market-data.client.ts";

interface PositionEvent {
  action: string;
  timestamp: string;
  qty?: number;
  price?: number;
  stop?: number;
  note?: string;
}

interface MinimalPositionChartProps {
  instrument: string;
  events: PositionEvent[];
  className?: string;
}

export function MinimalPositionChart({
  instrument,
  events,
  className = "",
}: MinimalPositionChartProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const getDateRange = () => {
    if (!events || events.length === 0) {
      // Default to last 3 months if no events
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3);
      return {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      };
    }

    const timestamps = events.map((event) => new Date(event.timestamp));
    const startTime = Math.min(...timestamps.map((d) => d.getTime()));
    const endTime = Math.max(...timestamps.map((d) => d.getTime()));

    // Add padding: 30 days before first event, 7 days after last event
    const startDate = new Date(startTime);
    startDate.setDate(startDate.getDate() - 30);

    const endDate = new Date(endTime);
    endDate.setDate(endDate.getDate() + 7);

    // Ensure end date is not in the future
    const today = new Date();
    if (endDate > today) {
      endDate.setTime(today.getTime());
    }

    return {
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    };
  };

  const dateRange = getDateRange();

  const {
    data: historicalData,
    isLoading,
    error,
  } = useHistoricalData(
    instrument,
    dateRange.startDate,
    dateRange.endDate,
    true,
  );

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-16 ${className}`}>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          Loading chart...
        </div>
      </div>
    );
  }

  if (
    error ||
    !historicalData?.historicalData?.pricePoints ||
    historicalData.historicalData.pricePoints.length === 0
  ) {
    return (
      <div className={`flex items-center justify-center h-16 ${className}`}>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          No chart data
        </div>
      </div>
    );
  }

  // Filter to show only weekdays within the calculated date range
  const tradingDays = historicalData.historicalData.pricePoints.filter(
    (point: PricePoint) => {
      const date = new Date(point.date);
      const dayOfWeek = date.getDay();
      const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
      const isInRange =
        date >= new Date(dateRange.startDate) &&
        date <= new Date(dateRange.endDate);
      return isWeekday && isInRange;
    },
  );

  if (tradingDays.length === 0) {
    return (
      <div className={`flex items-center justify-center h-16 ${className}`}>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          No trading data
        </div>
      </div>
    );
  }

  // Prepare line data
  const lineData = tradingDays.map((point: PricePoint) => [
    new Date(point.date).getTime(),
    point.close,
  ]);

  // Calculate price change
  const latestPrice = tradingDays[tradingDays.length - 1]?.close || 0;
  const firstPrice = tradingDays[0]?.close || 0;
  const priceChange = latestPrice - firstPrice;
  const priceChangePercent =
    firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  // Prepare stop loss horizontal lines data
  const stopLossEvents = events.filter((event) => event.action === "STOP_LOSS");
  const stopLossLinesData = [];

  // Get the end time of the chart (last trading day)
  const chartEndTime =
    tradingDays.length > 0
      ? new Date(tradingDays[tradingDays.length - 1].date).getTime()
      : new Date().getTime();

  // Create separate line segments for each stop-loss line
  for (let i = 0; i < stopLossEvents.length; i++) {
    const currentEvent = stopLossEvents[i];
    const nextEvent = stopLossEvents[i + 1];

    // Handle both 'stop' and 'stopPrice' field names
    const stopPrice = currentEvent.stop;
    if (stopPrice === undefined) continue;

    // Determine end time: next stop-loss event or end of chart
    const endTime = nextEvent
      ? new Date(nextEvent.timestamp).getTime()
      : chartEndTime;

    const lineData = [
      [new Date(currentEvent.timestamp).getTime(), stopPrice],
      [endTime, stopPrice],
    ];

    stopLossLinesData.push({
      name: `Stop Loss Line ${i + 1}`,
      type: "line",
      data: lineData,
      symbol: "none",
      lineStyle: {
        color: "#f59e0b",
        width: 2,
        type: "dashed",
      },
      silent: true,
      z: 1,
    });
  }

  // Prepare event markers (show all events within the date range)
  const eventMarkers = events
    .filter((event) => {
      const eventDate = new Date(event.timestamp);
      return (
        eventDate >= new Date(dateRange.startDate) &&
        eventDate <= new Date(dateRange.endDate)
      );
    })
    .map((event) => {
      const eventPrice =
        event.action === "STOP_LOSS" ? event.stop : event.price;
      if (eventPrice === undefined) return null;

      const color =
        event.action === "BUY"
          ? "#10b981" // Green for buy
          : event.action === "SELL"
            ? "#ef4444" // Red for sell
            : "#f59e0b"; // Amber for stop loss

      return {
        name: `${event.action} Event`,
        coord: [new Date(event.timestamp).getTime(), eventPrice],
        symbol: "circle",
        symbolSize: 6,
        itemStyle: {
          color: color,
          borderColor: "#ffffff",
          borderWidth: 1,
        },
      };
    })
    .filter(Boolean);

  const option = {
    backgroundColor: "transparent",
    textStyle: {
      color: isDarkMode ? "#f1f5f9" : "#0f172a",
      fontFamily: "Inter, sans-serif",
      fontSize: 10,
    },
    grid: {
      left: "5%",
      right: "5%",
      bottom: "5%",
      top: "5%",
      containLabel: true,
    },
    xAxis: {
      type: "time",
      scale: true,
      boundaryGap: false,
      show: false,
    },
    yAxis: {
      scale: true,
      show: false,
    },
    series: [
      {
        name: instrument,
        type: "line",
        data: lineData,
        smooth: true,
        symbol: "none",
        lineStyle: {
          color: priceChange >= 0 ? "#10b981" : "#ef4444",
          width: 2,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color:
                  priceChange >= 0
                    ? "rgba(16, 185, 129, 0.3)"
                    : "rgba(239, 68, 68, 0.3)",
              },
              {
                offset: 1,
                color:
                  priceChange >= 0
                    ? "rgba(16, 185, 129, 0.05)"
                    : "rgba(239, 68, 68, 0.05)",
              },
            ],
          },
        },
        markPoint: {
          data: eventMarkers,
        },
      },
      ...stopLossLinesData,
    ],
    animation: false,
  };

  return (
    <div className={`${className} h-full flex flex-col`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {instrument}
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
            ${latestPrice.toFixed(2)}
          </div>
          <div
            className={`text-sm font-medium ${
              priceChange >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {priceChange >= 0 ? "+" : ""}
            {priceChangePercent.toFixed(1)}%
          </div>
        </div>
      </div>
      <div className="flex-1 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 min-h-0">
        <ReactECharts
          option={option}
          style={{ height: "100%", width: "100%" }}
          opts={{ renderer: "canvas" }}
        />
      </div>
    </div>
  );
}
