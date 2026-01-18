import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import { WeekUtils } from '../utils/week-utils';

@Injectable()
export class BenchmarkCalculator {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async calculate(dateRange: DateRange): Promise<Map<number, number>> {
    return this.calculateSPX(dateRange);
  }

  private async calculateSPX(
    dateRange: DateRange,
  ): Promise<Map<number, number>> {
    const spxSymbol = Symbol.of('SPY');
    const historicalData = await this.marketDataService.getHistoricalData(
      spxSymbol,
      dateRange,
      '1wk',
    );

    const benchmark = new Map<number, number>();
    const weeklyMap = new Map<string, { date: Date; price: number }>();

    for (const point of historicalData.pricePoints) {
      const weekKey = WeekUtils.getWeekKey(point.date);
      const mondayOfWeek = WeekUtils.getMondayOfWeek(point.date);
      const existing = weeklyMap.get(weekKey);

      if (!existing) {
        weeklyMap.set(weekKey, {
          date: mondayOfWeek,
          price: point.close,
        });
      } else {
        const existingIsMonday = WeekUtils.isMonday(existing.date);
        const currentIsMonday = WeekUtils.isMonday(point.date);

        if (currentIsMonday && !existingIsMonday) {
          weeklyMap.set(weekKey, {
            date: mondayOfWeek,
            price: point.close,
          });
        } else if (currentIsMonday && existingIsMonday) {
          if (point.date.getTime() === mondayOfWeek.getTime()) {
            weeklyMap.set(weekKey, {
              date: mondayOfWeek,
              price: point.close,
            });
          }
        }
      }
    }

    const weeklyPrices = Array.from(weeklyMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );

    for (const { date, price } of weeklyPrices) {
      benchmark.set(date.getTime(), price);
    }

    return benchmark;
  }
}
