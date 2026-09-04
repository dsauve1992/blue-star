export interface MarketBreadthSession {
  date: string;
  universeSize: number;
  newHighs: number;
  newLows: number;
  ratio: number | null;
  averageRatio: number | null;
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

export interface MarketBreadthResponse {
  sessions: MarketBreadthSession[];
  participation: ParticipationGauge | null;
}
