import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type WhitespaceData,
} from "lightweight-charts";
import type { MarketBreadthSession } from "../api/market-breadth.types";
import { formatPercent } from "../utils/format-percent";

const RATIO_COLOR = "#3b82f6";
const SMA5_COLOR = "#22c55e";
const SMA20_COLOR = "#f59e0b";
const PERCENT_PRICE_FORMAT = {
  type: "custom",
  minMove: 0.1,
  formatter: (value: number) => `${value.toFixed(1)}%`,
} as const;
const TOOLTIP_WIDTH = 176;
const TOOLTIP_OFFSET = 16;

interface TrendBreadthChartProps {
  sessions: MarketBreadthSession[];
}

interface HoverState {
  x: number;
  y: number;
  session: MarketBreadthSession;
}

type PercentPoint = LineData<Time> | WhitespaceData<Time>;

function toPercentPoint(date: string, ratio: number | null): PercentPoint {
  const time = date as Time;
  return ratio === null ? { time } : { time, value: ratio * 100 };
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function TrendBreadthChart({ sessions }: TrendBreadthChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const ratioSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma5SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const sessionsByDateRef = useRef<Map<string, MarketBreadthSession>>(
    new Map(),
  );
  const [hover, setHover] = useState<HoverState | null>(null);

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
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "rgba(148,163,184,0.4)", labelVisible: false },
        horzLine: { color: "rgba(148,163,184,0.4)" },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(51,65,85,0.5)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: { borderColor: "rgba(51,65,85,0.5)", timeVisible: false },
      autoSize: true,
    });
    chartRef.current = chart;

    sma20SeriesRef.current = chart.addSeries(LineSeries, {
      color: SMA20_COLOR,
      lineWidth: 1,
      lineStyle: LineStyle.Dashed,
      priceFormat: PERCENT_PRICE_FORMAT,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    sma5SeriesRef.current = chart.addSeries(LineSeries, {
      color: SMA5_COLOR,
      lineWidth: 1,
      priceFormat: PERCENT_PRICE_FORMAT,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    ratioSeriesRef.current = chart.addSeries(LineSeries, {
      color: RATIO_COLOR,
      lineWidth: 2,
      priceFormat: PERCENT_PRICE_FORMAT,
      priceLineVisible: false,
    });

    const handleCrosshairMove = (param: MouseEventParams) => {
      const container = containerRef.current;
      if (!param.time || !param.point || !container) {
        setHover(null);
        return;
      }
      const session = sessionsByDateRef.current.get(param.time as string);
      if (!session) {
        setHover(null);
        return;
      }
      const overflowsRight =
        param.point.x + TOOLTIP_OFFSET + TOOLTIP_WIDTH > container.clientWidth;
      const x = overflowsRight
        ? param.point.x - TOOLTIP_OFFSET - TOOLTIP_WIDTH
        : param.point.x + TOOLTIP_OFFSET;
      setHover({ x, y: 8, session });
    };
    chart.subscribeCrosshairMove(handleCrosshairMove);

    return () => {
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      ratioSeriesRef.current = null;
      sma5SeriesRef.current = null;
      sma20SeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !ratioSeriesRef.current ||
      !sma5SeriesRef.current ||
      !sma20SeriesRef.current
    )
      return;

    sessionsByDateRef.current = new Map(
      sessions.map((session) => [session.date, session]),
    );

    ratioSeriesRef.current.setData(
      sessions.map((session) =>
        toPercentPoint(session.date, session.stackedRatio),
      ),
    );
    sma5SeriesRef.current.setData(
      sessions.map((session) =>
        toPercentPoint(session.date, session.stackedRatioSma5),
      ),
    );
    sma20SeriesRef.current.setData(
      sessions.map((session) =>
        toPercentPoint(session.date, session.stackedRatioSma20),
      ),
    );

    chartRef.current?.timeScale().fitContent();
  }, [sessions]);

  return (
    <div className="relative flex min-h-48 w-full flex-1 flex-col">
      <div
        ref={containerRef}
        className="h-48 w-full flex-1"
        role="img"
        aria-label="Line chart of the daily share of universe stocks with stacked moving averages (close above EMA21, EMA9 above EMA21 above SMA50), with its 5-day and 20-day simple moving averages overlaid"
      />
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-[10px] leading-4 text-slate-300 shadow-lg backdrop-blur"
          style={{ left: hover.x, top: hover.y, width: TOOLTIP_WIDTH }}
        >
          <div className="mb-1 font-semibold text-slate-50">
            {formatDate(hover.session.date)}
          </div>
          <div className="flex justify-between">
            <span>Stacked</span>
            <span className="text-slate-50">
              {hover.session.stackedCount === null
                ? "—"
                : `${hover.session.stackedCount} / ${hover.session.universeSize}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: RATIO_COLOR }}>Ratio</span>
            <span className="text-slate-50">
              {formatPercent(hover.session.stackedRatio)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: SMA5_COLOR }}>SMA5</span>
            <span className="text-slate-50">
              {formatPercent(hover.session.stackedRatioSma5)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: SMA20_COLOR }}>SMA20</span>
            <span className="text-slate-50">
              {formatPercent(hover.session.stackedRatioSma20)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
