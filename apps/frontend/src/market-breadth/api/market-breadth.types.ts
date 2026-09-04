export type TrendState = "GOOD" | "BAD";

export interface MarketBreadthSession {
  date: string;
  universeSize: number;
  newHighs: number;
  newLows: number;
  ratio: number | null;
  averageRatio: number | null;
  stackedCount: number | null;
  stackedRatio: number | null;
  stackedRatioSma5: number | null;
  stackedRatioSma20: number | null;
  trendState: TrendState | null;
  missingSymbols: string[];
  partial: boolean;
  backfilled: boolean;
}

export type ParticipationRegime = "GREEN" | "YELLOW" | "RED";

export interface ParticipationGauge {
  averageRatio: number;
  regime: ParticipationRegime;
  sampleSize: number;
}

export interface TrendGauge {
  state: TrendState;
  sma5: number;
  sma20: number;
  sampleSize: number;
}

export interface MarketBreadthResponse {
  sessions: MarketBreadthSession[];
  participation: ParticipationGauge | null;
  trend: TrendGauge | null;
}
