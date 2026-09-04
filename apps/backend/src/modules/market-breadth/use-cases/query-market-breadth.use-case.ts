import { Inject, Injectable } from '@nestjs/common';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import { MARKET_BREADTH_REPOSITORY } from '../constants/tokens';
import {
  gaugeParticipation,
  ParticipationRegime,
  trailingAverageRatios,
} from '../domain/services/participation-regime.service';

const DEFAULT_SESSION_LIMIT = 50;

export interface MarketBreadthSessionDto {
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

export interface ParticipationGaugeDto {
  averageRatio: number;
  regime: ParticipationRegime;
  sampleSize: number;
}

export interface QueryMarketBreadthResponseDto {
  sessions: MarketBreadthSessionDto[];
  participation: ParticipationGaugeDto | null;
}

@Injectable()
export class QueryMarketBreadthUseCase {
  constructor(
    @Inject(MARKET_BREADTH_REPOSITORY)
    private readonly repository: MarketBreadthRepository,
  ) {}

  async execute(
    limit: number = DEFAULT_SESSION_LIMIT,
  ): Promise<QueryMarketBreadthResponseDto> {
    const aggregates = await this.repository.getRecentAggregates(limit);

    const ordered = [...aggregates].reverse();
    const ratios = ordered.map((aggregate) => aggregate.ratio);
    const averageRatios = trailingAverageRatios(ratios);

    const sessions = ordered.map((aggregate, index) => ({
      date: aggregate.date.toISOString(),
      universeSize: aggregate.universeSize,
      newHighs: aggregate.newHighs,
      newLows: aggregate.newLows,
      ratio: aggregate.ratio,
      averageRatio: averageRatios[index],
      missingSymbols: aggregate.missingSymbols,
      partial: aggregate.partial,
      backfilled: aggregate.backfilled,
    }));

    const participation = gaugeParticipation(ratios);

    return { sessions, participation };
  }
}
