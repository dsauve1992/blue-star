import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  MarketBreadthAnalysisService,
  MarketBreadthRunResult,
} from '../../domain/services/market-breadth-analysis.service';
import { MarketBreadthUniverseService } from '../../domain/services/market-breadth-universe.service';
import { MarketBreadthRepository } from '../../domain/repositories/market-breadth.repository.interface';
import { MarketBreadthAggregate } from '../../domain/entities/market-breadth-aggregate';
import { BreadthDate } from '../../domain/value-objects/breadth-date';
import {
  aggregateDay,
  BreadthCandle,
  evaluateSymbolOnDate,
  SymbolDayResult,
} from '../../domain/services/symbol-breadth-evaluation.service';
import {
  MARKET_BREADTH_REPOSITORY,
  MARKET_BREADTH_MARKET_DATA_SERVICE,
  MARKET_BREADTH_UNIVERSE_SERVICE,
} from '../../constants/tokens';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';

export const RECOMPUTE_SESSIONS = 5;
export const DAILY_CANDLE_LOOKBACK_DAYS = 400;
export const BACKFILL_SESSIONS = 60;
export const BACKFILL_CANDLE_LOOKBACK_DAYS = 520;

const FETCH_CONCURRENCY = 10;

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let cursor = 0;

  async function runNext(): Promise<void> {
    const index = cursor++;
    if (index >= items.length) {
      return;
    }
    results[index] = await worker(items[index]);
    await runNext();
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => runNext(),
  );
  await Promise.all(workers);

  return results;
}

function toBreadthCandles(pricePoints: PricePoint[]): BreadthCandle[] {
  return pricePoints
    .map((p) => ({
      date: BreadthDate.of(p.date).toISOString(),
      high: p.high,
      low: p.low,
      close: p.close,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

@Injectable()
export class MarketBreadthAnalysisServiceImpl
  implements MarketBreadthAnalysisService
{
  private readonly logger = new Logger(MarketBreadthAnalysisServiceImpl.name);

  constructor(
    @Inject(MARKET_BREADTH_UNIVERSE_SERVICE)
    private readonly universeService: MarketBreadthUniverseService,
    @Inject(MARKET_BREADTH_MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    @Inject(MARKET_BREADTH_REPOSITORY)
    private readonly repository: MarketBreadthRepository,
  ) {}

  async runDaily(): Promise<MarketBreadthRunResult> {
    const payload = await this.universeService.fetchUniverse();
    const scanDate = BreadthDate.fromISOString(payload.scan_date);

    await this.repository.saveMembership(scanDate, payload.symbols);

    return this.recompute({
      payload,
      lookbackCalendarDays: DAILY_CANDLE_LOOKBACK_DAYS,
      sessions: RECOMPUTE_SESSIONS,
      backfilled: false,
    });
  }

  async runBackfill(
    sessions: number = BACKFILL_SESSIONS,
  ): Promise<MarketBreadthRunResult> {
    const payload = await this.universeService.fetchUniverse();

    return this.recompute({
      payload,
      lookbackCalendarDays: BACKFILL_CANDLE_LOOKBACK_DAYS,
      sessions,
      backfilled: true,
    });
  }

  private async recompute(params: {
    payload: { scan_date: string; universe_size: number; symbols: string[] };
    lookbackCalendarDays: number;
    sessions: number;
    backfilled: boolean;
  }): Promise<MarketBreadthRunResult> {
    const { payload, lookbackCalendarDays, sessions, backfilled } = params;

    const dateRange = this.buildLookbackRange(lookbackCalendarDays);

    const { candlesBySymbol, missingSymbols } = await this.fetchCandles(
      payload.symbols,
      dateRange,
    );

    const sessionDates = this.determineRecentSessionDates(
      candlesBySymbol,
      sessions,
    );

    const aggregates: MarketBreadthAggregate[] = [];
    for (const sessionDate of sessionDates) {
      const aggregate = this.computeAndBuildAggregate({
        sessionDate,
        candlesBySymbol,
        totalUniverseSize: payload.symbols.length,
        missingSymbols,
        backfilled,
      });
      await this.repository.saveAggregate(aggregate);
      aggregates.push(aggregate);
    }

    return {
      scanDate: payload.scan_date,
      universeSize: payload.universe_size,
      sessionsRecomputed: sessionDates,
      aggregates,
    };
  }

  private buildLookbackRange(calendarDays: number): DateRange {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - calendarDays);
    return DateRange.of(startDate, endDate);
  }

  private async fetchCandles(
    symbols: string[],
    dateRange: DateRange,
  ): Promise<{
    candlesBySymbol: Map<string, BreadthCandle[]>;
    missingSymbols: string[];
  }> {
    const candlesBySymbol = new Map<string, BreadthCandle[]>();
    const missingSymbols: string[] = [];

    await runWithConcurrency(symbols, FETCH_CONCURRENCY, async (symbol) => {
      const pricePoints = await this.fetchSymbolCandlesWithRetry(
        symbol,
        dateRange,
      );
      if (pricePoints === null) {
        missingSymbols.push(symbol);
        return;
      }
      candlesBySymbol.set(symbol, toBreadthCandles(pricePoints));
    });

    return { candlesBySymbol, missingSymbols };
  }

  private async fetchSymbolCandlesWithRetry(
    symbol: string,
    dateRange: DateRange,
  ): Promise<PricePoint[] | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const symbolVo = Symbol.of(symbol);
        const historicalData = await this.marketDataService.getHistoricalData(
          symbolVo,
          dateRange,
          '1d',
        );
        return historicalData.pricePoints;
      } catch (error) {
        if (attempt === 1) {
          this.logger.warn(
            `Market breadth candle fetch failed for ${symbol} after retry: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }
    }
    return null;
  }

  private determineRecentSessionDates(
    candlesBySymbol: Map<string, BreadthCandle[]>,
    count: number,
  ): string[] {
    let longest: BreadthCandle[] | null = null;
    for (const candles of candlesBySymbol.values()) {
      if (!longest || candles.length > longest.length) {
        longest = candles;
      }
    }

    if (!longest || longest.length === 0) {
      throw new Error(
        'Unable to determine trading sessions: no symbol in the universe returned any candles',
      );
    }

    return longest.slice(-count).map((c) => c.date);
  }

  private computeAndBuildAggregate(params: {
    sessionDate: string;
    candlesBySymbol: Map<string, BreadthCandle[]>;
    totalUniverseSize: number;
    missingSymbols: string[];
    backfilled: boolean;
  }): MarketBreadthAggregate {
    const {
      sessionDate,
      candlesBySymbol,
      totalUniverseSize,
      missingSymbols,
      backfilled,
    } = params;

    const evaluableResults: SymbolDayResult[] = [];
    for (const candles of candlesBySymbol.values()) {
      const indexOfDate = candles.findIndex((c) => c.date === sessionDate);
      if (indexOfDate === -1) {
        continue;
      }
      const result = evaluateSymbolOnDate(candles, indexOfDate);
      if (result.evaluable) {
        evaluableResults.push(result);
      }
    }

    const { universeSize, newHighs, newLows, stackedCount, partial } =
      aggregateDay({
        totalUniverseSize,
        missingSymbolCount: missingSymbols.length,
        evaluableResults,
      });

    return MarketBreadthAggregate.create({
      date: BreadthDate.fromISOString(sessionDate),
      universeSize,
      newHighs,
      newLows,
      stackedCount,
      missingSymbols,
      partial,
      backfilled,
    });
  }
}
