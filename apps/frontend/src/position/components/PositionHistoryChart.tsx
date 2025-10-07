import ReactECharts from "echarts-for-react";
import { Card, Alert, Badge, useTheme } from "src/global/design-system";
import { Zap, MapPin } from "lucide-react";
import type { HistoricalData } from "../api/market-data.client";

interface PositionEvent {
  action: string;
  timestamp: string;
  quantity?: number;
  price?: number;
  stopPrice?: number;
  note?: string;
}

interface HistoricalPriceChartEChartsGradientPinsProps {
  historicalData: HistoricalData;
  events: PositionEvent[];
  instrument: string;
}

export function PositionHistoryChart({
  historicalData,
  events,
  instrument,
}: HistoricalPriceChartEChartsGradientPinsProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  if (!historicalData.pricePoints || historicalData.pricePoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Alert variant="danger">
          No historical price data available for {instrument}.
        </Alert>
      </Card>
    );
  }

  const positionOpenDate =
    events.length > 0
      ? new Date(events[0].timestamp) // Use first event if no explicit opening
      : new Date(historicalData.pricePoints[0].date); // Fallback to first price point

  // Extend chart to show 3 weeks before position opening
  const threeWeeksBefore = new Date(positionOpenDate);
  threeWeeksBefore.setDate(threeWeeksBefore.getDate() - 21); // 3 weeks = 21 days

  // Use all price points since we're now getting daily data from the API
  const tradingDays = historicalData.pricePoints.filter((point) => {
    const date = new Date(point.date);
    const isAfterThreeWeeksBefore = date >= threeWeeksBefore;
    return isAfterThreeWeeksBefore;
  });

  console.log(
    "Debug - historicalData.pricePoints:",
    historicalData.pricePoints,
  );
  console.log("Debug - tradingDays:", tradingDays);
  console.log("Debug - threeWeeksBefore:", threeWeeksBefore);

  // Check if we have any trading days
  if (tradingDays.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Alert variant="danger">
          No trading data available for the selected period for {instrument}.
        </Alert>
      </Card>
    );
  }

  // Prepare candlestick data [timestamp, open, close, low, high]
  const candlestickData = tradingDays.map((point) => [
    new Date(point.date),
    point.open,
    point.close,
    point.low,
    point.high,
  ]);

  console.log("Debug - candlestickData:", candlestickData);

  // Prepare stop loss horizontal lines data
  const stopLossEvents = events.filter((event) => event.action === "STOP_LOSS");
  const stopLossLinesData = [];

  // Get the end time of the chart (last trading day)
  const chartEndTime =
    tradingDays.length > 0
      ? new Date(tradingDays[tradingDays.length - 1].date).getTime()
      : new Date().getTime();

  // Create separate line segments for each stop-loss line with vertical connections
  for (let i = 0; i < stopLossEvents.length; i++) {
    const currentEvent = stopLossEvents[i];
    const nextEvent = stopLossEvents[i + 1];

    const stopPrice = currentEvent.stopPrice;
    if (stopPrice === undefined) continue;

    // Determine end time: next stop-loss event or end of chart
    const endTime = nextEvent
      ? new Date(nextEvent.timestamp).getTime()
      : chartEndTime;

    const currentTime = new Date(currentEvent.timestamp).getTime();

    // Horizontal line data
    const horizontalLineData = [
      [currentTime, stopPrice],
      [endTime, stopPrice],
    ];

    stopLossLinesData.push({
      name: `Stop Loss Line ${i + 1}`,
      type: "line",
      data: horizontalLineData,
      symbol: "none",
      lineStyle: {
        color: "#f59e0b",
        width: 1,
        type: "dashed",
      },
      silent: true,
      z: 1,
    });

    // Add vertical line if there's a next stop loss event
    if (nextEvent) {
      const nextStopPrice = nextEvent.stopPrice;
      if (nextStopPrice !== undefined) {
        const verticalLineData = [
          [endTime, stopPrice],
          [endTime, nextStopPrice],
        ];

        stopLossLinesData.push({
          name: `Stop Loss Vertical ${i + 1}`,
          type: "line",
          data: verticalLineData,
          symbol: "none",
          lineStyle: {
            color: "#f59e0b",
            width: 1,
            type: "dashed",
          },
          silent: true,
          z: 1,
        });
      }
    }
  }

  // Prepare pin event markers with share quantities
  const eventMarkers = events
    .map((event, index) => {
      // Handle stop loss events
      const eventPrice =
        event.action === "STOP_LOSS" ? event.stopPrice : event.price;
      if (eventPrice === undefined) return null;

      // Check if this is the first BUY event (position opening)
      const isFirstBuyEvent = event.action === "BUY" && index === 0;

      // Skip stop loss events for pin markers, but keep them for other processing
      if (event.action === "STOP_LOSS") return null;

      const color = isFirstBuyEvent
        ? "#10b981" // Green for position opening (first BUY)
        : event.action === "BUY"
          ? "#8b5cf6"
          : event.action === "SELL"
            ? "#06b6d4"
            : "#f59e0b";

      const symbolSize = isFirstBuyEvent ? 35 : 25;
      const labelText = isFirstBuyEvent
        ? `OPEN ${event.quantity ? `+${event.quantity}` : ""}`
        : event.action === "BUY"
          ? `BUY ${event.quantity ? `+${event.quantity}` : ""}`
          : event.action === "SELL"
            ? `SELL ${event.quantity ? `${event.quantity}` : ""}`
            : `${event.action} ${event.quantity ? (event.quantity > 0 ? `+${event.quantity}` : `${event.quantity}`) : ""}`;

      return {
        name: isFirstBuyEvent ? "Position Opening" : `${event.action} Event`,
        coord: [new Date(event.timestamp).getTime(), eventPrice],
        symbol: "pin",
        symbolSize: symbolSize,
        itemStyle: {
          color: color,
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: true,
          position: "top",
          formatter: labelText,
          color: color,
          fontSize: 12,
          fontWeight: "bold",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderColor: color,
          borderWidth: 2,
          borderRadius: 8,
          padding: [6, 12],
          shadowBlur: 4,
          shadowColor: color,
        },
      };
    })
    .filter(Boolean);

  // Create subtle stop loss markers
  const stopLossMarkers = stopLossEvents
    .map((event) => {
      const stopPrice = event.stopPrice;
      if (stopPrice === undefined) return null;

      return {
        name: "Stop Loss",
        coord: [new Date(event.timestamp).getTime(), stopPrice],
        symbol: "circle",
        symbolSize: 8,
        itemStyle: {
          color: "#f59e0b",
          borderColor: "#ffffff",
          borderWidth: 1,
        },
        label: {
          show: true,
          position: "left",
          formatter: `$${stopPrice.toFixed(2)}`,
          color: "#f59e0b",
          fontSize: 9,
          fontWeight: "normal",
          backgroundColor: "rgba(255, 255, 255)",
          borderColor: "#f59e0b",
          borderWidth: 1,
          borderRadius: 3,
          padding: [4, 8],
          offset: [-5, 0],
        },
      };
    })
    .filter(Boolean);

  const latestPrice = tradingDays[tradingDays.length - 1]?.close || 0;
  const firstPrice = tradingDays[0]?.open || 0;
  const priceChange = latestPrice - firstPrice;
  const priceChangePercent =
    firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  const option = {
    backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
    textStyle: {
      color: isDarkMode ? "#f1f5f9" : "#0f172a",
      fontFamily: "Inter, sans-serif",
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        crossStyle: {
          color: "#8b5cf6",
        },
      },
      backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
      borderColor: isDarkMode ? "#334155" : "#e2e8f0",
      borderWidth: 1,
      textStyle: {
        color: isDarkMode ? "#f1f5f9" : "#0f172a",
      },
      formatter: function (params: Array<{ data: number[] }>) {
        const data = params[0];
        const date = new Date(data.data[0]).toLocaleDateString();
        const [, open, close, low, high] = data.data;

        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${date}</div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #64748b;">Open:</span>
              <span style="font-weight: bold;">$${open.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #64748b;">High:</span>
              <span style="font-weight: bold;">$${high.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
              <span style="color: #64748b;">Low:</span>
              <span style="font-weight: bold;">$${low.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Close:</span>
              <span style="font-weight: bold;">$${close.toFixed(2)}</span>
            </div>
          </div>
        `;
      },
    },
    grid: {
      left: "8%",
      right: "8%",
      bottom: "15%",
      top: "20%",
      containLabel: true,
    },
    xAxis: {
      type: "time",
      scale: true,
      boundaryGap: false,
      axisLine: {
        lineStyle: {
          color: isDarkMode ? "#334155" : "#e2e8f0",
        },
      },
      axisLabel: {
        color: isDarkMode ? "#f1f5f9" : "#0f172a",
        formatter: function (value: number) {
          return new Date(value).toLocaleDateString();
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isDarkMode ? "#334155" : "#e2e8f0",
          type: "dashed",
        },
      },
    },
    yAxis: {
      scale: true,
      axisLine: {
        lineStyle: {
          color: isDarkMode ? "#334155" : "#e2e8f0",
        },
      },
      axisLabel: {
        color: isDarkMode ? "#f1f5f9" : "#0f172a",
        formatter: function (value: number) {
          return `$${value.toFixed(2)}`;
        },
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: isDarkMode ? "#334155" : "#e2e8f0",
          type: "dashed",
        },
      },
    },
    dataZoom: [
      {
        type: "inside",
        start: 0,
        end: 100,
      },
      {
        type: "slider",
        start: 0,
        end: 100,
        height: 20,
        bottom: 10,
        handleStyle: {
          color: "#8b5cf6",
        },
        textStyle: {
          color: isDarkMode ? "#f1f5f9" : "#0f172a",
        },
      },
    ],
    series: [
      {
        name: instrument,
        type: "candlestick",
        data: candlestickData,
        itemStyle: {
          color: isDarkMode ? "#10b981" : "#26a69a", // Green for up candles
          color0: isDarkMode ? "#ef4444" : "#ef5350", // Red for down candles
          borderColor: isDarkMode ? "#10b981" : "#26a69a",
          borderColor0: isDarkMode ? "#ef4444" : "#ef5350",
        },
        emphasis: {
          focus: "series",
          itemStyle: {
            color: isDarkMode ? "#22c55e" : "#22c55e",
            color0: isDarkMode ? "#dc2626" : "#dc2626",
            borderColor: isDarkMode ? "#22c55e" : "#22c55e",
            borderColor0: isDarkMode ? "#dc2626" : "#dc2626",
          },
        },
        markPoint: {
          data: [...eventMarkers, ...stopLossMarkers],
        },
      },
      ...stopLossLinesData,
    ],
    animation: true,
    animationDuration: 2000,
    animationEasing: "cubicInOut",
  };

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-cyan-50 dark:from-purple-900/20 dark:to-cyan-900/20">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-purple-600" />
              {instrument} Daily Chart
            </h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                ${latestPrice.toFixed(2)}
              </div>
              <div
                className={`text-sm font-medium ${
                  priceChange >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {priceChange >= 0 ? "+" : ""}
                {priceChange.toFixed(2)} ({priceChangePercent.toFixed(2)}%)
              </div>
            </div>
            <Badge
              variant="default"
              className="bg-gradient-to-r from-purple-100 to-cyan-100 text-purple-800 dark:from-purple-900 dark:to-cyan-900 dark:text-purple-200"
            >
              <Zap className="h-3 w-3 mr-1" />
              PINS
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden bg-white dark:bg-slate-900">
          <ReactECharts
            option={option}
            style={{ height: "500px", width: "100%" }}
            opts={{ renderer: "canvas" }}
          />
        </div>
      </div>
    </Card>
  );
}
