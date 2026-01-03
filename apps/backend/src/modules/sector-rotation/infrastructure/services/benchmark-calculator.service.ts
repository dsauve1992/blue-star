import { Injectable } from '@nestjs/common';

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
  calculate(sectorData: SectorWeeklyData[]): Map<number, number> {
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
}

