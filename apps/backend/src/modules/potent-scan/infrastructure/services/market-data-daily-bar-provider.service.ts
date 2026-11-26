import { Injectable } from '@nestjs/common';
import { GetHistoricalDataUseCase } from '../../../market-data/market-data.module';
import { Symbol } from '../../../../shared/value-objects/symbol';
import { DateRange } from '../../../../shared/value-objects/date-range';
import { getMarketDateKey } from '../../../../shared/utils/market-clock';
import {
  DailyBar,
  DailyBarProvider,
} from '../../domain/services/daily-bar-provider.service';
import { SessionDate } from '../../domain/value-objects/session-date';

@Injectable()
export class MarketDataDailyBarProvider implements DailyBarProvider {
  constructor(private readonly getHistoricalData: GetHistoricalDataUseCase) {}

  async dailyBarsSince(
    ticker: Symbol,
    since: SessionDate,
  ): Promise<DailyBar[]> {
    const { historicalData } = await this.getHistoricalData.execute({
      symbol: Symbol.of(ticker.value.replace('.', '-')),
      dateRange: DateRange.of(
        new Date(`${since.value}T00:00:00.000Z`),
        new Date(),
      ),
      interval: '1d',
    });
    const barsByDate = new Map<string, DailyBar>();
    for (const point of historicalData.pricePoints) {
      const date = getMarketDateKey(point.date);
      barsByDate.set(date, {
        date: SessionDate.of(date),
        high: point.high,
        low: point.low,
        close: point.close,
      });
    }
    return [...barsByDate.values()];
  }
}
