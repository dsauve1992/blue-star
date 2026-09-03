import { MarketBreadthAggregate } from '../entities/market-breadth-aggregate';

export interface MarketBreadthRunResult {
  scanDate: string;
  universeSize: number;
  sessionsRecomputed: string[];
  aggregates: MarketBreadthAggregate[];
}

export interface MarketBreadthAnalysisService {
  runDaily(): Promise<MarketBreadthRunResult>;
  runBackfill(sessions: number): Promise<MarketBreadthRunResult>;
}
