export interface BreadthCandle {
  date: string;
  high: number;
  low: number;
}

export interface SymbolDayResult {
  evaluable: boolean;
  newHigh: boolean;
  newLow: boolean;
}

export const REQUIRED_TRAILING_SESSIONS = 252;
export const PARTIAL_RUN_MISSING_THRESHOLD = 0.05;

// Window is candles[indexOfD - window .. indexOfD - 1] — D is excluded from
// its own comparison, and equality counts as a new high/low (a retest).
export function evaluateSymbolOnDate(
  candles: BreadthCandle[],
  indexOfD: number,
  window: number = REQUIRED_TRAILING_SESSIONS,
): SymbolDayResult {
  if (indexOfD < window || indexOfD >= candles.length) {
    return { evaluable: false, newHigh: false, newLow: false };
  }

  const trailing = candles.slice(indexOfD - window, indexOfD);
  const maxHigh = Math.max(...trailing.map((c) => c.high));
  const minLow = Math.min(...trailing.map((c) => c.low));
  const today = candles[indexOfD];

  return {
    evaluable: true,
    newHigh: today.high >= maxHigh,
    newLow: today.low <= minLow,
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
  partial: boolean;
}

export function aggregateDay(input: DailyAggregateInput): DailyAggregateOutput {
  const newHighs = input.evaluableResults.filter((r) => r.newHigh).length;
  const newLows = input.evaluableResults.filter((r) => r.newLow).length;
  const missingRatio =
    input.totalUniverseSize > 0
      ? input.missingSymbolCount / input.totalUniverseSize
      : 0;

  return {
    universeSize: input.evaluableResults.length,
    newHighs,
    newLows,
    partial: missingRatio > PARTIAL_RUN_MISSING_THRESHOLD,
  };
}
