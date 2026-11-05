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
  newHighsShare: number | null;
  newHighsShareEma10: number | null;
  newHighsShareEma20: number | null;
  newHighsState: BreadthState | null;
  newHighs20: number | null;
  newHighs20Share: number | null;
  newHighs20ShareEma10: number | null;
  newHighs20ShareEma20: number | null;
  newHighs20State: BreadthState | null;
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
  newHighLow20: BreadthGaugeDto | null;
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
      orderedWithWarmup.map((aggregate) =>
        stackedRatio(aggregate.newHighs, aggregate.universeSize),
      ),
    );
    const newHighLow20Series = emaCrossoverSeries(
      orderedWithWarmup.map((aggregate) =>
        stackedRatio(aggregate.newHighs20, aggregate.universeSize),
      ),
    );
    const trendSeries = emaCrossoverSeries(
      orderedWithWarmup.map((aggregate) =>
        stackedRatio(aggregate.stackedCount, aggregate.universeSize),
      ),
    );

    const ordered = orderedWithWarmup.slice(-limit);
    const newHighLowSessions = newHighLowSeries.sessions.slice(-limit);
    const newHighLow20Sessions = newHighLow20Series.sessions.slice(-limit);
    const trendSessions = trendSeries.sessions.slice(-limit);

    const sessions = ordered.map((aggregate, index) => ({
      date: aggregate.date.toISOString(),
      universeSize: aggregate.universeSize,
      newHighs: aggregate.newHighs,
      newHighsShare: newHighLowSessions[index].ratio,
      newHighsShareEma10: newHighLowSessions[index].ema10,
      newHighsShareEma20: newHighLowSessions[index].ema20,
      newHighsState: newHighLowSessions[index].state,
      newHighs20: aggregate.newHighs20,
      newHighs20Share: newHighLow20Sessions[index].ratio,
      newHighs20ShareEma10: newHighLow20Sessions[index].ema10,
      newHighs20ShareEma20: newHighLow20Sessions[index].ema20,
      newHighs20State: newHighLow20Sessions[index].state,
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
      newHighLow20: newHighLow20Series.gauge,
      trend: trendSeries.gauge,
    };
  }
}
