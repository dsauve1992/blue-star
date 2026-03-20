import { Inject, Injectable } from '@nestjs/common';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import { EMACalculator } from '../../../sector-rotation/infrastructure/utils/ema-calculator';
import {
  BreakoutDetectionResult,
  BreakoutDetectionService as IBreakoutDetectionService,
} from '../../domain/services/breakout-detection.service';
import {
  getMarketDateKey,
  getMarketOpenDateUtc,
  isDuringMarketHours,
} from './market-time.util';

@Injectable()
export class BreakoutDetectionServiceImpl implements IBreakoutDetectionService {
  private static readonly EMA_PERIOD = 9;
  // EMACalculator seeds on bar 0, so values are unreliable for the first ~1–2× period bars.
  // Requiring 1× period (45 min) is the pragmatic warm-up gate; raise to 18 for stricter regimes.
  private static readonly EMA_MINIMUM_BARS = 9;
  private static readonly AVERAGE_VOLUME_LOOKBACK_SESSIONS = 10;
  private static readonly INTRADAY_LOOKBACK_CALENDAR_DAYS = 30;

  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async detect(
    ticker: WatchlistTicker,
    now: Date = new Date(),
  ): Promise<BreakoutDetectionResult> {
    const sorted = await this.fetchSortedMarketBars(ticker, now);
    if (sorted.length === 0) {
      return { ticker, detected: false };
    }

    const sessions = this.buildSessionMap(sorted);
    const orderedSessionKeys = Array.from(sessions.keys()).sort((a, b) =>
      a.localeCompare(b),
    );
    const currentSessionKey = orderedSessionKeys[orderedSessionKeys.length - 1];
    const sessionBars = sessions.get(currentSessionKey) ?? [];

    if (sessionBars.length < BreakoutDetectionServiceImpl.EMA_MINIMUM_BARS) {
      return { ticker, detected: false };
    }

    const latestIndex = sessionBars.length - 1;
    const latestBar = sessionBars[latestIndex];
    const latestTs = latestBar.date.getTime();
    const previousTs = sessionBars[latestIndex - 1].date.getTime();

    const ema9Map = this.sessionEma9(sessionBars);
    const ema9Latest = ema9Map.get(latestTs);
    const ema9Previous = ema9Map.get(previousTs);

    if (ema9Latest === undefined || ema9Previous === undefined) {
      return { ticker, detected: false };
    }

    const ema9Rising = ema9Latest > ema9Previous;
    const volumeSurge = this.hasRequiredVolumeSurge(
      currentSessionKey,
      sessionBars,
      sessions,
      orderedSessionKeys,
    );
    const priorSessionHigh = this.getPriorSessionHigh(
      currentSessionKey,
      sessions,
      orderedSessionKeys,
    );
    // No prior session data means we cannot confirm a range breakout; allow the signal through
    // rather than suppress indefinitely on first-day-of-data edge cases.
    const abovePriorSessionHigh =
      priorSessionHigh === undefined || latestBar.close > priorSessionHigh;

    const detected = ema9Rising && volumeSurge && abovePriorSessionHigh;

    return { ticker, detected };
  }

  private async fetchSortedMarketBars(
    ticker: WatchlistTicker,
    now: Date,
  ): Promise<PricePoint[]> {
    const historicalData = await this.fetchIntradayData(ticker, now);
    return [...historicalData.pricePoints]
      .filter((p) => isDuringMarketHours(p.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Input must be chronologically sorted; bars are inserted in order, preserving intra-session order.
  private buildSessionMap(
    sortedPricePoints: PricePoint[],
  ): Map<string, PricePoint[]> {
    const sessions = new Map<string, PricePoint[]>();
    for (const pricePoint of sortedPricePoints) {
      const key = getMarketDateKey(pricePoint.date);
      const existing = sessions.get(key) ?? [];
      existing.push(pricePoint);
      sessions.set(key, existing);
    }
    return sessions;
  }

  private sessionEma9(pricePoints: PricePoint[]): Map<number, number> {
    const closesByTs = new Map<number, number>();
    const sortedDates: number[] = [];
    for (const p of pricePoints) {
      const ts = p.date.getTime();
      closesByTs.set(ts, p.close);
      sortedDates.push(ts);
    }
    sortedDates.sort((a, b) => a - b);
    return EMACalculator.calculate(
      closesByTs,
      sortedDates,
      BreakoutDetectionServiceImpl.EMA_PERIOD,
    );
  }

  private getPriorSessionHigh(
    currentSessionKey: string,
    sessions: Map<string, PricePoint[]>,
    orderedSessionKeys: string[],
  ): number | undefined {
    const priorKey = orderedSessionKeys
      .filter((k) => k < currentSessionKey)
      .at(-1);
    if (!priorKey) return undefined;
    const priorBars = sessions.get(priorKey) ?? [];
    if (priorBars.length === 0) return undefined;
    return Math.max(...priorBars.map((p) => p.high));
  }

  private hasRequiredVolumeSurge(
    currentSessionKey: string,
    currentSessionBars: PricePoint[],
    sessions: Map<string, PricePoint[]>,
    orderedSessionKeys: string[],
  ): boolean {
    const barsElapsed = currentSessionBars.length;

    const priorSessionKeys = orderedSessionKeys
      .filter((key) => key !== currentSessionKey)
      .filter((key) => (sessions.get(key) ?? []).length >= barsElapsed);

    if (
      priorSessionKeys.length <
      BreakoutDetectionServiceImpl.AVERAGE_VOLUME_LOOKBACK_SESSIONS
    ) {
      return false;
    }

    const lookbackSessionKeys = priorSessionKeys.slice(
      -BreakoutDetectionServiceImpl.AVERAGE_VOLUME_LOOKBACK_SESSIONS,
    );

    const currentCumulativeVolume = currentSessionBars.reduce(
      (sum, bar) => sum + bar.volume,
      0,
    );

    const historicalCumulativeVolumes = lookbackSessionKeys.map((key) =>
      (sessions.get(key) ?? [])
        .slice(0, barsElapsed)
        .reduce((sum, bar) => sum + bar.volume, 0),
    );

    // Older sessions anchor the baseline more than recent ones; a weighted mean
    // with linearly decreasing weights (oldest = highest) achieves this while
    // still being robust to a single outlier sitting at the recent end.
    const baselineVolume = this.weightedMeanOf(historicalCumulativeVolumes);
    if (baselineVolume <= 0) return false;

    return currentCumulativeVolume >= baselineVolume;
  }

  // values[0] = oldest session, values[N-1] = most recent session.
  // Weight for index i = (i + 1), giving the most recent session the highest weight.
  private weightedMeanOf(values: number[]): number {
    const n = values.length;
    let weightedSum = 0;
    let totalWeight = 0;
    for (let i = 0; i < n; i++) {
      const weight = i + 1;
      weightedSum += weight * values[i];
      totalWeight += weight;
    }
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private async fetchIntradayData(ticker: WatchlistTicker, now: Date) {
    const lookbackStart = new Date(
      now.getTime() -
        BreakoutDetectionServiceImpl.INTRADAY_LOOKBACK_CALENDAR_DAYS *
          24 *
          60 *
          60 *
          1000,
    );
    const marketOpen = getMarketOpenDateUtc(lookbackStart);
    const dateRange = DateRange.of(marketOpen, now);
    return this.marketDataService.getHistoricalData(
      Symbol.of(ticker.value),
      dateRange,
      '5m',
    );
  }
}
