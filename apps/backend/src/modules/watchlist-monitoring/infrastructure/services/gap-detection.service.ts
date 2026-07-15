import { Inject, Injectable } from '@nestjs/common';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { PricePoint } from '../../../market-data/domain/value-objects/price-point';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import {
  GapDetectionResult,
  IGapDetectionService,
} from '../../domain/services/i-gap-detection.service';
import type { GapContextService } from '../../domain/services/gap-context.service';
import { GAP_CONTEXT_SERVICE } from '../../constants/tokens';
import {
  getMarketDateKey,
  getMarketOpenDateUtc,
  isDuringMarketHours,
  isSessionCloseBar,
  isSessionOpenBar,
} from './market-time.util';

@Injectable()
export class GapDetectionServiceImpl implements IGapDetectionService {
  private static readonly CLOSE_LOC_MIN = 0.66;
  // Stop-distance band, expressed as a fraction of the stock's own 20-day ADR%
  // (Average Daily Range) rather than a fixed percentage. A more volatile stock
  // gets a proportionally wider band so its stop has room to breathe.
  private static readonly ADR_PERIOD = 20;
  private static readonly ADR_STOP_LO_MULT = 0.25;
  private static readonly ADR_STOP_HI_MULT = 0.6;
  private static readonly INTRADAY_LOOKBACK_CALENDAR_DAYS = 30;
  // Enough calendar days to guarantee ADR_PERIOD closed trading sessions.
  private static readonly DAILY_LOOKBACK_CALENDAR_DAYS = 45;

  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    @Inject(GAP_CONTEXT_SERVICE)
    private readonly gapContextService: GapContextService,
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

    if (currentKey !== getMarketDateKey(now)) {
      return { ticker, detected: false };
    }

    const currentBars = sessions.get(currentKey) ?? [];
    const priorBars = sessions.get(priorKey) ?? [];

    if (currentBars.length === 0 || priorBars.length === 0) {
      return { ticker, detected: false };
    }

    const priorLastBar = priorBars[priorBars.length - 1];
    const currentFirstBar = currentBars[0];

    if (
      !isSessionOpenBar(currentFirstBar.date) ||
      !isSessionCloseBar(priorLastBar.date)
    ) {
      return { ticker, detected: false };
    }

    const adrPercent = await this.computeAdrPercent(ticker, now);
    if (adrPercent === null) {
      return { ticker, detected: false };
    }

    if (!this.isGapSignal(currentFirstBar, priorLastBar, adrPercent)) {
      return { ticker, detected: false };
    }

    return {
      ticker,
      detected: true,
      entryPrice: currentFirstBar.close,
      stopPrice: priorLastBar.low,
      context: await this.gapContextService.enrich(ticker),
    };
  }

  // Buy conditions ported from the "trd-algo Gap 6R Tracker" Pine Script, with
  // the stop-distance band made relative to the stock's own volatility. All are
  // evaluated on the 09:30 open bar at its close; every input is known at the
  // fill instant.
  //   1. Body-based gap: open >= priorClose + priorBody, priorBody = |c - o|.
  //   2. Green entry candle: close > open.
  //   3. Closed strong: (close - low)/(high - low) >= CLOSE_LOC_MIN.
  //   4. Stop-distance band: the stop must sit between ADR_STOP_LO_MULT and
  //      ADR_STOP_HI_MULT of the 20-day ADR% away from entry, so a volatile
  //      stock is allowed a proportionally wider stop.
  // Entry = 09:30 close, stop = prior 15:55 low, so risk = entry - stop > 0.
  private isGapSignal(
    currentFirstBar: PricePoint,
    priorLastBar: PricePoint,
    adrPercent: number,
  ): boolean {
    const priorClose = priorLastBar.close;
    const priorBody = Math.abs(priorLastBar.close - priorLastBar.open);
    const gapOk = currentFirstBar.open >= priorClose + priorBody;

    const greenOk = currentFirstBar.close > currentFirstBar.open;

    const barRange = currentFirstBar.high - currentFirstBar.low;
    const closeLoc =
      barRange > 0
        ? (currentFirstBar.close - currentFirstBar.low) / barRange
        : 0;
    const closedStrong = closeLoc >= GapDetectionServiceImpl.CLOSE_LOC_MIN;

    const entryPrice = currentFirstBar.close;
    const stopPrice = priorLastBar.low;
    const riskPerShare = entryPrice - stopPrice;
    if (riskPerShare <= 0) {
      return false;
    }
    const stopDistPct = (riskPerShare / entryPrice) * 100;
    const loPct = GapDetectionServiceImpl.ADR_STOP_LO_MULT * adrPercent;
    const hiPct = GapDetectionServiceImpl.ADR_STOP_HI_MULT * adrPercent;
    const stopDistOk = stopDistPct >= loPct && stopDistPct <= hiPct;

    return gapOk && greenOk && closedStrong && stopDistOk;
  }

  // ADR% = mean over ADR_PERIOD closed daily sessions of (high - low) / close,
  // as a percentage. Mirrors calculate_adr_percentage in the Python screener:
  // the per-day ratio is averaged, not the ranges. The current (partial) day is
  // excluded so only fully-formed sessions feed the average. Returns null when
  // fewer than ADR_PERIOD closed sessions are available.
  private async computeAdrPercent(
    ticker: WatchlistTicker,
    now: Date,
  ): Promise<number | null> {
    const dailyBars = await this.fetchDailyBars(ticker, now);
    const currentKey = getMarketDateKey(now);
    const closedDays = dailyBars.filter(
      (bar) => getMarketDateKey(bar.date) !== currentKey,
    );

    if (closedDays.length < GapDetectionServiceImpl.ADR_PERIOD) {
      return null;
    }

    const window = closedDays.slice(-GapDetectionServiceImpl.ADR_PERIOD);
    const sumOfDailyRatios = window.reduce(
      (sum, bar) => sum + (bar.high - bar.low) / bar.close,
      0,
    );
    return (sumOfDailyRatios / window.length) * 100;
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

  private async fetchDailyBars(
    ticker: WatchlistTicker,
    now: Date,
  ): Promise<PricePoint[]> {
    const lookbackStart = new Date(
      now.getTime() -
        GapDetectionServiceImpl.DAILY_LOOKBACK_CALENDAR_DAYS *
          24 *
          60 *
          60 *
          1000,
    );
    const dateRange = DateRange.of(lookbackStart, now);
    const historicalData = await this.marketDataService.getHistoricalData(
      Symbol.of(ticker.symbolOnly),
      dateRange,
      '1d',
    );
    return [...historicalData.pricePoints].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }
}
