import { Inject, Injectable } from '@nestjs/common';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import { MARKET_BREADTH_REPOSITORY } from '../constants/tokens';
import { stackedRatio } from '../domain/services/moving-average.service';
import {
  BreadthState,
  SLOW_EMA_SESSIONS,
  emaCrossoverSeries,
} from '../domain/services/ema-crossover.service';

const DEFAULT_SESSION_LIMIT = 50;
const WARMUP_SESSIONS = SLOW_EMA_SESSIONS - 1;

export interface MarketBreadthSessionDto {
  date: string;
  universeSize: number;
  newHighs: number;
  newLows: number;
  ratio: number | null;
  ratioEma10: number | null;
  ratioEma20: number | null;
  ratioState: BreadthState | null;
  stackedCount: number | null;
  stackedRatio: number | null;
  stackedRatioEma10: number | null;
  stackedRatioEma20: number | null;
  trendState: BreadthState | null;
  missingSymbols: string[];
  partial: boolean;
  backfilled: boolean;
}

export interface BreadthGaugeDto {
  state: BreadthState;
  ema10: number;
  ema20: number;
  sampleSize: number;
}

export interface QueryMarketBreadthResponseDto {
  sessions: MarketBreadthSessionDto[];
  newHighLow: BreadthGaugeDto | null;
  trend: BreadthGaugeDto | null;
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
      limit + WARMUP_SESSIONS,
    );

    const orderedWithWarmup = [...aggregates].reverse();
    const newHighLowSeries = emaCrossoverSeries(
      orderedWithWarmup.map((aggregate) => aggregate.ratio),
    );
    const trendSeries = emaCrossoverSeries(
      orderedWithWarmup.map((aggregate) =>
        stackedRatio(aggregate.stackedCount, aggregate.universeSize),
      ),
    );

    const ordered = orderedWithWarmup.slice(-limit);
    const newHighLowSessions = newHighLowSeries.sessions.slice(-limit);
    const trendSessions = trendSeries.sessions.slice(-limit);

    const sessions = ordered.map((aggregate, index) => ({
      date: aggregate.date.toISOString(),
      universeSize: aggregate.universeSize,
      newHighs: aggregate.newHighs,
      newLows: aggregate.newLows,
      ratio: aggregate.ratio,
      ratioEma10: newHighLowSessions[index].ema10,
      ratioEma20: newHighLowSessions[index].ema20,
      ratioState: newHighLowSessions[index].state,
      stackedCount: aggregate.stackedCount,
      stackedRatio: trendSessions[index].ratio,
      stackedRatioEma10: trendSessions[index].ema10,
      stackedRatioEma20: trendSessions[index].ema20,
      trendState: trendSessions[index].state,
      missingSymbols: aggregate.missingSymbols,
      partial: aggregate.partial,
      backfilled: aggregate.backfilled,
    }));

    return {
      sessions,
      newHighLow: newHighLowSeries.gauge,
      trend: trendSeries.gauge,
    };
  }
}
