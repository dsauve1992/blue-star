import { BreadthRegime } from '../value-objects/breadth-regime';

/**
 * Minimal projection of a completed leader-scan run needed to gauge breadth.
 * Decoupled from the LeaderScanRun entity so the classifier is a pure
 * function over plain data and trivially unit-testable.
 */
export interface BreadthRunSample {
  scanDate: string; // ISO date (YYYY-MM-DD)
  leaderCount: number;
  universeSize: number;
}

export type BreadthDirection = 'RISING' | 'FALLING' | 'FLAT';

export interface BreadthSeriesPoint {
  scanDate: string;
  leaderCount: number;
  leaderPct: number;
}

export interface BreadthSnapshot {
  scanDate: string;
  regime: BreadthRegime;
  leaderCount: number;
  /** Trailing mean of leaderCount over the lookback window. */
  breadthMa: number;
  /** leaderCount / universeSize for the latest run, in [0, 1]. */
  leaderPct: number;
  direction: BreadthDirection;
  /**
   * Number of completed runs the gauge was computed from. When this is below
   * MIN_RUNS_FOR_CONFIDENCE the regime is `provisional` and should be read as
   * a hint, not a signal.
   */
  sampleSize: number;
  provisional: boolean;
  /** Oldest-to-newest trend, for a dashboard sparkline. */
  series: BreadthSeriesPoint[];
}

/** Trailing window for the moving average (~20 weeks ≈ one quarter+). */
export const BREADTH_LOOKBACK = 20;

/**
 * Below this many completed runs the moving average is too thin to trust, so
 * the regime is flagged `provisional`. ~8 weeks gives the MA enough body to
 * mean something without making the gauge useless for two months.
 */
export const MIN_RUNS_FOR_CONFIDENCE = 8;

/**
 * Classify the current market regime from the leader-count breadth trend.
 *
 * The gauge is the count of leaders relative to its own recent history — a
 * long, expanding list = risk-on (GREEN); a contracting list = deteriorating
 * (RED). Direction breaks the tie:
 *   - GREEN: leaderCount >= MA and rising (expanding leadership)
 *   - RED:   leaderCount <  MA and falling (contracting leadership)
 *   - YELLOW: anything mixed (above-but-falling, below-but-rising, or flat)
 *
 * `runs` may be in any order; only completed runs with a usable universe
 * should be passed. Returns null when there is nothing to classify.
 */
export function classifyBreadth(
  runs: BreadthRunSample[],
  lookback: number = BREADTH_LOOKBACK,
): BreadthSnapshot | null {
  if (runs.length === 0) {
    return null;
  }

  // Newest first, then take the lookback window.
  const ordered = [...runs].sort((a, b) =>
    b.scanDate.localeCompare(a.scanDate),
  );
  const window = ordered.slice(0, lookback);

  const latest = window[0];
  const prior = window[1];

  const breadthMa =
    window.reduce((sum, r) => sum + r.leaderCount, 0) / window.length;

  const leaderPct =
    latest.universeSize > 0 ? latest.leaderCount / latest.universeSize : 0;

  const direction: BreadthDirection = !prior
    ? 'FLAT'
    : latest.leaderCount > prior.leaderCount
      ? 'RISING'
      : latest.leaderCount < prior.leaderCount
        ? 'FALLING'
        : 'FLAT';

  const aboveMa = latest.leaderCount >= breadthMa;
  let regime: BreadthRegime;
  if (aboveMa && direction === 'RISING') {
    regime = BreadthRegime.green();
  } else if (!aboveMa && direction === 'FALLING') {
    regime = BreadthRegime.red();
  } else {
    regime = BreadthRegime.yellow();
  }

  // Oldest-to-newest for charting.
  const series: BreadthSeriesPoint[] = [...window].reverse().map((r) => ({
    scanDate: r.scanDate,
    leaderCount: r.leaderCount,
    leaderPct: r.universeSize > 0 ? r.leaderCount / r.universeSize : 0,
  }));

  return {
    scanDate: latest.scanDate,
    regime,
    leaderCount: latest.leaderCount,
    breadthMa,
    leaderPct,
    direction,
    sampleSize: window.length,
    provisional: window.length < MIN_RUNS_FOR_CONFIDENCE,
    series,
  };
}
