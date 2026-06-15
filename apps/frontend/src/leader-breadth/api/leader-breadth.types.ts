export type BreadthRegime = 'GREEN' | 'YELLOW' | 'RED';

export type BreadthDirection = 'RISING' | 'FALLING' | 'FLAT';

export interface BreadthSeriesPoint {
  scanDate: string;
  leaderCount: number;
  leaderPct: number;
}

export interface LeaderBreadthResponse {
  /** Null when no completed scan exists yet. */
  scanDate: string | null;
  regime: BreadthRegime | null;
  leaderCount: number | null;
  /** Trailing mean of the leader count over the lookback window. */
  breadthMa: number | null;
  /** leaderCount / universeSize for the latest run, in [0, 1]. */
  leaderPct: number | null;
  direction: BreadthDirection | null;
  /** Number of completed runs the gauge was computed from. */
  sampleSize: number;
  /** True until enough weekly runs accumulate for the gauge to be trusted. */
  provisional: boolean;
  /** Oldest-to-newest trend, for the sparkline. */
  series: BreadthSeriesPoint[];
}
