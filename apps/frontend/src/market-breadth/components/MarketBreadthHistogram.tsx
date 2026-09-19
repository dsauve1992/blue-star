import { useEffect, useRef } from "react";
import {
  ColorType,
  createChart,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type LineData,
  type Time,
  type WhitespaceData,
} from "lightweight-charts";
import { EmaBandSeries, type EmaBandData } from "./ema-band-series";

const NEW_HIGHS_COLOR = "#3b82f6";
const NEW_LOWS_COLOR = "#ef4444";
const EMA10_COLOR = "#ef4444";
const EMA20_COLOR = "#3b82f6";
const COUNT_PRICE_FORMAT = { type: "price", precision: 0, minMove: 1 } as const;
const RATIO_PRICE_FORMAT = {
  type: "price",
  precision: 2,
  minMove: 0.01,
} as const;
const RATIO_PANE = 0;
const COUNT_PANE = 1;
const RATIO_PANE_STRETCH = 2;
const COUNT_PANE_STRETCH = 1;

type RatioPoint = LineData<Time> | WhitespaceData<Time>;
type CountPoint =
  | { time: Time; value: number; color: string }
  | WhitespaceData<Time>;
type BandPoint = EmaBandData | WhitespaceData<Time>;

function toRatioPoint(date: string, ratio: number | null): RatioPoint {
  const time = date as Time;
  return ratio === null ? { time } : { time, value: ratio };
}

function toBandPoint(
  date: string,
  fast: number | null,
  slow: number | null,
): BandPoint {
  const time = date as Time;
  return fast === null || slow === null ? { time } : { time, fast, slow };
}

function toCountPoint(
  date: string,
  count: number | null,
  sign: 1 | -1,
  color: string,
): CountPoint {
  const time = date as Time;
  return count === null ? { time } : { time, value: sign * count, color };
}

export interface BreadthHighLowPoint {
  date: string;
  highs: number | null;
  lows: number | null;
  ema10: number | null;
  ema20: number | null;
}

interface MarketBreadthHistogramProps {
  points: BreadthHighLowPoint[];
  ariaLabel: string;
}

export function MarketBreadthHistogram({
  points,
  ariaLabel,
}: MarketBreadthHistogramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const newHighsSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const newLowsSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const bandSeriesRef = useRef<ISeriesApi<"Custom"> | null>(null);
  const ema10SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#000000" },
        textColor: "#94a3b8",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        attributionLogo: false,
        panes: { separatorColor: "rgba(51,65,85,0.5)", enableResize: false },
      },
      grid: {
        vertLines: { color: "rgba(51,65,85,0.3)" },
        horzLines: { color: "rgba(51,65,85,0.3)" },
      },
      leftPriceScale: { visible: false },
      rightPriceScale: {
        visible: true,
        borderColor: "rgba(51,65,85,0.5)",
      },
      timeScale: { borderColor: "rgba(51,65,85,0.5)", timeVisible: false },
      autoSize: true,
    });
    chartRef.current = chart;

    bandSeriesRef.current = chart.addCustomSeries(
      new EmaBandSeries(),
      {
        priceFormat: RATIO_PRICE_FORMAT,
        lastValueVisible: false,
        priceLineVisible: false,
      },
      RATIO_PANE,
    );
    ema20SeriesRef.current = chart.addSeries(
      LineSeries,
      {
        color: EMA20_COLOR,
        lineWidth: 2,
        priceFormat: RATIO_PRICE_FORMAT,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      },
      RATIO_PANE,
    );
    ema10SeriesRef.current = chart.addSeries(
      LineSeries,
      {
        color: EMA10_COLOR,
        lineWidth: 2,
        priceFormat: RATIO_PRICE_FORMAT,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      },
      RATIO_PANE,
    );
    newHighsSeriesRef.current = chart.addSeries(
      HistogramSeries,
      { base: 0, priceFormat: COUNT_PRICE_FORMAT },
      COUNT_PANE,
    );
    newLowsSeriesRef.current = chart.addSeries(
      HistogramSeries,
      { base: 0, priceFormat: COUNT_PRICE_FORMAT },
      COUNT_PANE,
    );
    chart
      .priceScale("right", RATIO_PANE)
      .applyOptions({ scaleMargins: { top: 0.1, bottom: 0.1 } });
    const [ratioPane, countPane] = chart.panes();
    ratioPane.setStretchFactor(RATIO_PANE_STRETCH);
    countPane.setStretchFactor(COUNT_PANE_STRETCH);

    return () => {
      chart.remove();
      chartRef.current = null;
      newHighsSeriesRef.current = null;
      newLowsSeriesRef.current = null;
      bandSeriesRef.current = null;
      ema10SeriesRef.current = null;
      ema20SeriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (
      !newHighsSeriesRef.current ||
      !newLowsSeriesRef.current ||
      !bandSeriesRef.current ||
      !ema10SeriesRef.current ||
      !ema20SeriesRef.current
    )
      return;

    newHighsSeriesRef.current.setData(
      points.map((point) =>
        toCountPoint(point.date, point.highs, 1, NEW_HIGHS_COLOR),
      ),
    );
    newLowsSeriesRef.current.setData(
      points.map((point) =>
        toCountPoint(point.date, point.lows, -1, NEW_LOWS_COLOR),
      ),
    );
    bandSeriesRef.current.setData(
      points.map((point) => toBandPoint(point.date, point.ema10, point.ema20)),
    );
    ema20SeriesRef.current.setData(
      points.map((point) => toRatioPoint(point.date, point.ema20)),
    );
    ema10SeriesRef.current.setData(
      points.map((point) => toRatioPoint(point.date, point.ema10)),
    );

    chartRef.current?.timeScale().fitContent();
  }, [points]);

  return (
    <div
      ref={containerRef}
      className="h-72 w-full flex-1"
      role="img"
      aria-label={ariaLabel}
    />
  );
}
