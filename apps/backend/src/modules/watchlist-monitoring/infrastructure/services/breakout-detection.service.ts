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
  private static readonly AVERAGE_VOLUME_LOOKBACK_SESSIONS = 10;
  private static readonly INTRADAY_LOOKBACK_CALENDAR_DAYS = 30;
  private static readonly VOLUME_MULTIPLIER_THRESHOLD = 1.5;

  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async detect(
    ticker: WatchlistTicker,
    now: Date = new Date(),
  ): Promise<BreakoutDetectionResult> {
    const historicalData = await this.fetchIntradayData(ticker, now);
    const sorted = [...historicalData.pricePoints]
      .filter((p) => isDuringMarketHours(p.date))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    if (sorted.length === 0) {
      return { ticker, detected: false };
    }

    const sessionBars = this.getCurrentSessionBars(sorted);
    if (sessionBars.length < 2) {
      return { ticker, detected: false };
    }

    const latestIndex = sessionBars.length - 1;
    const previousIndex = latestIndex - 1;
    const latestTs = sessionBars[latestIndex].date.getTime();
    const previousTs = sessionBars[previousIndex].date.getTime();

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

    const crossover = ema9Latest > vwapLatest;
    const freshCrossover = ema9Previous <= vwapPrevious;
    const vwapRising = vwapLatest > vwapPrevious;
    const ema9Rising = ema9Latest > ema9Previous;
    const volumeSurge = this.hasRequiredVolumeSurge(sessionBars, sorted);

    const detected =
      crossover && freshCrossover && vwapRising && ema9Rising && volumeSurge;

    return { ticker, detected };
  }

  private getCurrentSessionBars(sortedPricePoints: PricePoint[]): PricePoint[] {
    const lastBar = sortedPricePoints[sortedPricePoints.length - 1];
    const lastSessionKey = getMarketDateKey(lastBar.date);

    return sortedPricePoints.filter(
      (p) => getMarketDateKey(p.date) === lastSessionKey,
    );
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
    const values = new Map<number, number>();
    const sortedDates: number[] = [];
    for (const p of pricePoints) {
      const ts = p.date.getTime();
      values.set(ts, p.close);
      sortedDates.push(ts);
    }
    sortedDates.sort((a, b) => a - b);
    return EMACalculator.calculate(values, sortedDates, 9);
  }

  private hasRequiredVolumeSurge(
    currentSessionBars: PricePoint[],
    sortedPricePoints: PricePoint[],
  ): boolean {
    const barsElapsedInSession = currentSessionBars.length;
    const currentSessionKey = getMarketDateKey(
      currentSessionBars[currentSessionBars.length - 1].date,
    );

    const sessions = new Map<string, PricePoint[]>();
    for (const pricePoint of sortedPricePoints) {
      const sessionKey = getMarketDateKey(pricePoint.date);
      const existingSessionBars = sessions.get(sessionKey) ?? [];
      existingSessionBars.push(pricePoint);
      sessions.set(sessionKey, existingSessionBars);
    }

    for (const [key, bars] of sessions) {
      sessions.set(
        key,
        bars.sort((a, b) => a.date.getTime() - b.date.getTime()),
      );
    }

    const orderedSessionKeys = Array.from(sessions.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    const priorSessionKeys = orderedSessionKeys
      .filter((sessionKey) => sessionKey !== currentSessionKey)
      .filter((sessionKey) => {
        const sessionBars = sessions.get(sessionKey) ?? [];
        return sessionBars.length >= barsElapsedInSession;
      });

    if (
      priorSessionKeys.length <
      BreakoutDetectionServiceImpl.AVERAGE_VOLUME_LOOKBACK_SESSIONS
    ) {
      return false;
    }

    const lookbackSessionKeys = priorSessionKeys.slice(
      -BreakoutDetectionServiceImpl.AVERAGE_VOLUME_LOOKBACK_SESSIONS,
    );

    const currentCumulativeVolume = currentSessionBars
      .slice(0, barsElapsedInSession)
      .reduce((sum, bar) => sum + bar.volume, 0);

    const averageCumulativeVolume =
      lookbackSessionKeys.reduce((sum, sessionKey) => {
        const sessionBars = sessions.get(sessionKey) ?? [];
        const sessionCumulativeVolume = sessionBars
          .slice(0, barsElapsedInSession)
          .reduce((sessionSum, bar) => sessionSum + bar.volume, 0);
        return sum + sessionCumulativeVolume;
      }, 0) / lookbackSessionKeys.length;

    if (averageCumulativeVolume <= 0) {
      return false;
    }

    return (
      currentCumulativeVolume >=
      averageCumulativeVolume *
        BreakoutDetectionServiceImpl.VOLUME_MULTIPLIER_THRESHOLD
    );
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
