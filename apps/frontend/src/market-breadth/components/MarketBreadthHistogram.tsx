import { useEffect, useRef } from "react";
import {
  ColorType,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { MarketBreadthSession } from "../api/market-breadth.types";

const NEW_HIGHS_COLOR = "#3b82f6";
const NEW_LOWS_COLOR = "#ef4444";
const COUNT_PRICE_FORMAT = { type: "price", precision: 0, minMove: 1 } as const;

interface MarketBreadthHistogramProps {
  sessions: MarketBreadthSession[];
}

export function MarketBreadthHistogram({
  sessions,
}: MarketBreadthHistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const newHighsSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const newLowsSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#94a3b8",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(51,65,85,0.3)" },
        horzLines: { color: "rgba(51,65,85,0.3)" },
      },
      rightPriceScale: { borderColor: "rgba(51,65,85,0.5)" },
      timeScale: { borderColor: "rgba(51,65,85,0.5)", timeVisible: false },
      autoSize: true,
    });
    chartRef.current = chart;

    newHighsSeriesRef.current = chart.addSeries(HistogramSeries, {
      base: 0,
      priceFormat: COUNT_PRICE_FORMAT,
    });
    newLowsSeriesRef.current = chart.addSeries(HistogramSeries, {
      base: 0,
      priceFormat: COUNT_PRICE_FORMAT,
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      newHighsSeriesRef.current = null;
      newLowsSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!newHighsSeriesRef.current || !newLowsSeriesRef.current) return;

    newHighsSeriesRef.current.setData(
      sessions.map((session) => ({
        time: session.date as Time,
        value: session.newHighs,
        color: NEW_HIGHS_COLOR,
      })),
    );
    newLowsSeriesRef.current.setData(
      sessions.map((session) => ({
        time: session.date as Time,
        value: -session.newLows,
        color: NEW_LOWS_COLOR,
      })),
    );

    chartRef.current?.timeScale().fitContent();
  }, [sessions]);

  return (
    <div
      ref={containerRef}
      className="h-48 w-full"
      role="img"
      aria-label="Mirrored histogram of daily 52-week new highs and new lows"
    />
  );
}
