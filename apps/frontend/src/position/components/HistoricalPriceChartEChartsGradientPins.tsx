import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Card, Alert, Badge } from "src/global/design-system";
import { Zap, MapPin } from "lucide-react";
import type { HistoricalData } from "../api/market-data.client";

interface PositionEvent {
  action: string;
  timestamp: string;
  qty?: number;
  price?: number;
  stop?: number;
  note?: string;
}

interface HistoricalPriceChartEChartsGradientPinsProps {
  historicalData: HistoricalData;
  events: PositionEvent[];
  instrument: string;
}

export function HistoricalPriceChartEChartsGradientPins({
  historicalData,
  events,
  instrument,
}: HistoricalPriceChartEChartsGradientPinsProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const checkTheme = () => {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    };

    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  if (!historicalData.pricePoints || historicalData.pricePoints.length === 0) {
    return (
      <Card className="p-6 text-center">
        <Alert variant="danger">
          No historical price data available for {instrument}.
        </Alert>
      </Card>
    );
  }

  // Find the position opening date
  const positionOpenEvent = events.find(
    (event) => event.action === "POSITION_OPEN",
  );
  const positionOpenDate = positionOpenEvent
    ? new Date(positionOpenEvent.timestamp)
    : events.length > 0
      ? new Date(events[0].timestamp) // Use first event if no explicit opening
      : new Date(historicalData.pricePoints[0].date); // Fallback to first price point

  // Extend chart to show 3 weeks before position opening
  const threeWeeksBefore = new Date(positionOpenDate);
  threeWeeksBefore.setDate(threeWeeksBefore.getDate() - 21); // 3 weeks = 21 days

  const tradingDays = historicalData.pricePoints.filter((point) => {
    const date = new Date(point.date);
    const dayOfWeek = date.getDay();
    const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6;
    const isAfterThreeWeeksBefore = date >= threeWeeksBefore;
    return isWeekday && isAfterThreeWeeksBefore;
  });

  // Prepare gradient line data
  const lineData = tradingDays.map((point) => [
    new Date(point.date).getTime(),
    point.close,
  ]);

  // Prepare stop loss horizontal lines data
  const stopLossEvents = events.filter((event) => event.action === "STOP_LOSS");
  const stopLossLinesData = [];

  console.log("All events:", events);
  console.log("Stop loss events:", stopLossEvents);

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
    const stopPrice = currentEvent.stop || (currentEvent as any).stopPrice;
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
        width: 3,
        type: "solid",
      },
      silent: true,
      z: 1,
    });
  }

  // Prepare pin event markers with share quantities
  const eventMarkers = events
    .map((event) => {
      // Handle both 'stop' and 'stopPrice' field names for stop loss events
      const eventPrice =
        event.action === "STOP_LOSS"
          ? event.stop || (event as any).stopPrice
          : event.price;
      if (eventPrice === undefined) return null;

      const color =
        event.action === "POSITION_OPEN"
          ? "#10b981" // Green for position opening
          : event.action === "BUY"
            ? "#8b5cf6"
            : event.action === "SELL"
              ? "#06b6d4"
              : "#f59e0b";

      const symbolSize =
        event.action === "STOP_LOSS"
          ? 30
          : event.action === "POSITION_OPEN"
            ? 35
            : 25;
      const labelText =
        event.action === "STOP_LOSS"
          ? "STOP"
          : event.action === "POSITION_OPEN"
            ? "OPEN"
            : `${event.action} ${event.qty ? (event.qty > 0 ? `+${event.qty}` : `${event.qty}`) : ""}`;

      return {
        name: `${event.action} Event`,
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

  // Add position opening marker if no explicit POSITION_OPEN event exists
  if (!positionOpenEvent && events.length > 0) {
    const firstEvent = events[0];
    // Handle both 'stop' and 'stopPrice' field names
    const firstEventPrice =
      firstEvent.action === "STOP_LOSS"
        ? firstEvent.stop || (firstEvent as any).stopPrice
        : firstEvent.price;

    if (firstEventPrice !== undefined) {
      eventMarkers.unshift({
        name: "Position Opening",
        coord: [new Date(firstEvent.timestamp).getTime(), firstEventPrice],
        symbol: "pin",
        symbolSize: 35,
        itemStyle: {
          color: "#10b981",
          borderColor: "#ffffff",
          borderWidth: 2,
        },
        label: {
          show: true,
          position: "top",
          formatter: "OPEN",
          color: "#10b981",
          fontSize: 12,
          fontWeight: "bold",
          backgroundColor: "rgba(255, 255, 255, 0.95)",
          borderColor: "#10b981",
          borderWidth: 2,
          borderRadius: 8,
          padding: [6, 12],
          shadowBlur: 4,
          shadowColor: "#10b981",
        },
      });
    }
  }

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
        const price = data.data[1];

        return `
          <div style="padding: 8px;">
            <div style="font-weight: bold; margin-bottom: 4px;">${date}</div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #64748b;">Price:</span>
              <span style="font-weight: bold;">$${price.toFixed(2)}</span>
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
        type: "line",
        data: lineData,
        smooth: true,
        symbol: "none",
        lineStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              {
                offset: 0,
                color: "#8b5cf6",
              },
              {
                offset: 0.5,
                color: "#06b6d4",
              },
              {
                offset: 1,
                color: "#10b981",
              },
            ],
          },
          width: 4,
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
                color: "rgba(139, 92, 246, 0.6)",
              },
              {
                offset: 0.5,
                color: "rgba(6, 182, 212, 0.4)",
              },
              {
                offset: 1,
                color: "rgba(16, 185, 129, 0.2)",
              },
            ],
          },
        },
        emphasis: {
          focus: "series",
          lineStyle: {
            width: 6,
          },
        },
        markPoint: {
          data: eventMarkers,
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
              {instrument} Gradient Pins
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
