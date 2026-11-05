export type BreadthState = "GOOD" | "BAD";

export interface MarketBreadthSession {
  date: string;
  universeSize: number;
  newHighs: number;
  newHighsShare: number | null;
  newHighsShareEma10: number | null;
  newHighsShareEma20: number | null;
  newHighsState: BreadthState | null;
  newHighs20: number | null;
  newHighs20Share: number | null;
  newHighs20ShareEma10: number | null;
  newHighs20ShareEma20: number | null;
  newHighs20State: BreadthState | null;
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
  newHighLow20: BreadthGauge | null;
  trend: BreadthGauge | null;
}
