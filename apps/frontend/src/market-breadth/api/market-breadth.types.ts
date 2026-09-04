export type BreadthState = "GOOD" | "BAD";

export interface MarketBreadthSession {
  date: string;
  universeSize: number;
  newHighs: number;
  newLows: number;
  ratio: number | null;
  ratioEma10: number | null;
  ratioEma20: number | null;
  ratioState: BreadthState | null;
  stackedCount: number | null;
  stackedRatio: number | null;
  stackedRatioEma10: number | null;
  stackedRatioEma20: number | null;
  trendState: BreadthState | null;
  missingSymbols: string[];
  partial: boolean;
  backfilled: boolean;
}

export interface BreadthGauge {
  state: BreadthState;
  ema10: number;
  ema20: number;
  sampleSize: number;
}

export interface MarketBreadthResponse {
  sessions: MarketBreadthSession[];
  newHighLow: BreadthGauge | null;
  trend: BreadthGauge | null;
}
