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
import { getMarketDateKey, getMarketOpenDateUtc } from './market-time.util';

@Injectable()
export class BreakoutDetectionServiceImpl implements IBreakoutDetectionService {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async detect(ticker: WatchlistTicker): Promise<BreakoutDetectionResult> {
    const historicalData = await this.fetchIntradayData(ticker);
    const sorted = [...historicalData.pricePoints].sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
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
    const vwapRising = vwapLatest > vwapPrevious;
    const ema9Rising = ema9Latest > ema9Previous;

    const detected = crossover && vwapRising && ema9Rising;

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

  private async fetchIntradayData(ticker: WatchlistTicker) {
    const now = new Date();
    const marketOpen = getMarketOpenDateUtc(now);
    const dateRange = DateRange.of(marketOpen, now);
    return this.marketDataService.getHistoricalData(
      Symbol.of(ticker.value),
      dateRange,
      '5m',
    );
  }
}
