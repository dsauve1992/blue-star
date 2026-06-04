import type { MarketRegime } from '../entities/market-regime.entity';

export interface MarketRegimeRepository {
  save(regime: MarketRegime): Promise<void>;
  findLatest(): Promise<MarketRegime | null>;
}
