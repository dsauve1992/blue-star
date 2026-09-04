export type BreadthState = 'GOOD' | 'BAD';

export const FAST_EMA_SESSIONS = 10;
export const SLOW_EMA_SESSIONS = 20;
export const MIN_RATIOS_FOR_STATE = 2;

export interface EmaCrossoverSession {
  ratio: number | null;
  ema10: number | null;
  ema20: number | null;
  state: BreadthState | null;
}

export interface EmaCrossoverGauge {
  state: BreadthState;
  ema10: number;
  ema20: number;
  sampleSize: number;
}

export interface EmaCrossoverSeries {
  sessions: EmaCrossoverSession[];
  gauge: EmaCrossoverGauge | null;
}

export function trailingExponentialAverages(
  ratiosOldestToNewest: Array<number | null>,
  period: number,
): Array<number | null> {
  const multiplier = 2 / (period + 1);
  let ema: number | null = null;
  return ratiosOldestToNewest.map((ratio) => {
    if (ratio !== null) {
      ema = ema === null ? ratio : ratio * multiplier + ema * (1 - multiplier);
    }
    return ema;
  });
}

export function classifyCrossover(ema10: number, ema20: number): BreadthState {
  return ema10 >= ema20 ? 'GOOD' : 'BAD';
}

export function emaCrossoverSeries(
  ratiosOldestToNewest: Array<number | null>,
): EmaCrossoverSeries {
  const fastAverages = trailingExponentialAverages(
    ratiosOldestToNewest,
    FAST_EMA_SESSIONS,
  );
  const slowAverages = trailingExponentialAverages(
    ratiosOldestToNewest,
    SLOW_EMA_SESSIONS,
  );

  let ratiosSeen = 0;
  const sessions = ratiosOldestToNewest.map((ratio, index) => {
    if (ratio !== null) {
      ratiosSeen += 1;
    }
    const ema10 = fastAverages[index];
    const ema20 = slowAverages[index];
    const state =
      ema10 !== null && ema20 !== null && ratiosSeen >= MIN_RATIOS_FOR_STATE
        ? classifyCrossover(ema10, ema20)
        : null;
    return { ratio, ema10, ema20, state };
  });

  return { sessions, gauge: latestGauge(sessions, ratiosSeen) };
}

function latestGauge(
  sessions: EmaCrossoverSession[],
  totalRatios: number,
): EmaCrossoverGauge | null {
  const latest = sessions.at(-1);
  if (
    latest === undefined ||
    latest.state === null ||
    latest.ema10 === null ||
    latest.ema20 === null
  ) {
    return null;
  }

  return {
    state: latest.state,
    ema10: latest.ema10,
    ema20: latest.ema20,
    sampleSize: Math.min(totalRatios, SLOW_EMA_SESSIONS),
  };
}
