import type { MarketHealth } from '../entities/market-health.entity';

export interface MarketHealthRepository {
  save(marketHealth: MarketHealth): Promise<void>;
  findLatest(): Promise<MarketHealth | null>;
}
