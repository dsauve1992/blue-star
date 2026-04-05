import { useEffect, useRef, useCallback, useState, memo } from "react";
import {
  createChart,
  createTextWatermark,
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
  type MouseEventParams,
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
  ticker?: string;
}

// Design system colors
const COLORS = {
  up: "#3b82f6", // primary-500 — up candles
  down: "#f472b6", // pink-400 — down candles
  textSecondary: "#cbd5e1", // slate-300
  textTertiary: "#94a3b8", // slate-400
  textMuted: "#64748b", // slate-500
  border: "rgba(51, 65, 85, 0.5)", // slate-700/50
  grid: "rgba(51, 65, 85, 0.15)", // slate-700/15 — subtler grid
  surface: "#1e293b", // slate-800
  volumeUp: "rgba(59, 130, 246, 0.25)", // primary at 25%
  volumeDown: "rgba(244, 114, 182, 0.25)", // pink at 25%
  crosshairLine: "rgba(148, 163, 184, 0.4)", // slate-400/40
  crosshairLabel: "#334155", // slate-700
};

const MA_COLORS = ["#3b82f6", "#a855f7", "#f59e0b", "#10b981"]; // primary, purple, amber, success
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

// ── Legend data type ──────────────────────────────────────────────────
interface LegendData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
  maValues: { label: string; value: number; color: string }[];
}

// ── Tooltip data type ─────────────────────────────────────────────────
interface TooltipData {
  x: number;
  y: number;
  legend: LegendData;
}

function LightweightChartInner({
  candles,
  movingAverages = [],
  showVolume = true,
  onLoadMore,
  isLoadingMore = false,
  ticker,
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

  const [legend, setLegend] = useState<LegendData | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const maConfigsRef = useRef(movingAverages);
  maConfigsRef.current = movingAverages;

  const buildLegendFromParam = useCallback(
    (param: MouseEventParams): LegendData | null => {
      if (!param.time || !candlestickSeriesRef.current) return null;

      const ohlc = param.seriesData.get(candlestickSeriesRef.current) as
        | CandlestickData<Time>
        | undefined;
      if (!ohlc) return null;

      const vol = volumeSeriesRef.current
        ? (param.seriesData.get(volumeSeriesRef.current) as
            | HistogramData<Time>
            | undefined)
        : undefined;

      const maValues: LegendData["maValues"] = [];
      maSeriesRefs.current.forEach((series, idx) => {
        const point = param.seriesData.get(series) as
          | LineData<Time>
          | undefined;
        if (point?.value != null) {
          const cfg = maConfigsRef.current[idx];
          maValues.push({
            label: `${cfg.type} ${cfg.length}`,
            value: point.value,
            color: cfg.color || MA_COLORS[idx % MA_COLORS.length],
          });
        }
      });

      const change = ohlc.close - ohlc.open;
      const changePercent = ohlc.open !== 0 ? (change / ohlc.open) * 100 : 0;

      return {
        open: ohlc.open,
        high: ohlc.high,
        low: ohlc.low,
        close: ohlc.close,
        volume: vol?.value ?? 0,
        change,
        changePercent,
        maValues,
      };
    },
    [],
  );

  const handleCrosshairMove = useCallback(
    (param: MouseEventParams) => {
      const data = buildLegendFromParam(param);
      setLegend(data);

      // Tooltip positioning
      if (!data || !param.point) {
        setTooltip(null);
        return;
      }
      const containerW = containerRef.current?.clientWidth ?? 800;
      const x =
        param.point.x > containerW - 200
          ? param.point.x - 180
          : param.point.x + 20;
      setTooltip({
        x,
        y: Math.max(8, param.point.y - 60),
        legend: data,
      });
    },
    [buildLegendFromParam],
  );

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
        textColor: COLORS.textTertiary,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: COLORS.crosshairLine,
          labelBackgroundColor: COLORS.crosshairLabel,
        },
        horzLine: {
          color: COLORS.crosshairLine,
          labelBackgroundColor: COLORS.crosshairLabel,
        },
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        textColor: COLORS.textMuted,
      },
      timeScale: {
        borderColor: COLORS.border,
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    chart.subscribeCrosshairMove(handleCrosshairMove);

    chartRef.current = chart;

    return () => {
      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(
          handleVisibleLogicalRangeChange,
        );
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      volumeSeriesRef.current = null;
      maSeriesRefs.current = [];
    };
  }, [handleVisibleLogicalRangeChange, handleCrosshairMove]);

  // Watermark via v5 plugin API
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (!ticker) return;

    const pane = chart.panes()[0];
    if (!pane) return;

    const watermark = createTextWatermark(pane, {
      horzAlign: "center",
      vertAlign: "center",
      lines: [
        {
          text: ticker,
          color: "rgba(148, 163, 184, 0.06)",
          fontSize: 48,
          fontFamily: "'JetBrains Mono', monospace",
          fontStyle: "bold",
        },
      ],
    });

    return () => {
      watermark.detach();
    };
  }, [ticker]);

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
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderDownColor: COLORS.down,
      borderUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      wickUpColor: COLORS.up,
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
        color: c.close >= c.open ? COLORS.volumeUp : COLORS.volumeDown,
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

    // Set default legend to last candle
    const lastCandle = candles[candles.length - 1];
    const lastChange = lastCandle.close - lastCandle.open;
    setLegend({
      open: lastCandle.open,
      high: lastCandle.high,
      low: lastCandle.low,
      close: lastCandle.close,
      volume: lastCandle.volume,
      change: lastChange,
      changePercent:
        lastCandle.open !== 0 ? (lastChange / lastCandle.open) * 100 : 0,
      maValues: movingAverages.map((ma, idx) => {
        const vals =
          ma.type === "EMA"
            ? computeEMA(closes, ma.length)
            : computeSMA(closes, ma.length);
        const lastVal = vals[vals.length - 1];
        return {
          label: `${ma.type} ${ma.length}`,
          value: lastVal ?? 0,
          color: ma.color || MA_COLORS[idx % MA_COLORS.length],
        };
      }),
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

  // Screenshot export
  const handleScreenshot = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.takeScreenshot();
    const link = document.createElement("a");
    link.download = `${ticker || "chart"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [ticker]);

  const fmt = (n: number) =>
    n >= 1000 ? n.toFixed(2) : n >= 1 ? n.toFixed(2) : n.toFixed(4);
  const fmtVol = (n: number) => {
    if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return n.toFixed(0);
  };

  const isUp = legend ? legend.close >= legend.open : true;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* Fixed OHLCV legend — top-left */}
      {legend && (
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 10,
            pointerEvents: "none",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            lineHeight: "18px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            <span style={{ color: COLORS.textMuted }}>O</span>
            <span style={{ color: isUp ? COLORS.up : COLORS.down }}>
              {fmt(legend.open)}
            </span>
            <span style={{ color: COLORS.textMuted }}>H</span>
            <span style={{ color: isUp ? COLORS.up : COLORS.down }}>
              {fmt(legend.high)}
            </span>
            <span style={{ color: COLORS.textMuted }}>L</span>
            <span style={{ color: isUp ? COLORS.up : COLORS.down }}>
              {fmt(legend.low)}
            </span>
            <span style={{ color: COLORS.textMuted }}>C</span>
            <span style={{ color: isUp ? COLORS.up : COLORS.down }}>
              {fmt(legend.close)}
            </span>
            <span style={{ color: isUp ? COLORS.up : COLORS.down }}>
              {legend.change >= 0 ? "+" : ""}
              {fmt(legend.change)} ({legend.changePercent >= 0 ? "+" : ""}
              {legend.changePercent.toFixed(2)}%)
            </span>
          </div>
          {legend.volume > 0 && (
            <div style={{ display: "flex", gap: "6px" }}>
              <span style={{ color: COLORS.textMuted }}>Vol</span>
              <span style={{ color: COLORS.textTertiary }}>
                {fmtVol(legend.volume)}
              </span>
            </div>
          )}
          {legend.maValues.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {legend.maValues.map((ma) => (
                <span key={ma.label}>
                  <span style={{ color: ma.color, opacity: 0.7 }}>
                    {ma.label}
                  </span>{" "}
                  <span style={{ color: ma.color }}>{fmt(ma.value)}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating tooltip — follows cursor */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 20,
            pointerEvents: "none",
            background: "rgba(15, 23, 42, 0.92)",
            border: "1px solid rgba(51, 65, 85, 0.6)",
            borderRadius: 8,
            padding: "8px 10px",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            lineHeight: "15px",
            backdropFilter: "blur(8px)",
            minWidth: 140,
          }}
        >
          <div
            style={{
              color:
                tooltip.legend.close >= tooltip.legend.open
                  ? COLORS.up
                  : COLORS.down,
              fontWeight: 600,
              marginBottom: 3,
            }}
          >
            {fmt(tooltip.legend.close)}{" "}
            <span style={{ fontWeight: 400 }}>
              ({tooltip.legend.changePercent >= 0 ? "+" : ""}
              {tooltip.legend.changePercent.toFixed(2)}%)
            </span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "1px 8px",
              color: COLORS.textTertiary,
            }}
          >
            <span style={{ color: COLORS.textMuted }}>O</span>
            <span>{fmt(tooltip.legend.open)}</span>
            <span style={{ color: COLORS.textMuted }}>H</span>
            <span>{fmt(tooltip.legend.high)}</span>
            <span style={{ color: COLORS.textMuted }}>L</span>
            <span>{fmt(tooltip.legend.low)}</span>
            <span style={{ color: COLORS.textMuted }}>Vol</span>
            <span>{fmtVol(tooltip.legend.volume)}</span>
          </div>
          {tooltip.legend.maValues.length > 0 && (
            <div
              style={{
                marginTop: 4,
                borderTop: "1px solid rgba(51,65,85,0.4)",
                paddingTop: 4,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {tooltip.legend.maValues.map((m) => (
                <div
                  key={m.label}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <span style={{ color: m.color, opacity: 0.7 }}>
                    {m.label}
                  </span>
                  <span style={{ color: m.color }}>{fmt(m.value)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PNG export button — top-right */}
      <button
        onClick={handleScreenshot}
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          padding: "4px 10px",
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          borderRadius: 4,
          border: "1px solid rgba(51,65,85,0.5)",
          background: "rgba(15,23,42,0.7)",
          color: COLORS.textMuted,
          cursor: "pointer",
          opacity: 0.6,
          transition: "opacity 150ms",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.6";
        }}
        title="Download chart as PNG"
      >
        PNG
      </button>
    </div>
  );
}

export const LightweightChart = memo(LightweightChartInner);
