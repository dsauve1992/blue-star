import { Inject, Injectable } from '@nestjs/common';
import type { MarketRegimeRepository } from '../domain/repositories/market-regime.repository.interface';
import type { LeaderBreadthRepository } from '../domain/repositories/leader-breadth.repository.interface';
import type { MarketRegime } from '../domain/entities/market-regime.entity';
import type { LeaderBreadthSnapshot } from '../domain/entities/leader-breadth-snapshot.entity';
import {
  LEADER_BREADTH_REPOSITORY,
  MARKET_REGIME_REPOSITORY,
} from '../constants/tokens';

export type GetMarketRegimeResult = {
  regime: MarketRegime | null;
  breadthSeries: LeaderBreadthSnapshot[];
};

@Injectable()
export class GetMarketRegimeUseCase {
  // ~60 days of breadth snapshots for charting the leader-breadth series.
  private readonly BREADTH_SERIES_LIMIT = 60;

  constructor(
    @Inject(MARKET_REGIME_REPOSITORY)
    private readonly marketRegimeRepository: MarketRegimeRepository,
    @Inject(LEADER_BREADTH_REPOSITORY)
    private readonly leaderBreadthRepository: LeaderBreadthRepository,
  ) {}

  async execute(): Promise<GetMarketRegimeResult> {
    const regime = await this.marketRegimeRepository.findLatest();
    const breadthSeries = await this.leaderBreadthRepository.findRecent(
      this.BREADTH_SERIES_LIMIT,
    );

    return { regime, breadthSeries };
  }
}
