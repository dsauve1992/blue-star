import { Inject, Injectable } from '@nestjs/common';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import { MARKET_BREADTH_REPOSITORY } from '../constants/tokens';
import {
  gaugeParticipation,
  ParticipationRegime,
  trailingAverageRatios,
} from '../domain/services/participation-regime.service';
import {
  stackedRatio,
  TREND_SLOW_SMA_SESSIONS,
  trendBreadthSeries,
  TrendState,
} from '../domain/services/trend-breadth.service';

const DEFAULT_SESSION_LIMIT = 50;
const TREND_WARMUP_SESSIONS = TREND_SLOW_SMA_SESSIONS - 1;

export interface MarketBreadthSessionDto {
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

export interface ParticipationGaugeDto {
  averageRatio: number;
  regime: ParticipationRegime;
  sampleSize: number;
}

export interface TrendGaugeDto {
  state: TrendState;
  sma5: number;
  sma20: number;
  sampleSize: number;
}

export interface QueryMarketBreadthResponseDto {
  sessions: MarketBreadthSessionDto[];
  participation: ParticipationGaugeDto | null;
  trend: TrendGaugeDto | null;
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
    const aggregates = await this.repository.getRecentAggregates(
      limit + TREND_WARMUP_SESSIONS,
    );

    const orderedWithWarmup = [...aggregates].reverse();
    const trendSeries = trendBreadthSeries(
      orderedWithWarmup.map((aggregate) =>
        stackedRatio(aggregate.stackedCount, aggregate.universeSize),
      ),
    );

    const ordered = orderedWithWarmup.slice(-limit);
    const trendSessions = trendSeries.sessions.slice(-limit);
    const ratios = ordered.map((aggregate) => aggregate.ratio);
    const averageRatios = trailingAverageRatios(ratios);

    const sessions = ordered.map((aggregate, index) => ({
      date: aggregate.date.toISOString(),
      universeSize: aggregate.universeSize,
      newHighs: aggregate.newHighs,
      newLows: aggregate.newLows,
      ratio: aggregate.ratio,
      averageRatio: averageRatios[index],
      stackedCount: aggregate.stackedCount,
      stackedRatio: trendSessions[index].ratio,
      stackedRatioSma5: trendSessions[index].sma5,
      stackedRatioSma20: trendSessions[index].sma20,
      trendState: trendSessions[index].state,
      missingSymbols: aggregate.missingSymbols,
      partial: aggregate.partial,
      backfilled: aggregate.backfilled,
    }));

    const participation = gaugeParticipation(ratios);

    return { sessions, participation, trend: trendSeries.trend };
  }
}
