import { useEffect, useRef, useState, useCallback } from "react";
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
  type MouseEventParams,
  ColorType,
  CrosshairMode,
  LineStyle,
} from "lightweight-charts";
import { PageContainer } from "src/global/design-system";
import { useChartData } from "src/market-data/hooks/use-chart-data";
import type { ChartCandleDto, ChartInterval } from "src/market-data/api/chart-data.client";

const DEMO_SYMBOL = "AAPL";
const DEMO_EXCHANGE = "NASDAQ";
const BENCHMARK_SYMBOL = "SPY";
const BENCHMARK_EXCHANGE = "AMEX";
const RS_SMA_PERIOD = 50; // SMA period for RS line smoothing
const RS_LOOKBACK = 52; // 52-point lookback for new high/low detection

// ── Shared color palette ──────────────────────────────────────────────
const C = {
  up: "#3b82f6",
  upBody: "rgba(59, 130, 246, 0.85)",
  upWick: "rgba(59, 130, 246, 0.5)",
  down: "#ef4444",
  downBody: "rgba(239, 68, 68, 0.85)",
  downWick: "rgba(239, 68, 68, 0.5)",
  text: "#94a3b8",
  textMuted: "#64748b",
  border: "rgba(51, 65, 85, 0.5)",
  gridHorz: "rgba(51, 65, 85, 0.1)",
  crosshair: "rgba(148, 163, 184, 0.3)",
  crosshairLabel: "#334155",
  red: "#ef4444",
  green: "#22c55e",
  amber: "#f59e0b",
  cyan: "#06b6d4",
  rsLine: "#22c55e", // green — RS line
  rsSma: "#f59e0b", // amber — RS SMA
  rsNewHigh: "#3b82f6", // blue dot — 52w new high
  rsNewLow: "#ef4444", // red dot — 52w new low
};

// ── MA helpers ────────────────────────────────────────────────────────
function computeEMA(data: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) r.push(null);
    else if (i === period - 1) {
      let s = 0;
      for (let j = 0; j < period; j++) s += data[j];
      ema = s / period;
      r.push(ema);
    } else {
      ema = data[i] * k + ema! * (1 - k);
      r.push(ema);
    }
  }
  return r;
}

function computeSMA(data: number[], period: number): (number | null)[] {
  const r: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) r.push(null);
    else {
      let s = 0;
      for (let j = i - period + 1; j <= i; j++) s += data[j];
      r.push(s / period);
    }
  }
  return r;
}

// ── Mansfield RS computation ──────────────────────────────────────────
interface MansfieldRSResult {
  /** Raw RS ratio (stock/benchmark) — mapped to stock times */
  rsLine: (number | null)[];
  /** SMA of the RS line */
  rsSma: (number | null)[];
  /** Indices where RS makes a 52-week new high */
  newHighIndices: Set<number>;
  /** Indices where RS makes a 52-week new low */
  newLowIndices: Set<number>;
}

function computeMansfieldRS(
  stockCandles: ChartCandleDto[],
  benchmarkCandles: ChartCandleDto[],
  smaPeriod: number,
  lookback: number,
): MansfieldRSResult {
  // Build a map of benchmark close by time string for alignment
  const benchmarkByTime = new Map<string, number>();
  for (const c of benchmarkCandles) {
    benchmarkByTime.set(String(c.time), c.close);
  }

  // Compute raw RS ratio aligned to stock's time axis
  const rawRS: (number | null)[] = [];
  for (const c of stockCandles) {
    const benchClose = benchmarkByTime.get(String(c.time));
    if (benchClose && benchClose > 0) {
      rawRS.push(c.close / benchClose);
    } else {
      rawRS.push(null);
    }
  }

  // Forward-fill nulls so SMA can compute smoothly
  const filled: number[] = [];
  let lastValid = 0;
  for (const v of rawRS) {
    if (v !== null) { lastValid = v; filled.push(v); }
    else filled.push(lastValid);
  }

  // SMA of the RS ratio
  const rsSmaRaw = computeSMA(filled, smaPeriod);

  // Mansfield RS = (RS / SMA(RS)) * 100 - 100
  // This normalizes around zero: positive = outperforming, negative = underperforming
  const rsLine: (number | null)[] = [];
  for (let i = 0; i < stockCandles.length; i++) {
    if (rawRS[i] === null || rsSmaRaw[i] === null) {
      rsLine.push(null);
    } else {
      rsLine.push((rawRS[i]! / rsSmaRaw[i]!) * 100 - 100);
    }
  }

  // SMA of the Mansfield RS line for trend
  const rsValid = rsLine.map((v) => v ?? 0);
  const rsSma = computeSMA(rsValid, smaPeriod);
  // Null out the same positions as rsLine
  for (let i = 0; i < rsSma.length; i++) {
    if (rsLine[i] === null) rsSma[i] = null;
  }

  // Detect 52-week new highs and lows on the RS line
  const newHighIndices = new Set<number>();
  const newLowIndices = new Set<number>();
  for (let i = lookback; i < rsLine.length; i++) {
    if (rsLine[i] === null) continue;
    let isNewHigh = true;
    let isNewLow = true;
    for (let j = i - lookback; j < i; j++) {
      if (rsLine[j] === null) continue;
      if (rsLine[j]! >= rsLine[i]!) isNewHigh = false;
      if (rsLine[j]! <= rsLine[i]!) isNewLow = false;
      if (!isNewHigh && !isNewLow) break;
    }
    if (isNewHigh) newHighIndices.add(i);
    if (isNewLow) newLowIndices.add(i);
  }

  return { rsLine, rsSma, newHighIndices, newLowIndices };
}

// ── Shared chart options ──────────────────────────────────────────────
function baseChartOptions() {
  return {
    layout: {
      background: { type: ColorType.Solid as const, color: "transparent" },
      textColor: C.text,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 10,
      attributionLogo: false,
    },
    grid: {
      vertLines: { visible: false },
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
  };
}

function toLineData(candles: ChartCandleDto[], values: (number | null)[]): LineData<Time>[] {
  const r: LineData<Time>[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (values[i] !== null) r.push({ time: candles[i].time as Time, value: values[i]! });
  }
  return r;
}

// ── Legend / tooltip types ─────────────────────────────────────────────
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

const fmt = (n: number) => n.toFixed(2);
const fmtVol = (n: number) =>
  n >= 1e9 ? (n / 1e9).toFixed(2) + "B"
  : n >= 1e6 ? (n / 1e6).toFixed(2) + "M"
  : n >= 1e3 ? (n / 1e3).toFixed(1) + "K"
  : n.toFixed(0);

// ── Main chart with RS sub-pane ───────────────────────────────────────
const TIMEFRAMES: { label: string; value: ChartInterval }[] = [
  { label: "1m", value: "1" },
  { label: "5m", value: "5" },
  { label: "15m", value: "15" },
  { label: "1h", value: "60" },
  { label: "D", value: "D" },
  { label: "W", value: "W" },
  { label: "M", value: "M" },
];

const LOAD_MORE_THRESHOLD = 10;

function ChartWithRS({
  candles,
  benchmarkCandles,
  interval,
  onIntervalChange,
  onLoadMore,
  isLoadingMore = false,
}: {
  candles: ChartCandleDto[];
  benchmarkCandles: ChartCandleDto[];
  interval: ChartInterval;
  onIntervalChange: (interval: ChartInterval) => void;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const rsRef = useRef<HTMLDivElement>(null);
  const mainChartRef = useRef<IChartApi | null>(null);
  const rsChartRef = useRef<IChartApi | null>(null);
  const prevCandleCountRef = useRef<number>(0);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const isLoadingMoreRef = useRef(isLoadingMore);
  isLoadingMoreRef.current = isLoadingMore;

  // Series refs for crosshair data reads
  const csRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const vsRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const maSeriesRefs = useRef<{ series: ISeriesApi<"Line">; label: string; color: string }[]>([]);
  const rsLineSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsSmaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const [legend, setLegend] = useState<LegendData | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  // Crosshair handler — reads OHLCV + MAs + RS values
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

    // Tooltip positioning
    if (param.point) {
      const containerW = wrapperRef.current?.clientWidth ?? 800;
      const x = param.point.x > containerW - 200 ? param.point.x - 180 : param.point.x + 20;
      setTooltip({ x, y: Math.max(8, param.point.y - 80), data });
    } else {
      setTooltip(null);
    }
  }, []);

  // PNG export
  const handleScreenshot = useCallback(() => {
    const chart = mainChartRef.current;
    if (!chart) return;
    const canvas = chart.takeScreenshot();
    const link = document.createElement("a");
    link.download = `${DEMO_SYMBOL}-chart.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  useEffect(() => {
    if (!mainRef.current || !rsRef.current || candles.length === 0) return;

    // Detect if we're loading more data (scroll position restore)
    const prevCount = prevCandleCountRef.current;
    const isLoadingMoreData = prevCount > 0 && candles.length > prevCount;
    const newBarsCount = candles.length - prevCount;
    // Save the current visible range before destroying old chart
    const savedLogicalRange = isLoadingMoreData && mainChartRef.current
      ? mainChartRef.current.timeScale().getVisibleLogicalRange()
      : null;
    prevCandleCountRef.current = candles.length;

    // ── Main chart ────────────────────────────────────────────────
    const mainChart = createChart(mainRef.current, baseChartOptions());
    mainChartRef.current = mainChart;

    // Watermark
    const mainPane = mainChart.panes()[0];
    if (mainPane) {
      createTextWatermark(mainPane, {
        horzAlign: "center",
        vertAlign: "center",
        lines: [{
          text: DEMO_SYMBOL,
          color: "rgba(148, 163, 184, 0.06)",
          fontSize: 48,
          fontFamily: "'JetBrains Mono', monospace",
          fontStyle: "bold",
        }],
      });
    }

    const cs = mainChart.addSeries(CandlestickSeries, {
      upColor: C.upBody, downColor: C.downBody,
      borderUpColor: C.up, borderDownColor: C.down,
      wickUpColor: C.upWick, wickDownColor: C.downWick,
    });
    cs.setData(candles.map((c) => ({
      time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
    })));
    csRef.current = cs;

    // Moving averages
    const closes = candles.map((c) => c.close);
    const maConfigs = [
      { values: computeEMA(closes, 9), color: C.red, label: "EMA 9" },
      { values: computeEMA(closes, 21), color: C.up, label: "EMA 21" },
      { values: computeSMA(closes, 30), color: C.green, label: "SMA 30" },
    ];
    maSeriesRefs.current = [];
    maConfigs.forEach(({ values, color, label }) => {
      const ls = mainChart.addSeries(LineSeries, {
        color, lineWidth: 1, priceLineVisible: false,
        lastValueVisible: false, crosshairMarkerVisible: false,
      });
      ls.setData(toLineData(candles, values));
      maSeriesRefs.current.push({ series: ls, label, color });
    });

    // Heatmap volume
    const maxVol = Math.max(...candles.map((c) => c.volume));
    const vs = mainChart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" }, priceScaleId: "vol",
    });
    mainChart.priceScale("vol").applyOptions({ scaleMargins: { top: 0.75, bottom: 0 } });
    vs.setData(candles.map((c) => {
      const ratio = c.volume / maxVol;
      const isUp = c.close >= c.open;
      const color = ratio > 0.8 ? (isUp ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)")
        : ratio > 0.5 ? (isUp ? "rgba(34,197,94,0.65)" : "rgba(239,68,68,0.65)")
        : ratio > 0.25 ? (isUp ? "rgba(59,130,246,0.45)" : "rgba(244,114,182,0.45)")
        : "rgba(100,116,139,0.2)";
      return { time: c.time as Time, value: c.volume, color };
    }));
    vsRef.current = vs;

    // Crosshair handler on main chart
    mainChart.subscribeCrosshairMove(handleCrosshairMove);

    // Load-more: trigger when user scrolls near left edge.
    // Delay subscription so fitContent() doesn't immediately fire it.
    let loadMoreEnabled = false;
    const enableTimer = window.setTimeout(() => { loadMoreEnabled = true; }, 500);
    const handleRangeChange = (logicalRange: import("lightweight-charts").LogicalRange | null) => {
      if (!loadMoreEnabled || !logicalRange || !onLoadMoreRef.current || isLoadingMoreRef.current) return;
      if (logicalRange.from < LOAD_MORE_THRESHOLD) {
        onLoadMoreRef.current();
      }
    };
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);

    // Restore scroll position if loading more, otherwise fit content
    if (isLoadingMoreData && savedLogicalRange) {
      mainChart.timeScale().setVisibleLogicalRange({
        from: savedLogicalRange.from + newBarsCount,
        to: savedLogicalRange.to + newBarsCount,
      });
    } else {
      mainChart.timeScale().fitContent();
    }

    // ── RS sub-chart ──────────────────────────────────────────────
    const rsChart = createChart(rsRef.current, {
      ...baseChartOptions(),
      rightPriceScale: {
        borderColor: C.border, textColor: C.textMuted,
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });
    rsChartRef.current = rsChart;

    // Watermark for RS pane
    const rsPane = rsChart.panes()[0];
    if (rsPane) {
      createTextWatermark(rsPane, {
        horzAlign: "center",
        vertAlign: "center",
        lines: [{
          text: `RS vs ${BENCHMARK_SYMBOL}`,
          color: "rgba(148, 163, 184, 0.08)",
          fontSize: 20,
          fontFamily: "'JetBrains Mono', monospace",
          fontStyle: "",
        }],
      });
    }

    const rs = computeMansfieldRS(candles, benchmarkCandles, RS_SMA_PERIOD, RS_LOOKBACK);

    // Invisible anchor series for logical-index alignment
    const anchor = rsChart.addSeries(LineSeries, {
      color: "transparent", lineVisible: false, pointMarkersVisible: false,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      priceScaleId: "anchor",
    });
    rsChart.priceScale("anchor").applyOptions({ visible: false });
    anchor.setData(candles.map((c) => ({ time: c.time as Time, value: 0 })));

    // RS line (green)
    const rsLineSeries = rsChart.addSeries(LineSeries, {
      color: C.rsLine, lineWidth: 2,
      priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 3,
      crosshairMarkerBorderColor: C.rsLine,
      crosshairMarkerBackgroundColor: "#0f172a",
    });
    rsLineSeries.setData(toLineData(candles, rs.rsLine));
    rsLineSeriesRef.current = rsLineSeries;

    // RS SMA (amber)
    const rsSmaSeries = rsChart.addSeries(LineSeries, {
      color: C.rsSma, lineWidth: 1,
      priceLineVisible: false, lastValueVisible: true,
      crosshairMarkerVisible: false,
    });
    rsSmaSeries.setData(toLineData(candles, rs.rsSma));
    rsSmaSeriesRef.current = rsSmaSeries;

    // Zero line
    rsLineSeries.createPriceLine({
      price: 0, color: C.textMuted, lineWidth: 1,
      lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "",
    });

    // 52-point new highs (blue dots) and new lows (red dots)
    if (rs.newHighIndices.size > 0) {
      const highSeries = rsChart.addSeries(LineSeries, {
        color: C.rsNewHigh, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 4,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const highData: LineData<Time>[] = [];
      for (const idx of rs.newHighIndices) {
        if (rs.rsLine[idx] !== null) highData.push({ time: candles[idx].time as Time, value: rs.rsLine[idx]! });
      }
      highSeries.setData(highData);
    }

    if (rs.newLowIndices.size > 0) {
      const lowSeries = rsChart.addSeries(LineSeries, {
        color: C.rsNewLow, lineVisible: false, pointMarkersVisible: true, pointMarkersRadius: 4,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const lowData: LineData<Time>[] = [];
      for (const idx of rs.newLowIndices) {
        if (rs.rsLine[idx] !== null) lowData.push({ time: candles[idx].time as Time, value: rs.rsLine[idx]! });
      }
      lowSeries.setData(lowData);
    }

    // Restore scroll position on RS chart too, or fit
    if (isLoadingMoreData && savedLogicalRange) {
      rsChart.timeScale().setVisibleLogicalRange({
        from: savedLogicalRange.from + newBarsCount,
        to: savedLogicalRange.to + newBarsCount,
      });
    } else {
      rsChart.timeScale().fitContent();
    }

    // Set initial legend to last bar
    const lc = candles[candles.length - 1];
    const lChg = lc.close - lc.open;
    setLegend({
      o: lc.open, h: lc.high, l: lc.low, c: lc.close, vol: lc.volume,
      chg: lChg, chgPct: lc.open ? (lChg / lc.open) * 100 : 0,
      mas: maConfigs.map(({ label, color, values }) => ({
        label, color, value: values.filter((v): v is number => v !== null).pop()!,
      })),
      rs: rs.rsLine.filter((v): v is number => v !== null).pop() ?? null,
      rsSma: rs.rsSma.filter((v): v is number => v !== null).pop() ?? null,
    });

    // ── Sync time scales (logical range — fires on every scroll frame) ─
    let syncing = false;
    mainChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (syncing || !r) return;
      syncing = true;
      rsChart.timeScale().setVisibleLogicalRange(r);
      syncing = false;
    });
    rsChart.timeScale().subscribeVisibleLogicalRangeChange((r) => {
      if (syncing || !r) return;
      syncing = true;
      mainChart.timeScale().setVisibleLogicalRange(r);
      syncing = false;
    });

    // Sync crosshairs
    mainChart.subscribeCrosshairMove((p) => {
      if (p.time) rsChart.setCrosshairPosition(0, p.time, rsLineSeries);
      else rsChart.clearCrosshairPosition();
    });
    rsChart.subscribeCrosshairMove((p) => {
      if (p.time) mainChart.setCrosshairPosition(0, p.time, cs);
      else mainChart.clearCrosshairPosition();
    });

    return () => {
      window.clearTimeout(enableTimer);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
      mainChart.unsubscribeCrosshairMove(handleCrosshairMove);
      mainChart.remove();
      rsChart.remove();
      mainChartRef.current = null;
      rsChartRef.current = null;
      csRef.current = null;
      vsRef.current = null;
      maSeriesRefs.current = [];
      rsLineSeriesRef.current = null;
      rsSmaSeriesRef.current = null;
    };
  }, [candles, benchmarkCandles, handleCrosshairMove]);

  const isUp = legend ? legend.c >= legend.o : true;
  const clr = isUp ? C.up : C.down;

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "100%", height: "100%" }}>
      <div className="flex flex-col w-full h-full">
        <div ref={mainRef} className="flex-[3] min-h-0" />
        <div className="border-t border-slate-700/30" />
        <div ref={rsRef} className="flex-[1] min-h-0" />
      </div>

      {/* ── Fixed OHLCV Legend — top-left ── */}
      {legend && (
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
      )}

      {/* ── Floating tooltip — follows cursor ── */}
      {tooltip && (
        <div style={{
          position: "absolute", left: tooltip.x, top: tooltip.y, zIndex: 20, pointerEvents: "none",
          background: "rgba(15, 23, 42, 0.92)", border: "1px solid rgba(51, 65, 85, 0.6)",
          borderRadius: 8, padding: "8px 10px", fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, lineHeight: "15px", backdropFilter: "blur(8px)", minWidth: 140,
        }}>
          <div style={{ color: tooltip.data.c >= tooltip.data.o ? C.up : C.down, fontWeight: 600, marginBottom: 3 }}>
            {fmt(tooltip.data.c)}{" "}
            <span style={{ fontWeight: 400 }}>
              ({tooltip.data.chgPct >= 0 ? "+" : ""}{tooltip.data.chgPct.toFixed(2)}%)
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "1px 8px", color: C.text }}>
            <span style={{ color: C.textMuted }}>O</span><span>{fmt(tooltip.data.o)}</span>
            <span style={{ color: C.textMuted }}>H</span><span>{fmt(tooltip.data.h)}</span>
            <span style={{ color: C.textMuted }}>L</span><span>{fmt(tooltip.data.l)}</span>
            <span style={{ color: C.textMuted }}>Vol</span><span>{fmtVol(tooltip.data.vol)}</span>
          </div>
          {tooltip.data.mas.length > 0 && (
            <div style={{ marginTop: 4, borderTop: "1px solid rgba(51,65,85,0.4)", paddingTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>
              {tooltip.data.mas.map((m) => (
                <div key={m.label} style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: m.color, opacity: 0.7 }}>{m.label}</span>
                  <span style={{ color: m.color }}>{fmt(m.value)}</span>
                </div>
              ))}
            </div>
          )}
          {(tooltip.data.rs != null || tooltip.data.rsSma != null) && (
            <div style={{ marginTop: 4, borderTop: "1px solid rgba(51,65,85,0.4)", paddingTop: 4, display: "flex", flexDirection: "column", gap: 1 }}>
              {tooltip.data.rs != null && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: C.rsLine, opacity: 0.7 }}>RS</span>
                  <span style={{ color: C.rsLine }}>{fmt(tooltip.data.rs)}</span>
                </div>
              )}
              {tooltip.data.rsSma != null && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ color: C.rsSma, opacity: 0.7 }}>RS SMA</span>
                  <span style={{ color: C.rsSma }}>{fmt(tooltip.data.rsSma)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Toolbar — top-right: timeframe buttons + PNG ── */}
      <div style={{
        position: "absolute", top: 8, right: 8, zIndex: 10,
        display: "flex", gap: 2, alignItems: "center",
      }}>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf.value}
            onClick={() => onIntervalChange(tf.value)}
            style={{
              padding: "3px 8px", fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
              borderRadius: 4, border: "1px solid rgba(51,65,85,0.5)", cursor: "pointer",
              background: interval === tf.value ? "rgba(59,130,246,0.2)" : "rgba(15,23,42,0.7)",
              color: interval === tf.value ? C.up : C.textMuted,
              transition: "all 150ms",
            }}
          >
            {tf.label}
          </button>
        ))}
        <div style={{ width: 1, height: 16, background: "rgba(51,65,85,0.5)", margin: "0 4px" }} />
        <button
          onClick={handleScreenshot}
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
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════
export default function ChartSandbox() {
  const [interval, setInterval] = useState<ChartInterval>("D");

  const { candles, isLoading, error, loadMore, isLoadingMore } = useChartData(DEMO_SYMBOL, DEMO_EXCHANGE, interval, 500);
  const { candles: spyCandles, isLoading: spyLoading, error: spyError, loadMore: loadMoreSpy, isLoadingMore: isLoadingMoreSpy } = useChartData(BENCHMARK_SYMBOL, BENCHMARK_EXCHANGE, interval, 500);

  const loading = isLoading || spyLoading;
  const hasError = error || spyError;

  // Load more bars for both stock and benchmark simultaneously
  const handleLoadMore = useCallback(() => {
    loadMore();
    loadMoreSpy();
  }, [loadMore, loadMoreSpy]);

  return (
    <PageContainer title="Chart Sandbox" subtitle={`${DEMO_SYMBOL} — Mansfield RS vs ${BENCHMARK_SYMBOL}`}>
      <div className="h-[calc(100vh-160px)] rounded-xl border border-slate-700/50 bg-slate-800/30 backdrop-blur-xl overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center h-full text-slate-400">Loading chart data...</div>
        )}
        {!loading && (hasError || !candles || !spyCandles) && (
          <div className="flex items-center justify-center h-full text-red-400">Failed to load data. Make sure the backend is running.</div>
        )}
        {!loading && candles && spyCandles && (
          <ChartWithRS
            candles={candles}
            benchmarkCandles={spyCandles}
            interval={interval}
            onIntervalChange={setInterval}
            onLoadMore={handleLoadMore}
            isLoadingMore={isLoadingMore || isLoadingMoreSpy}
          />
        )}
      </div>
    </PageContainer>
  );
}
