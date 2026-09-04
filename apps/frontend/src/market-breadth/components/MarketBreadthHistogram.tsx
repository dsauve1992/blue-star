import { useEffect, useRef } from "react";
import {
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import type { MarketBreadthSession } from "../api/market-breadth.types";

const NEW_HIGHS_COLOR = "#3b82f6";
const NEW_LOWS_COLOR = "#ef4444";
const RATIO_COLOR = "#f59e0b";
const COUNT_PRICE_FORMAT = { type: "price", precision: 0, minMove: 1 } as const;
const RATIO_PRICE_FORMAT = {
  type: "price",
  precision: 2,
  minMove: 0.01,
} as const;
const RATIO_PRICE_SCALE_ID = "right";
const COUNT_PRICE_SCALE_ID = "left";

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
  const ratioSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

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
      leftPriceScale: {
        visible: true,
        borderColor: "rgba(51,65,85,0.5)",
      },
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(51,65,85,0.5)",
        textColor: RATIO_COLOR,
      },
      timeScale: { borderColor: "rgba(51,65,85,0.5)", timeVisible: false },
      autoSize: true,
    });
    chartRef.current = chart;

    newHighsSeriesRef.current = chart.addSeries(HistogramSeries, {
      base: 0,
      priceFormat: COUNT_PRICE_FORMAT,
      priceScaleId: COUNT_PRICE_SCALE_ID,
    });
    newLowsSeriesRef.current = chart.addSeries(HistogramSeries, {
      base: 0,
      priceFormat: COUNT_PRICE_FORMAT,
      priceScaleId: COUNT_PRICE_SCALE_ID,
    });
    ratioSeriesRef.current = chart.addSeries(LineSeries, {
      color: RATIO_COLOR,
      lineWidth: 2,
      priceFormat: RATIO_PRICE_FORMAT,
      priceScaleId: RATIO_PRICE_SCALE_ID,
    });
    chart.priceScale(RATIO_PRICE_SCALE_ID).applyOptions({
      scaleMargins: { top: 0.1, bottom: 0.1 },
    });

    return () => {
      chart.remove();
      chartRef.current = null;
      newHighsSeriesRef.current = null;
      newLowsSeriesRef.current = null;
      ratioSeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !newHighsSeriesRef.current ||
      !newLowsSeriesRef.current ||
      !ratioSeriesRef.current
    )
      return;

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
    ratioSeriesRef.current.setData(
      sessions
        .filter((session) => session.averageRatio !== null)
        .map((session) => ({
          time: session.date as Time,
          value: session.averageRatio as number,
        })),
    );

    chartRef.current?.timeScale().fitContent();
  }, [sessions]);

  return (
    <div
      ref={containerRef}
      className="h-48 w-full flex-1"
      role="img"
      aria-label="Mirrored histogram of daily 52-week new highs and new lows, with the 5-day average new-high/new-low ratio overlaid as a line"
    />
  );
}
