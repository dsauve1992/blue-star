import { Inject, Injectable } from '@nestjs/common';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import { MARKET_BREADTH_REPOSITORY } from '../constants/tokens';

const DEFAULT_SESSION_LIMIT = 50;

export interface MarketBreadthSessionDto {
  date: string;
  universeSize: number;
  newHighs: number;
  newLows: number;
  ratio: number | null;
  missingSymbols: string[];
  partial: boolean;
  backfilled: boolean;
}

export interface QueryMarketBreadthResponseDto {
  sessions: MarketBreadthSessionDto[];
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

    const sessions = [...aggregates].reverse().map((aggregate) => ({
      date: aggregate.date.toISOString(),
      universeSize: aggregate.universeSize,
      newHighs: aggregate.newHighs,
      newLows: aggregate.newLows,
      ratio: aggregate.ratio,
      missingSymbols: aggregate.missingSymbols,
      partial: aggregate.partial,
      backfilled: aggregate.backfilled,
    }));

    return { sessions };
  }
}
