import { Inject, Injectable, Logger } from '@nestjs/common';
import { MarketBreadthRepository } from '../domain/repositories/market-breadth.repository.interface';
import {
  MARKET_BREADTH_MARKET_DATA_SERVICE,
  MARKET_BREADTH_REPOSITORY,
} from '../constants/tokens';
import { stackedRatio } from '../domain/services/moving-average.service';
import {
  BreadthState,
  SLOW_EMA_SESSIONS,
  emaCrossoverSeries,
} from '../domain/services/ema-crossover.service';
import { BreadthDate } from '../domain/value-objects/breadth-date';
import { type MarketDataService } from '../../market-data/market-data.module';
import { DateRange } from '../../../shared/value-objects/date-range';
import { Symbol } from '../../../shared/value-objects/symbol';

const DEFAULT_SESSION_LIMIT = 50;
const WARMUP_SESSIONS = SLOW_EMA_SESSIONS - 1;
const EQUAL_WEIGHT_BENCHMARK = Symbol.of('RSP');
const BENCHMARK_WARMUP_CALENDAR_DAYS = 60;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface BenchmarkPoint {
  close: number;
  ema10: number | null;
  ema20: number | null;
}

export interface MarketBreadthSessionDto {
  date: string;
  universeSize: number;
  newHighs: number;
  newHighsShare: number | null;
  newHighsShareEma10: number | null;
  newHighsShareEma20: number | null;
  newHighsState: BreadthState | null;
  equalWeightClose: number | null;
  equalWeightEma10: number | null;
  equalWeightEma20: number | null;
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
  private readonly logger = new Logger(QueryMarketBreadthUseCase.name);

  constructor(
    @Inject(MARKET_BREADTH_REPOSITORY)
    private readonly repository: MarketBreadthRepository,
    @Inject(MARKET_BREADTH_MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
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
    const trendSeries = emaCrossoverSeries(
      orderedWithWarmup.map((aggregate) =>
        stackedRatio(aggregate.stackedCount, aggregate.universeSize),
      ),
    );

    const ordered = orderedWithWarmup.slice(-limit);
    const newHighLowSessions = newHighLowSeries.sessions.slice(-limit);
    const trendSessions = trendSeries.sessions.slice(-limit);

    const benchmark = await this.loadBenchmark(ordered[0]?.date);

    const sessions = ordered.map((aggregate, index) => {
      const equalWeight = benchmark.get(aggregate.date.toISOString());
      return {
        date: aggregate.date.toISOString(),
        universeSize: aggregate.universeSize,
        newHighs: aggregate.newHighs,
        newHighsShare: newHighLowSessions[index].ratio,
        newHighsShareEma10: newHighLowSessions[index].ema10,
        newHighsShareEma20: newHighLowSessions[index].ema20,
        newHighsState: newHighLowSessions[index].state,
        equalWeightClose: equalWeight?.close ?? null,
        equalWeightEma10: equalWeight?.ema10 ?? null,
        equalWeightEma20: equalWeight?.ema20 ?? null,
        stackedCount: aggregate.stackedCount,
        stackedRatio: trendSessions[index].ratio,
        stackedRatioEma10: trendSessions[index].ema10,
        stackedRatioEma20: trendSessions[index].ema20,
        trendState: trendSessions[index].state,
        missingSymbols: aggregate.missingSymbols,
        partial: aggregate.partial,
        backfilled: aggregate.backfilled,
      };
    });

    return {
      sessions,
      newHighLow: newHighLowSeries.gauge,
      trend: trendSeries.gauge,
    };
  }

  private async loadBenchmark(
    firstSession: BreadthDate | undefined,
  ): Promise<Map<string, BenchmarkPoint>> {
    if (!firstSession) {
      return new Map();
    }
    try {
      const start = new Date(
        firstSession.value.getTime() -
          BENCHMARK_WARMUP_CALENDAR_DAYS * MS_PER_DAY,
      );
      const { pricePoints } = await this.marketDataService.getHistoricalData(
        EQUAL_WEIGHT_BENCHMARK,
        DateRange.of(start, new Date()),
        '1d',
      );
      const candles = pricePoints
        .map((p) => ({
          date: BreadthDate.of(p.date).toISOString(),
          close: p.close,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      const { sessions } = emaCrossoverSeries(candles.map((c) => c.close));
      return new Map(
        candles.map((c, index) => [
          c.date,
          {
            close: c.close,
            ema10: sessions[index].ema10,
            ema20: sessions[index].ema20,
          },
        ]),
      );
    } catch (error) {
      this.logger.warn(
        `Equal-weight benchmark unavailable: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      return new Map();
    }
  }
}
