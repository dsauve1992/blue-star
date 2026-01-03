import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import { BenchmarkType } from '../../domain/value-objects/benchmark-type';

interface WeeklyPriceData {
  date: Date;
  price: number;
}

interface SectorWeeklyData {
  sector: unknown;
  prices: WeeklyPriceData[];
}

@Injectable()
export class BenchmarkCalculator {
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async calculate(
    sectorData: SectorWeeklyData[],
    dateRange: DateRange,
    benchmarkType: BenchmarkType,
  ): Promise<Map<number, number>> {
    if (benchmarkType.equals(BenchmarkType.EqualWeighted)) {
      return this.calculateEqualWeighted(sectorData);
    } else if (benchmarkType.equals(BenchmarkType.SPX)) {
      return this.calculateSPX(dateRange);
    }
    throw new Error(`Unknown benchmark type: ${benchmarkType.value}`);
  }

  private calculateEqualWeighted(
    sectorData: SectorWeeklyData[],
  ): Map<number, number> {
    const benchmark = new Map<number, number>();
    const allDates = new Set<number>();

    for (const { prices } of sectorData) {
      for (const { date } of prices) {
        allDates.add(date.getTime());
      }
    }

    for (const dateTime of allDates) {
      const pricesAtDate = sectorData
        .map(({ prices }) => {
          const pricePoint = prices.find((p) => p.date.getTime() === dateTime);
          return pricePoint?.price;
        })
        .filter((p): p is number => p !== undefined);

      if (pricesAtDate.length > 0) {
        const averagePrice =
          pricesAtDate.reduce((sum, p) => sum + p, 0) / pricesAtDate.length;
        benchmark.set(dateTime, averagePrice);
      }
    }

    return benchmark;
  }

  private async calculateSPX(dateRange: DateRange): Promise<Map<number, number>> {
    const spxSymbol = Symbol.of('SPY');
    const historicalData = await this.marketDataService.getHistoricalData(
      spxSymbol,
      dateRange,
      '1wk',
    );

    const benchmark = new Map<number, number>();
    const weeklyMap = new Map<string, { date: Date; price: number }>();

    for (const point of historicalData.pricePoints) {
      const weekKey = this.getWeekKey(point.date);
      const existing = weeklyMap.get(weekKey);

      if (!existing || point.date > existing.date) {
        weeklyMap.set(weekKey, {
          date: point.date,
          price: point.close,
        });
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

  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const week = this.getWeekNumber(date);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }
}

