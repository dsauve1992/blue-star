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
  // 1.5× is a meaningful surge; 1.2× falls within normal session-to-session variance for liquid names.
  private static readonly VOLUME_MULTIPLIER_THRESHOLD = 1.5;
  // EMA must clear VWAP by at least 10bps to eliminate sub-spread noise crosses.
  private static readonly MIN_EMA_VWAP_SPREAD_PCT = 0.001;

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

    const vwapSeries = this.sessionVwapSeries(sessionBars);
    const vwapLatest = vwapSeries.get(latestTs);
    const vwapPrevious = vwapSeries.get(previousTs);

    const ema9Map = this.sessionEma9(sessionBars);
    const ema9Latest = ema9Map.get(latestTs);
    const ema9Previous = ema9Map.get(previousTs);

    if (
      vwapLatest === undefined ||
      vwapPrevious === undefined ||
      ema9Latest === undefined ||
      ema9Previous === undefined
    ) {
      return { ticker, detected: false };
    }

    const crossedAboveVwap = ema9Latest > vwapLatest;
    const freshCrossover = ema9Previous <= vwapPrevious;
    const vwapRising = vwapLatest > vwapPrevious;
    const ema9Rising = ema9Latest > ema9Previous;
    const spreadSufficient =
      (ema9Latest - vwapLatest) / vwapLatest >=
      BreakoutDetectionServiceImpl.MIN_EMA_VWAP_SPREAD_PCT;
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

    const detected =
      crossedAboveVwap &&
      freshCrossover &&
      vwapRising &&
      ema9Rising &&
      spreadSufficient &&
      volumeSurge &&
      abovePriorSessionHigh;

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

  private sessionVwapSeries(pricePoints: PricePoint[]): Map<number, number> {
    const values = new Map<number, number>();
    let sumTpVol = 0;
    let sumVol = 0;
    for (const p of pricePoints) {
      const typicalPrice = (p.high + p.low + p.close) / 3;
      sumTpVol += typicalPrice * p.volume;
      sumVol += p.volume;
      if (sumVol > 0) {
        values.set(p.date.getTime(), sumTpVol / sumVol);
      }
    }
    return values;
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

    // Median is more robust than mean against outlier sessions (earnings, macro events).
    const baselineVolume = this.medianOf(historicalCumulativeVolumes);
    if (baselineVolume <= 0) return false;

    return (
      currentCumulativeVolume >=
      baselineVolume * BreakoutDetectionServiceImpl.VOLUME_MULTIPLIER_THRESHOLD
    );
  }

  private medianOf(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;
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
