import { Inject, Injectable } from '@nestjs/common';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import {
  GapDetectionResult,
  GapDetectionService as IGapDetectionService,
} from '../../domain/services/gap-detection.service';
import {
  getMarketDateKey,
  getMarketOpenDateUtc,
  isDuringMarketHours,
} from './market-time.util';

@Injectable()
export class GapDetectionServiceImpl implements IGapDetectionService {
  private static readonly VOL_MULT = 2.0;
  private static readonly VOL_LOOKBACK_SESSIONS = 20;
  private static readonly VOL_MIN_PERIODS = 5;
  private static readonly INTRADAY_LOOKBACK_CALENDAR_DAYS = 30;

  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async detect(
    ticker: WatchlistTicker,
    now: Date = new Date(),
  ): Promise<GapDetectionResult> {
    const sorted = await this.fetchSortedMarketBars(ticker, now);
    if (sorted.length === 0) {
      return { ticker, detected: false };
    }

    const sessions = this.buildSessionMap(sorted);
    const orderedKeys = Array.from(sessions.keys()).sort((a, b) =>
      a.localeCompare(b),
    );

    if (orderedKeys.length < 2) {
      return { ticker, detected: false };
    }

    const currentKey = orderedKeys[orderedKeys.length - 1];
    const priorKey = orderedKeys[orderedKeys.length - 2];

    const currentBars = sessions.get(currentKey) ?? [];
    const priorBars = sessions.get(priorKey) ?? [];

    if (currentBars.length === 0 || priorBars.length === 0) {
      return { ticker, detected: false };
    }

    const priorLastBar = priorBars[priorBars.length - 1];
    const currentFirstBar = currentBars[0];

    const gapOk = currentFirstBar.open > priorLastBar.high;

    const priorKeys = orderedKeys.slice(0, -1);
    const volOkPrev = this.isVolumeSpikeOnSession(
      priorKey,
      priorBars,
      priorKeys,
      sessions,
    );

    return { ticker, detected: volOkPrev && gapOk };
  }

  // vol_ok on day D: last_vol >= VOL_MULT * avg_last_vol
  // avg_last_vol = rolling VOL_LOOKBACK_SESSIONS mean of closing-candle volume, shifted 1
  // (i.e. the average excludes the session itself — same as pandas .shift(1))
  private isVolumeSpikeOnSession(
    sessionKey: string,
    sessionBars: PricePoint[],
    allPriorKeys: string[],
    sessions: Map<string, PricePoint[]>,
  ): boolean {
    const lastVol = sessionBars[sessionBars.length - 1].volume;

    // Prior sessions before sessionKey, in chronological order, excluding sessionKey itself
    const lookbackKeys = allPriorKeys
      .filter((k) => k < sessionKey)
      .slice(-GapDetectionServiceImpl.VOL_LOOKBACK_SESSIONS);

    if (lookbackKeys.length < GapDetectionServiceImpl.VOL_MIN_PERIODS) {
      return false;
    }

    const closingVolumes = lookbackKeys.map((k) => {
      const bars = sessions.get(k) ?? [];
      return bars.length > 0 ? bars[bars.length - 1].volume : 0;
    });

    const avgLastVol =
      closingVolumes.reduce((sum, v) => sum + v, 0) / closingVolumes.length;

    if (avgLastVol <= 0) return false;

    return lastVol >= GapDetectionServiceImpl.VOL_MULT * avgLastVol;
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

  private async fetchIntradayData(ticker: WatchlistTicker, now: Date) {
    const lookbackStart = new Date(
      now.getTime() -
        GapDetectionServiceImpl.INTRADAY_LOOKBACK_CALENDAR_DAYS *
          24 *
          60 *
          60 *
          1000,
    );
    const marketOpen = getMarketOpenDateUtc(lookbackStart);
    const dateRange = DateRange.of(marketOpen, now);
    return this.marketDataService.getHistoricalData(
      Symbol.of(ticker.symbolOnly),
      dateRange,
      '5m',
    );
  }
}
