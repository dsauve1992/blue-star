function hasFullWindow(
  values: number[],
  period: number,
  endIndex: number,
): boolean {
  return period > 0 && endIndex - period + 1 >= 0 && endIndex < values.length;
}

function meanOfWindow(
  values: number[],
  period: number,
  endIndex: number,
): number {
  let sum = 0;
  for (let i = endIndex - period + 1; i <= endIndex; i++) {
    sum += values[i];
  }
  return sum / period;
}

export function simpleMovingAverage(
  values: number[],
  period: number,
  endIndex: number,
): number | null {
  if (!hasFullWindow(values, period, endIndex)) {
    return null;
  }
  return meanOfWindow(values, period, endIndex);
}

export function seededExponentialMovingAverage(
  values: number[],
  period: number,
  endIndex: number,
): number | null {
  if (!hasFullWindow(values, period, endIndex)) {
    return null;
  }
  const multiplier = 2 / (period + 1);
  let ema = meanOfWindow(values, period, period - 1);
  for (let i = period; i <= endIndex; i++) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }
  return ema;
}

export interface StackedMovingAverages {
  close: number;
  ema9: number | null;
  ema21: number | null;
  sma50: number | null;
}

export function isStacked(averages: StackedMovingAverages): boolean {
  const { close, ema9, ema21, sma50 } = averages;
  if (ema9 === null || ema21 === null || sma50 === null) {
    return false;
  }
  return close > ema21 && ema9 > ema21 && ema21 > sma50;
}

export function stackedRatio(
  stackedCount: number | null,
  universeSize: number,
): number | null {
  if (stackedCount === null || universeSize === 0) {
    return null;
  }
  return stackedCount / universeSize;
}
