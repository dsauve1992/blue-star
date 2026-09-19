import {
  isStacked,
  seededExponentialMovingAverage,
  simpleMovingAverage,
} from './moving-average.service';

export interface BreadthCandle {
  date: string;
  high: number;
  low: number;
  close: number;
}

export interface SymbolDayResult {
  evaluable: boolean;
  newHigh: boolean;
  newLow: boolean;
  newHigh20: boolean;
  newLow20: boolean;
  stacked: boolean;
}

export const REQUIRED_TRAILING_SESSIONS = 252;
export const SHORT_TERM_SESSIONS = 20;
export const PARTIAL_RUN_MISSING_THRESHOLD = 0.05;
export const MIN_EVALUABLE_COVERAGE = 0.8;
export const FAST_EMA_PERIOD = 9;
export const SLOW_EMA_PERIOD = 21;
export const TREND_SMA_PERIOD = 50;

const NOT_EVALUABLE: Readonly<SymbolDayResult> = Object.freeze({
  evaluable: false,
  newHigh: false,
  newLow: false,
  newHigh20: false,
  newLow20: false,
  stacked: false,
});

export function evaluateSymbolOnDate(
  candles: BreadthCandle[],
  indexOfD: number,
  window: number = REQUIRED_TRAILING_SESSIONS,
): Readonly<SymbolDayResult> {
  if (indexOfD < window || indexOfD >= candles.length) {
    return NOT_EVALUABLE;
  }

  const today = candles[indexOfD];
  const { newHigh, newLow } = evaluateNewHighNewLow(candles, indexOfD, window);
  const shortTerm = evaluateNewHighNewLow(
    candles,
    indexOfD,
    Math.min(SHORT_TERM_SESSIONS, window),
  );
  const closes = candles.slice(0, indexOfD + 1).map((c) => c.close);

  return {
    evaluable: true,
    newHigh,
    newLow,
    newHigh20: shortTerm.newHigh,
    newLow20: shortTerm.newLow,
    stacked: isStacked({
      close: today.close,
      ema9: seededExponentialMovingAverage(closes, FAST_EMA_PERIOD, indexOfD),
      ema21: seededExponentialMovingAverage(closes, SLOW_EMA_PERIOD, indexOfD),
      sma50: simpleMovingAverage(closes, TREND_SMA_PERIOD, indexOfD),
    }),
  };
}

function evaluateNewHighNewLow(
  candles: BreadthCandle[],
  indexOfD: number,
  window: number,
): { newHigh: boolean; newLow: boolean } {
  const priorSessions = candles.slice(indexOfD - window, indexOfD);
  const priorMaxHigh = Math.max(...priorSessions.map((c) => c.high));
  const priorMinLow = Math.min(...priorSessions.map((c) => c.low));
  const today = candles[indexOfD];

  return {
    newHigh: today.high >= priorMaxHigh,
    newLow: today.low <= priorMinLow,
  };
}

export interface DailyAggregateInput {
  totalUniverseSize: number;
  missingSymbolCount: number;
  evaluableResults: SymbolDayResult[];
}

export interface DailyAggregateOutput {
  universeSize: number;
  newHighs: number;
  newLows: number;
  newHighs20: number;
  newLows20: number;
  stackedCount: number;
  partial: boolean;
}

export function hasSufficientCoverage(
  evaluableCount: number,
  expectedSymbolCount: number,
): boolean {
  if (expectedSymbolCount <= 0) {
    return false;
  }
  return evaluableCount / expectedSymbolCount >= MIN_EVALUABLE_COVERAGE;
}

export function aggregateDay(input: DailyAggregateInput): DailyAggregateOutput {
  const newHighs = input.evaluableResults.filter((r) => r.newHigh).length;
  const newLows = input.evaluableResults.filter((r) => r.newLow).length;
  const newHighs20 = input.evaluableResults.filter((r) => r.newHigh20).length;
  const newLows20 = input.evaluableResults.filter((r) => r.newLow20).length;
  const stackedCount = input.evaluableResults.filter((r) => r.stacked).length;
  const missingRatio =
    input.totalUniverseSize > 0
      ? input.missingSymbolCount / input.totalUniverseSize
      : 0;

  return {
    universeSize: input.evaluableResults.length,
    newHighs,
    newLows,
    newHighs20,
    newLows20,
    stackedCount,
    partial: missingRatio > PARTIAL_RUN_MISSING_THRESHOLD,
  };
}
