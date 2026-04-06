import { useEffect, useRef, useCallback, useState, useMemo, memo } from "react";
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
import type { ChartCandleDto, ChartInterval } from "../api/chart-data.client";
import type { MovingAverageConfig } from "../utils/chart-utils";
import {
  computeEMA,
  computeSMA,
  computeRS,
  computeVolumeHeatmapColor,
  toLineData,
  fmt,
  fmtVol,
} from "../utils/chart-utils";
import { getChartColors, MA_DEFAULT_COLORS, type ChartColorPalette } from "../utils/chart-colors";

// ── Props ─────────────────────────────────────────────────────────────

export interface VolumeConfig {
  show?: boolean;
  heatmap?: boolean;
}

export interface RSConfig {
  benchmarkCandles: ChartCandleDto[];
  smaPeriod?: number;
  lookback?: number;
  benchmarkLabel?: string;
}

export interface TimeframeConfig {
  value: ChartInterval;
  onChange: (interval: ChartInterval) => void;
  options?: ChartInterval[];
}

export interface TechnicalChartProps {
  candles: ChartCandleDto[];
  ticker?: string;
  movingAverages?: MovingAverageConfig[];
  volume?: VolumeConfig;
  rs?: RSConfig;
  timeframe?: TimeframeConfig;
  /** Number of bars to show initially. Defaults to all (fitContent). */
  visibleBars?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  showExport?: boolean;
  theme?: "dark";
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

// ── Constants ─────────────────────────────────────────────────────────

const LOAD_MORE_THRESHOLD = 10;

const TIMEFRAME_LABELS: Record<string, string> = {
  "1": "1m", "5": "5m", "15": "15m", "30": "30m", "60": "1h",
  D: "D", W: "W", M: "M",
};

// ── Legend state ──────────────────────────────────────────────────────

interface LegendData {
  o: number; h: number; l: number; c: number; vol: number;
  chg: number; chgPct: number;
  mas: { label: string; value: number; color: string }[];
  rs?: number | null;
  rsSma?: number | null;
}

interface TooltipState {
  x: number; y: number; data: LegendData;
}

// ── Component ─────────────────────────────────────────────────────────

function TechnicalChartInner({
  candles,
  ticker,
  movingAverages = [],
  volume = { show: true, heatmap: false },
  rs,
  timeframe,
  visibleBars,
  showLegend = true,
  showTooltip = true,
  showExport = true,
  theme = "dark",
  onLoadMore,
  isLoadingMore = false,
}: TechnicalChartProps) {
  const C = getChartColors(theme);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const prevCandleCountRef = useRef<number>(0);

  // Stable refs for callbacks
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;

  // Stable refs for config props (avoids effect re-runs on object identity changes)
  const rsRef = useRef(rs);
  rsRef.current = rs;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const movingAveragesRef = useRef(movingAverages);
  movingAveragesRef.current = movingAverages;
  const visibleBarsRef = useRef(visibleBars);
  visibleBarsRef.current = visibleBars;

  // Stable key to detect when data actually changes
  const dataKey = useMemo(
    () => {
      const first = candles[0];
      const last = candles[candles.length - 1];
      return `${candles.length}-${first?.time}-${last?.close}-${rs?.benchmarkCandles?.length ?? 0}`;
    },
    [candles, rs?.benchmarkCandles],
  );

  // Series refs for crosshair reads
  const csRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vsRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRefs = useRef<{ series: ISeriesApi<"Line">; label: string; color: string }[]>([]);
  const rsLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsSmaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsPaneSeriesRefs = useRef<ISeriesApi<"Line">[]>([]); // all series on RS pane (for cleanup)

  const [legend, setLegend] = useState<LegendData | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // ── Crosshair handler ────────────────────────────────────────────

  const handleCrosshairMove = useCallback((param: MouseEventParams) => {
    if (!param.time || !csRef.current) {
      setLegend(null);
      setTooltip(null);
      return;
    }

    const ohlc = param.seriesData.get(csRef.current) as CandlestickData<Time> | undefined;
    if (!ohlc) { setLegend(null); setTooltip(null); return; }

    const vol = vsRef.current
      ? (param.seriesData.get(vsRef.current) as HistogramData<Time> | undefined)?.value ?? 0
      : 0;

    const mas: LegendData["mas"] = [];
    for (const m of maSeriesRefs.current) {
      const pt = param.seriesData.get(m.series) as LineData<Time> | undefined;
      if (pt?.value != null) mas.push({ label: m.label, value: pt.value, color: m.color });
    }

    const rsVal = rsLineSeriesRef.current
      ? (param.seriesData.get(rsLineSeriesRef.current) as LineData<Time> | undefined)?.value ?? null
      : null;
    const rsSmaVal = rsSmaSeriesRef.current
      ? (param.seriesData.get(rsSmaSeriesRef.current) as LineData<Time> | undefined)?.value ?? null
      : null;

    const chg = ohlc.close - ohlc.open;
    const data: LegendData = {
      o: ohlc.open, h: ohlc.high, l: ohlc.low, c: ohlc.close, vol,
      chg, chgPct: ohlc.open ? (chg / ohlc.open) * 100 : 0,
      mas, rs: rsVal, rsSma: rsSmaVal,
    };
    setLegend(data);

    if (param.point) {
      const containerW = containerRef.current?.clientWidth ?? 800;
      const x = param.point.x > containerW - 200 ? param.point.x - 180 : param.point.x + 20;
      setTooltip({ x, y: Math.max(8, param.point.y - 80), data });
    } else {
      setTooltip(null);
    }
  }, []);

  // ── Load-more handler (with delay guard) ──────────────────────────

  const loadMoreEnabledRef = useRef(false);

  const handleVisibleLogicalRangeChange = useCallback((logicalRange: LogicalRange | null) => {
    if (!loadMoreEnabledRef.current) return;
    if (!logicalRange || !onLoadMoreRef.current || isLoadingMoreRef.current) return;
    if (logicalRange.from < LOAD_MORE_THRESHOLD) {
      onLoadMoreRef.current();
    }
  }, []);

  // ── Screenshot ───────────────────────────────────────────────────

  const handleScreenshot = useCallback(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const canvas = chart.takeScreenshot();
    const link = document.createElement("a");
    link.download = `${ticker || "chart"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [ticker]);

  // ── Chart creation (once) ────────────────────────────────────────

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: C.surface },
        textColor: C.text,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 10,
        attributionLogo: false,
        panes: { separatorColor: C.border },
      },
      grid: {
        vertLines: { color: C.gridVert },
        horzLines: { color: C.gridHorz },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: C.crosshair, labelBackgroundColor: C.crosshairLabel },
        horzLine: { color: C.crosshair, labelBackgroundColor: C.crosshairLabel },
      },
      rightPriceScale: { borderColor: C.border, textColor: C.textMuted },
      timeScale: { borderColor: C.border, timeVisible: false },
      autoSize: true,
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
    chart.subscribeCrosshairMove(handleCrosshairMove);
    chartRef.current = chart;

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleVisibleLogicalRangeChange);
      chart.unsubscribeCrosshairMove(handleCrosshairMove);
      chart.remove();
      chartRef.current = null;
      csRef.current = null;
      vsRef.current = null;
      maSeriesRefs.current = [];
      rsLineSeriesRef.current = null;
      rsSmaSeriesRef.current = null;
    };
  }, [C, handleVisibleLogicalRangeChange, handleCrosshairMove]);

  // ── Watermark ────────────────────────────────────────────────────

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !ticker) return;

    const pane = chart.panes()[0];
    if (!pane) return;

    const watermark = createTextWatermark(pane, {
      horzAlign: "center",
      vertAlign: "center",
      lines: [{
        text: ticker,
        color: "rgba(148, 163, 184, 0.06)",
        fontSize: 48,
        fontFamily: "'JetBrains Mono', monospace",
        fontStyle: "bold",
      }],
    });

    return () => { watermark.detach(); };
  }, [ticker]);

  // ── Data update ──────────────────────────────────────────────────
  // Depends on `dataKey` (candle counts) and `C` (theme). Config objects
  // (movingAverages, volume, rs) are read from refs to avoid re-runs
  // caused by unstable object identity from parent renders.

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || candles.length === 0) return;

    // Disable load-more during rebuild to prevent fitContent() from triggering it
    loadMoreEnabledRef.current = false;

    const currentMAs = movingAveragesRef.current;
    const currentVolume = volumeRef.current;
    const currentRS = rsRef.current;

    const prevCount = prevCandleCountRef.current;
    const isLoadingMoreData = prevCount > 0 && candles.length > prevCount;
    const newBarsCount = candles.length - prevCount;
    const savedLogicalRange = isLoadingMoreData
      ? chart.timeScale().getVisibleLogicalRange()
      : null;
    prevCandleCountRef.current = candles.length;

    // Collect all series currently on the chart so we can safely remove them.
    // In React 18 Strict Mode, refs may hold stale series from a destroyed chart,
    // so we query the chart directly instead of trusting refs.
    const existingPanes = chart.panes();
    for (let p = existingPanes.length - 1; p >= 0; p--) {
      const paneSeries = existingPanes[p].getSeries();
      for (const s of paneSeries) chart.removeSeries(s);
      if (p > 0) chart.removePane(p);
    }
    rsPaneSeriesRefs.current = [];
    rsLineSeriesRef.current = null;
    rsSmaSeriesRef.current = null;
    maSeriesRefs.current = [];

    // ── Pane 0: Candlesticks ─────────────────────────────────────
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: C.upBody, downColor: C.downBody,
      borderUpColor: C.up, borderDownColor: C.down,
      wickUpColor: C.upWick, wickDownColor: C.downWick,
    });
    cs.setData(candles
      .filter((c) => c.open != null && c.high != null && c.low != null && c.close != null)
      .map((c) => ({
        time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
      })));
    csRef.current = cs;

    // ── Moving averages (pane 0) ─────────────────────────────────
    const closes = candles.map((c) => c.close);
    const maConfigs: { values: (number | null)[]; color: string; label: string }[] = [];

    currentMAs.forEach((ma, idx) => {
      const values = ma.type === "EMA" ? computeEMA(closes, ma.length) : computeSMA(closes, ma.length);
      const color = ma.color || MA_DEFAULT_COLORS[idx % MA_DEFAULT_COLORS.length];
      const label = `${ma.type} ${ma.length}`;
      maConfigs.push({ values, color, label });

      const ls = chart.addSeries(LineSeries, {
        color, lineWidth: 1,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      ls.setData(toLineData(candles, values));
      maSeriesRefs.current.push({ series: ls, label, color });
    });

    // ── Volume (pane 0, secondary scale) ─────────────────────────
    const showVolume = currentVolume.show !== false;
    if (showVolume) {
      const vs = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      });
      chart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });

      const maxVol = Math.max(...candles.map((c) => c.volume ?? 0));
      vs.setData(candles.filter((c) => c.volume != null).map((c) => {
        const isUp = c.close >= c.open;
        const color = currentVolume.heatmap
          ? computeVolumeHeatmapColor(c.volume, maxVol, isUp)
          : (isUp ? C.volumeUp : C.volumeDown);
        return { time: c.time as Time, value: c.volume, color };
      }));
      vsRef.current = vs;
    } else {
      vsRef.current = null;
    }

    // ── Pane 1: RS sub-chart (optional) ──────────────────────────
    if (currentRS && currentRS.benchmarkCandles.length > 0) {
      const smaPeriod = currentRS.smaPeriod ?? 50;
      const lookback = currentRS.lookback ?? 52;
      const benchmarkLabel = currentRS.benchmarkLabel ?? "SPY";

      const rsResult = computeRS(candles, currentRS.benchmarkCandles, smaPeriod, lookback);

      // RS line (pane 1)
      const rsLineSeries = chart.addSeries(LineSeries, {
        color: C.rsLine, lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: true,
        crosshairMarkerRadius: 3,
        crosshairMarkerBorderColor: C.rsLine,
        crosshairMarkerBackgroundColor: C.surface,
      }, 1);
      rsLineSeries.setData(toLineData(candles, rsResult.rsLine));
      rsLineSeriesRef.current = rsLineSeries;
      rsPaneSeriesRefs.current.push(rsLineSeries);

      // RS SMA (pane 1)
      const rsSmaSeries = chart.addSeries(LineSeries, {
        color: C.rsSma, lineWidth: 1,
        priceLineVisible: false, lastValueVisible: true,
        crosshairMarkerVisible: false,
      }, 1);
      rsSmaSeries.setData(toLineData(candles, rsResult.rsSma));
      rsSmaSeriesRef.current = rsSmaSeries;
      rsPaneSeriesRefs.current.push(rsSmaSeries);

      // New high dots (pane 1)
      if (rsResult.newHighIndices.size > 0) {
        const highSeries = chart.addSeries(LineSeries, {
          color: C.rsNewHigh, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 4,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        }, 1);
        const highData: LineData<Time>[] = [];
        for (const idx of rsResult.newHighIndices) {
          if (rsResult.rsLine[idx] !== null) {
            highData.push({ time: candles[idx].time as Time, value: rsResult.rsLine[idx]! });
          }
        }
        highSeries.setData(highData);
        rsPaneSeriesRefs.current.push(highSeries);
      }

      // New low dots (pane 1)
      if (rsResult.newLowIndices.size > 0) {
        const lowSeries = chart.addSeries(LineSeries, {
          color: C.rsNewLow, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 4,
          priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
        }, 1);
        const lowData: LineData<Time>[] = [];
        for (const idx of rsResult.newLowIndices) {
          if (rsResult.rsLine[idx] !== null) {
            lowData.push({ time: candles[idx].time as Time, value: rsResult.rsLine[idx]! });
          }
        }
        lowSeries.setData(lowData);
        rsPaneSeriesRefs.current.push(lowSeries);
      }

      // Pane sizing: 3:1 ratio
      chart.panes()[0].setStretchFactor(3);
      chart.panes()[1].setStretchFactor(1);

      // RS pane watermark
      const rsPane = chart.panes()[1];
      if (rsPane) {
        createTextWatermark(rsPane, {
          horzAlign: "center",
          vertAlign: "center",
          lines: [{
            text: `RS vs ${benchmarkLabel}`,
            color: "rgba(148, 163, 184, 0.08)",
            fontSize: 20,
            fontFamily: "'JetBrains Mono', monospace",
            fontStyle: "",
          }],
        });
      }

      // RS pane price scale margins
      chart.priceScale("right", 1).applyOptions({
        scaleMargins: { top: 0.1, bottom: 0.1 },
      });
    }

    // ── Set initial legend to last bar ────────────────────────────
    const lc = candles[candles.length - 1];
    const lChg = lc.close - lc.open;
    const lastLegend: LegendData = {
      o: lc.open, h: lc.high, l: lc.low, c: lc.close, vol: lc.volume,
      chg: lChg, chgPct: lc.open ? (lChg / lc.open) * 100 : 0,
      mas: maConfigs.map(({ label, color, values }) => ({
        label, color, value: values.filter((v): v is number => v !== null).pop() ?? 0,
      })),
    };
    if (currentRS && currentRS.benchmarkCandles.length > 0) {
      const rsResult = computeRS(candles, currentRS.benchmarkCandles, currentRS.smaPeriod ?? 50, currentRS.lookback ?? 52);
      lastLegend.rs = rsResult.rsLine.filter((v): v is number => v !== null).pop() ?? null;
      lastLegend.rsSma = rsResult.rsSma.filter((v): v is number => v !== null).pop() ?? null;
    }
    setLegend(lastLegend);

    // ── Scroll position ──────────────────────────────────────────
    if (isLoadingMoreData && savedLogicalRange) {
      chart.timeScale().setVisibleLogicalRange({
        from: savedLogicalRange.from + newBarsCount,
        to: savedLogicalRange.to + newBarsCount,
      });
    } else if (visibleBarsRef.current && candles.length > visibleBarsRef.current) {
      chart.timeScale().setVisibleLogicalRange({
        from: candles.length - visibleBarsRef.current,
        to: candles.length,
      });
    } else {
      chart.timeScale().fitContent();
    }

    // Re-enable load-more after a delay so fitContent/setVisibleLogicalRange
    // doesn't immediately trigger it
    const enableTimer = window.setTimeout(() => { loadMoreEnabledRef.current = true; }, 500);
    return () => {
      window.clearTimeout(enableTimer);
      loadMoreEnabledRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey, C]);

  // ── Render ───────────────────────────────────────────────────────

  const isUp = legend ? legend.c >= legend.o : true;
  const clr = isUp ? C.up : C.down;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {/* ── Legend — top-left ── */}
      {showLegend && legend && (
        <ChartLegend legend={legend} clr={clr} colors={C} />
      )}

      {/* ── Tooltip — follows cursor ── */}
      {showTooltip && tooltip && (
        <ChartTooltip tooltip={tooltip} colors={C} />
      )}

      {/* ── Toolbar — top-right ── */}
      {(timeframe || showExport) && (
        <ChartToolbar
          timeframe={timeframe}
          showExport={showExport}
          onScreenshot={handleScreenshot}
          colors={C}
        />
      )}
    </div>
  );
}

export const TechnicalChart = memo(TechnicalChartInner);

// ── Sub-components ────────────────────────────────────────────────────

function ChartLegend({ legend, clr, colors: C }: { legend: LegendData; clr: string; colors: ChartColorPalette }) {
  return (
    <div style={{
      position: "absolute", top: 8, left: 8, zIndex: 10, pointerEvents: "none",
      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, lineHeight: "18px",
      display: "flex", flexDirection: "column", gap: 2,
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        <span style={{ color: C.textMuted }}>O</span>
        <span style={{ color: clr }}>{fmt(legend.o)}</span>
        <span style={{ color: C.textMuted }}>H</span>
        <span style={{ color: clr }}>{fmt(legend.h)}</span>
        <span style={{ color: C.textMuted }}>L</span>
        <span style={{ color: clr }}>{fmt(legend.l)}</span>
        <span style={{ color: C.textMuted }}>C</span>
        <span style={{ color: clr }}>{fmt(legend.c)}</span>
        <span style={{ color: clr }}>
          {legend.chg >= 0 ? "+" : ""}{fmt(legend.chg)} ({legend.chgPct >= 0 ? "+" : ""}{legend.chgPct.toFixed(2)}%)
        </span>
      </div>
      {legend.vol > 0 && (
        <div style={{ display: "flex", gap: "6px" }}>
          <span style={{ color: C.textMuted }}>Vol</span>
          <span style={{ color: C.text }}>{fmtVol(legend.vol)}</span>
        </div>
      )}
      {legend.mas.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {legend.mas.map((m) => (
            <span key={m.label}>
              <span style={{ color: m.color, opacity: 0.7 }}>{m.label}</span>{" "}
              <span style={{ color: m.color }}>{fmt(m.value)}</span>
            </span>
          ))}
        </div>
      )}
      {(legend.rs != null || legend.rsSma != null) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {legend.rs != null && (
            <span>
              <span style={{ color: C.rsLine, opacity: 0.7 }}>RS</span>{" "}
              <span style={{ color: C.rsLine }}>{fmt(legend.rs)}</span>
            </span>
          )}
          {legend.rsSma != null && (
            <span>
              <span style={{ color: C.rsSma, opacity: 0.7 }}>RS SMA</span>{" "}
              <span style={{ color: C.rsSma }}>{fmt(legend.rsSma)}</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ChartTooltip({ tooltip, colors: C }: { tooltip: TooltipState; colors: ChartColorPalette }) {
  const d = tooltip.data;
  const isUp = d.c >= d.o;
  return (
    <div style={{
      position: "absolute", left: tooltip.x, top: tooltip.y, zIndex: 20, pointerEvents: "none",
      background: "rgba(15, 23, 42, 0.92)", border: "1px solid rgba(51, 65, 85, 0.6)",
      borderRadius: 8, padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10, lineHeight: "15px", backdropFilter: "blur(8px)", minWidth: 140,
    }}>
      <div style={{ color: isUp ? C.up : C.down, fontWeight: 600, marginBottom: 3 }}>
        {fmt(d.c)}{" "}
        <span style={{ fontWeight: 400 }}>
          ({d.chgPct >= 0 ? "+" : ""}{d.chgPct.toFixed(2)}%)
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1px 8px", color: C.text }}>
        <span style={{ color: C.textMuted }}>O</span><span>{fmt(d.o)}</span>
        <span style={{ color: C.textMuted }}>H</span><span>{fmt(d.h)}</span>
        <span style={{ color: C.textMuted }}>L</span><span>{fmt(d.l)}</span>
        <span style={{ color: C.textMuted }}>Vol</span><span>{fmtVol(d.vol)}</span>
      </div>
      {d.mas.length > 0 && (
        <div style={{ marginTop: 4, borderTop: "1px solid rgba(51,65,85,0.4)", paddingTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>
          {d.mas.map((m) => (
            <div key={m.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: m.color, opacity: 0.7 }}>{m.label}</span>
              <span style={{ color: m.color }}>{fmt(m.value)}</span>
            </div>
          ))}
        </div>
      )}
      {(d.rs != null || d.rsSma != null) && (
        <div style={{ marginTop: 4, borderTop: "1px solid rgba(51,65,85,0.4)", paddingTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>
          {d.rs != null && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: C.rsLine, opacity: 0.7 }}>RS</span>
              <span style={{ color: C.rsLine }}>{fmt(d.rs)}</span>
            </div>
          )}
          {d.rsSma != null && (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span style={{ color: C.rsSma, opacity: 0.7 }}>RS SMA</span>
              <span style={{ color: C.rsSma }}>{fmt(d.rsSma)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ChartToolbar({
  timeframe,
  showExport,
  onScreenshot,
  colors: C,
}: {
  timeframe?: TimeframeConfig;
  showExport?: boolean;
  onScreenshot: () => void;
  colors: ChartColorPalette;
}) {
  return (
    <div style={{
      position: "absolute", top: 8, right: 8, zIndex: 10,
      display: "flex", gap: 2, alignItems: "center",
    }}>
      {timeframe && (timeframe.options ?? ["D", "W", "M"]).map((tf) => (
        <button
          key={tf}
          onClick={() => timeframe.onChange(tf)}
          style={{
            padding: "3px 8px", fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            borderRadius: 4, border: "1px solid rgba(51,65,85,0.5)", cursor: "pointer",
            background: timeframe.value === tf ? "rgba(59,130,246,0.2)" : "rgba(15,23,42,0.7)",
            color: timeframe.value === tf ? C.up : C.textMuted,
            transition: "all 150ms",
          }}
        >
          {TIMEFRAME_LABELS[tf] ?? tf}
        </button>
      ))}
      {timeframe && showExport && (
        <div style={{ width: 1, height: 16, background: "rgba(51,65,85,0.5)", margin: "0 4px" }} />
      )}
      {showExport && (
        <button
          onClick={onScreenshot}
          style={{
            padding: "3px 8px", fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            borderRadius: 4, border: "1px solid rgba(51,65,85,0.5)", background: "rgba(15,23,42,0.7)",
            color: C.textMuted, cursor: "pointer", opacity: 0.6, transition: "opacity 150ms",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "0.6"; }}
          title="Download chart as PNG"
        >
          PNG
        </button>
      )}
    </div>
  );
}
