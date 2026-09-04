import { useEffect, useRef, useState } from "react";
import {
  ColorType,
  createChart,
  CrosshairMode,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type MouseEventParams,
  type Time,
  type WhitespaceData,
} from "lightweight-charts";
import { EmaBandSeries, type EmaBandData } from "./ema-band-series";
import type { MarketBreadthSession } from "../api/market-breadth.types";
import { formatPercent } from "../utils/format-percent";

const EMA10_COLOR = "#ef4444";
const EMA20_COLOR = "#3b82f6";
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
type BandPoint = EmaBandData | WhitespaceData<Time>;

function toPercentPoint(date: string, ratio: number | null): PercentPoint {
  const time = date as Time;
  return ratio === null ? { time } : { time, value: ratio * 100 };
}

function toBandPoint(
  date: string,
  fast: number | null,
  slow: number | null,
): BandPoint {
  const time = date as Time;
  return fast === null || slow === null
    ? { time }
    : { time, fast: fast * 100, slow: slow * 100 };
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
  const bandSeriesRef = useRef<ISeriesApi<"Custom"> | null>(null);
  const ema10SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
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

    bandSeriesRef.current = chart.addCustomSeries(new EmaBandSeries(), {
      priceFormat: PERCENT_PRICE_FORMAT,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ema20SeriesRef.current = chart.addSeries(LineSeries, {
      color: EMA20_COLOR,
      lineWidth: 2,
      priceFormat: PERCENT_PRICE_FORMAT,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
    });
    ema10SeriesRef.current = chart.addSeries(LineSeries, {
      color: EMA10_COLOR,
      lineWidth: 2,
      priceFormat: PERCENT_PRICE_FORMAT,
      lastValueVisible: false,
      priceLineVisible: false,
      crosshairMarkerVisible: false,
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
      bandSeriesRef.current = null;
      ema10SeriesRef.current = null;
      ema20SeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !bandSeriesRef.current ||
      !ema10SeriesRef.current ||
      !ema20SeriesRef.current
    )
      return;

    sessionsByDateRef.current = new Map(
      sessions.map((session) => [session.date, session]),
    );

    bandSeriesRef.current.setData(
      sessions.map((session) =>
        toBandPoint(
          session.date,
          session.stackedRatioEma10,
          session.stackedRatioEma20,
        ),
      ),
    );
    ema20SeriesRef.current.setData(
      sessions.map((session) =>
        toPercentPoint(session.date, session.stackedRatioEma20),
      ),
    );
    ema10SeriesRef.current.setData(
      sessions.map((session) =>
        toPercentPoint(session.date, session.stackedRatioEma10),
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
        aria-label="Line chart of the 10-day and 20-day exponential moving averages of the daily share of universe stocks with stacked moving averages (close above EMA21, EMA9 above EMA21 above SMA50); the gap between them is shaded blue when EMA10 is above EMA20 and red otherwise"
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
            <span>Ratio</span>
            <span className="text-slate-50">
              {formatPercent(hover.session.stackedRatio)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: EMA10_COLOR }}>EMA10</span>
            <span className="text-slate-50">
              {formatPercent(hover.session.stackedRatioEma10)}
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: EMA20_COLOR }}>EMA20</span>
            <span className="text-slate-50">
              {formatPercent(hover.session.stackedRatioEma20)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
