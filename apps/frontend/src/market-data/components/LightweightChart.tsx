import { useEffect, useRef, useCallback, memo } from "react";
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type HistogramData,
  type LineData,
  type Time,
  type LogicalRange,
  ColorType,
  CrosshairMode,
} from "lightweight-charts";
import type { ChartCandleDto } from "../api/chart-data.client";

interface MovingAverageConfig {
  type: "EMA" | "SMA";
  length: number;
  color?: string;
}

interface LightweightChartProps {
  candles: ChartCandleDto[];
  movingAverages?: MovingAverageConfig[];
  showVolume?: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

const MA_COLORS = ["#2962FF", "#FF6D00", "#AB47BC", "#00E676"];
const LOAD_MORE_THRESHOLD = 10;

function computeEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[j];
      }
      ema = sum / period;
      result.push(ema);
    } else {
      ema = data[i] * k + ema! * (1 - k);
      result.push(ema);
    }
  }
  return result;
}

function computeSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += data[j];
      }
      result.push(sum / period);
    }
  }
  return result;
}

function LightweightChartInner({
  candles,
  movingAverages = [],
  showVolume = true,
  onLoadMore,
  isLoadingMore = false,
}: LightweightChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRefs = useRef<ISeriesApi<"Line">[]>([]);
  const prevCandleCountRef = useRef<number>(0);
  const isLoadingMoreRef = useRef(false);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  isLoadingMoreRef.current = isLoadingMore;

  const handleVisibleLogicalRangeChange = useCallback(
    (logicalRange: LogicalRange | null) => {
      if (
        !logicalRange ||
        !onLoadMoreRef.current ||
        isLoadingMoreRef.current
      ) {
        return;
      }

      if (logicalRange.from < LOAD_MORE_THRESHOLD) {
        onLoadMoreRef.current();
      }
    },
    [],
  );

  // Create chart once
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#94a3b8",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(51, 65, 85, 0.3)" },
        horzLines: { color: "rgba(51, 65, 85, 0.3)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: "rgba(51, 65, 85, 0.5)",
      },
      timeScale: {
        borderColor: "rgba(51, 65, 85, 0.5)",
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);

    chartRef.current = chart;

    return () => {
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(
          handleVisibleLogicalRangeChange,
        );
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRefs.current = [];
    };
  }, [handleVisibleLogicalRangeChange]);

  // Update data when candles or config changes
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;

    const prevCount = prevCandleCountRef.current;
    const isLoadingMoreData = prevCount > 0 && candles.length > prevCount;
    prevCandleCountRef.current = candles.length;

    // Save scroll position before updating if loading more
    const logicalRange = isLoadingMoreData
      ? chart.timeScale().getVisibleLogicalRange()
      : null;
    const newBarsCount = candles.length - prevCount;

    // Remove old series
    if (candlestickSeriesRef.current) {
      chart.removeSeries(candlestickSeriesRef.current);
    }
    if (volumeSeriesRef.current) {
      chart.removeSeries(volumeSeriesRef.current);
    }
    for (const maSeries of maSeriesRefs.current) {
      chart.removeSeries(maSeries);
    }
    maSeriesRefs.current = [];

    // Add candlestick series
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    const candleData: CandlestickData<Time>[] = candles.map((c) => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    cs.setData(candleData);
    candlestickSeriesRef.current = cs;

    // Add volume histogram
    if (showVolume) {
      const vs = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "volume",
      });

      chart.priceScale("volume").applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const volumeData: HistogramData<Time>[] = candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color:
          c.close >= c.open
            ? "rgba(34,197,94,0.3)"
            : "rgba(239,68,68,0.3)",
      }));
      vs.setData(volumeData);
      volumeSeriesRef.current = vs;
    }

    // Add moving averages
    const closes = candles.map((c) => c.close);
    movingAverages.forEach((ma, idx) => {
      const values =
        ma.type === "EMA"
          ? computeEMA(closes, ma.length)
          : computeSMA(closes, ma.length);

      const lineData: LineData<Time>[] = [];
      for (let i = 0; i < candles.length; i++) {
        if (values[i] !== null) {
          lineData.push({
            time: candles[i].time as Time,
            value: values[i]!,
          });
        }
      }

      const ls = chart.addSeries(LineSeries, {
        color: ma.color || MA_COLORS[idx % MA_COLORS.length],
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      ls.setData(lineData);
      maSeriesRefs.current.push(ls);
    });

    // Restore scroll position when loading more (shift by number of new bars)
    if (isLoadingMoreData && logicalRange) {
      chart.timeScale().setVisibleLogicalRange({
        from: logicalRange.from + newBarsCount,
        to: logicalRange.to + newBarsCount,
      });
    } else {
      chart.timeScale().fitContent();
    }
  }, [candles, movingAverages, showVolume]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
  );
}

export const LightweightChart = memo(LightweightChartInner);
