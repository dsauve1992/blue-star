export interface MarketBreadthSession {
  date: string;
  universeSize: number;
  newHighs: number;
  newLows: number;
  ratio: number | null;
  missingSymbols: string[];
  partial: boolean;
  backfilled: boolean;
}

export interface MarketBreadthResponse {
  sessions: MarketBreadthSession[];
}
