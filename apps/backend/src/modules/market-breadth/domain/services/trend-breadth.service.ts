import { trailingAverageRatios } from './participation-regime.service';

export type TrendState = 'GOOD' | 'BAD';

export const TREND_FAST_SMA_SESSIONS = 5;
export const TREND_SLOW_SMA_SESSIONS = 20;
export const TREND_MIN_RATIOS_FOR_STATE = 2;

export interface TrendBreadthSession {
  ratio: number | null;
  sma5: number | null;
  sma20: number | null;
  state: TrendState | null;
}

export interface TrendBreadthGauge {
  state: TrendState;
  sma5: number;
  sma20: number;
  sampleSize: number;
}

export interface TrendBreadthSeries {
  sessions: TrendBreadthSession[];
  trend: TrendBreadthGauge | null;
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

export function classifyTrend(sma5: number, sma20: number): TrendState {
  return sma5 >= sma20 ? 'GOOD' : 'BAD';
}

export function trendBreadthSeries(
  ratiosOldestToNewest: Array<number | null>,
): TrendBreadthSeries {
  const fastAverages = trailingAverageRatios(
    ratiosOldestToNewest,
    TREND_FAST_SMA_SESSIONS,
  );
  const slowAverages = trailingAverageRatios(
    ratiosOldestToNewest,
    TREND_SLOW_SMA_SESSIONS,
  );

  let ratiosSeen = 0;
  const sessions = ratiosOldestToNewest.map((ratio, index) => {
    if (ratio !== null) {
      ratiosSeen += 1;
    }
    const sma5 = fastAverages[index];
    const sma20 = slowAverages[index];
    const state =
      sma5 !== null &&
      sma20 !== null &&
      ratiosSeen >= TREND_MIN_RATIOS_FOR_STATE
        ? classifyTrend(sma5, sma20)
        : null;
    return { ratio, sma5, sma20, state };
  });

  return { sessions, trend: latestGauge(sessions, ratiosSeen) };
}

function latestGauge(
  sessions: TrendBreadthSession[],
  totalRatios: number,
): TrendBreadthGauge | null {
  const latest = sessions.at(-1);
  if (
    latest === undefined ||
    latest.state === null ||
    latest.sma5 === null ||
    latest.sma20 === null
  ) {
    return null;
  }

  return {
    state: latest.state,
    sma5: latest.sma5,
    sma20: latest.sma20,
    sampleSize: Math.min(totalRatios, TREND_SLOW_SMA_SESSIONS),
  };
}
