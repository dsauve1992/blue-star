import type { LineData, Time } from "lightweight-charts";
import type { ChartCandleDto, ChartInterval } from "../api/chart-data.client";

// ── Types ─────────────────────────────────────────────────────────────

export interface MovingAverageConfig {
  type: "EMA" | "SMA";
  length: number;
  color?: string;
}

// ── Default moving averages by timeframe ──────────────────────────────

/** EMA 9 + EMA 21 on all timeframes, plus SMA 50 (daily) or SMA 30 (weekly). */
export function getDefaultMovingAverages(
  interval: ChartInterval,
): MovingAverageConfig[] {
  const base: MovingAverageConfig[] = [
    { type: "EMA", length: 9 },
    { type: "EMA", length: 21 },
  ];
  if (interval === "D")
    base.push({ type: "SMA", length: 30, color: "#e8ff00" }); // yellow
  if (interval === "W")
    base.push({ type: "SMA", length: 30, color: "#22c55e" }); // green
  return base;
}

export interface MansfieldRSResult {
  /** Mansfield RS values: (RS / SMA(RS)) * 100 - 100 */
  rsLine: (number | null)[];
  /** SMA of the Mansfield RS line */
  rsSma: (number | null)[];
  /** Indices where RS makes a new high within the lookback window */
  newHighIndices: Set<number>;
  /** Indices where RS makes a new low within the lookback window */
  newLowIndices: Set<number>;
}

// ── Moving average computation ────────────────────────────────────────

export function computeEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const k = 2 / (period + 1);
  let ema: number | null = null;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) sum += data[j];
      ema = sum / period;
      result.push(ema);
    } else {
      ema = data[i] * k + ema! * (1 - k);
      result.push(ema);
    }
  }
  return result;
}

export function computeSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) sum += data[j];
      result.push(sum / period);
    }
  }
  return result;
}

// ── Mansfield Relative Strength ───────────────────────────────────────

export function computeMansfieldRS(
  stockCandles: ChartCandleDto[],
  benchmarkCandles: ChartCandleDto[],
  smaPeriod: number,
  lookback: number,
): MansfieldRSResult {
  const benchmarkByTime = new Map<string, number>();
  for (const c of benchmarkCandles) {
    benchmarkByTime.set(String(c.time), c.close);
  }

  // Raw RS ratio aligned to stock's time axis
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
    if (v !== null) {
      lastValid = v;
      filled.push(v);
    } else filled.push(lastValid);
  }

  // SMA of the raw RS ratio
  const rsSmaRaw = computeSMA(filled, smaPeriod);

  // Mansfield RS = (RS / SMA(RS)) * 100 - 100
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
  for (let i = 0; i < rsSma.length; i++) {
    if (rsLine[i] === null) rsSma[i] = null;
  }

  // Detect new highs and lows within the lookback window
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

// ── Data conversion ───────────────────────────────────────────────────

export function toLineData(
  candles: ChartCandleDto[],
  values: (number | null)[],
): LineData<Time>[] {
  const result: LineData<Time>[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < values.length && values[i] != null && isFinite(values[i]!)) {
      result.push({ time: candles[i].time as Time, value: values[i]! });
    }
  }
  return result;
}

// ── Volume heatmap coloring ───────────────────────────────────────────

export function computeVolumeHeatmapColor(
  volume: number,
  maxVolume: number,
  isUp: boolean,
): string {
  const ratio = volume / maxVolume;
  if (ratio > 0.8)
    return isUp ? "rgba(34,197,94,0.95)" : "rgba(239,68,68,0.95)";
  if (ratio > 0.5)
    return isUp ? "rgba(34,197,94,0.65)" : "rgba(239,68,68,0.65)";
  if (ratio > 0.25)
    return isUp ? "rgba(59,130,246,0.45)" : "rgba(244,114,182,0.45)";
  return "rgba(100,116,139,0.2)";
}

// ── Formatters ────────────────────────────────────────────────────────

export function fmt(n: number): string {
  return n.toFixed(2);
}

export function fmtVol(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toFixed(0);
}
