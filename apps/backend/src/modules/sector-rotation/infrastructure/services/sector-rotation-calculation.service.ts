import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { MARKET_DATA_SERVICE } from '../../../market-data/constants/tokens';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../../domain/services/sector-rotation-calculation.service';
import { SectorRotationResult } from '../../domain/value-objects/sector-rotation-result';
import { SectorRotationDataPoint } from '../../domain/value-objects/sector-rotation-data-point';
import { Quadrant } from '../../domain/value-objects/quadrant';
import { Sector } from '../../domain/value-objects/sector';

interface WeeklyPriceData {
  date: Date;
  price: number;
}

interface SectorWeeklyData {
  sector: Sector;
  prices: WeeklyPriceData[];
}

@Injectable()
export class SectorRotationCalculationServiceImpl
  implements SectorRotationCalculationService
{
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
  ) {}

  async calculate(
    sectors: Sector[],
    dateRange: DateRange,
    params: SectorRotationCalculationParams,
  ): Promise<SectorRotationResult> {
    const requiredLookbackWeeks = Math.max(
      params.normalizationWindowWeeks,
      params.lookbackWeeks,
      params.momentumWeeks,
    );

    const extendedDateRange = this.extendDateRangeForLookback(
      dateRange,
      requiredLookbackWeeks,
    );

    const sectorData = await this.fetchSectorData(sectors, extendedDateRange);
    const benchmark = this.calculateBenchmark(sectorData);

    const relativeStrengths = this.calculateRelativeStrengths(
      sectorData,
      benchmark,
    );
    const xValues = this.calculateXValues(
      relativeStrengths,
      params.lookbackWeeks,
      params.normalizationWindowWeeks,
    );
    const yValues = this.calculateYValues(
      xValues,
      params.momentumWeeks,
      params.normalizationWindowWeeks,
    );
    const allDataPoints = this.createDataPoints(
      sectorData,
      relativeStrengths,
      xValues,
      yValues,
    );

    const outputDataPoints = allDataPoints.filter((point) => {
      const pointTime = point.date.getTime();
      return (
        pointTime >= dateRange.startDate.getTime() &&
        pointTime <= dateRange.endDate.getTime()
      );
    });

    return SectorRotationResult.of(
      dateRange.startDate,
      dateRange.endDate,
      outputDataPoints,
      sectors.map((s) => s.symbol),
    );
  }

  private async fetchSectorData(
    sectors: Sector[],
    dateRange: DateRange,
  ): Promise<SectorWeeklyData[]> {
    const sectorData: SectorWeeklyData[] = [];

    for (let i = 0; i < sectors.length; i++) {
      const sector = sectors[i];
      const symbol = Symbol.of(sector.symbol);

      try {
        const historicalData = await this.marketDataService.getHistoricalData(
          symbol,
          dateRange,

          '1wk',
        );

        const weeklyPrices = this.convertToWeeklyPrices(
          historicalData.pricePoints.map((p) => ({
            date: p.date,
            close: p.close,
          })),
        );

        sectorData.push({
          sector,
          prices: weeklyPrices,
        });
      } catch (error) {
        console.error(
          `Failed to fetch data for sector ${sector.symbol}:`,
          error,
        );
        throw error;
      }
    }

    return sectorData;
  }

  private extendDateRangeForLookback(
    dateRange: DateRange,
    weeks: number,
  ): DateRange {
    const startDate = new Date(dateRange.startDate);
    startDate.setDate(startDate.getDate() - weeks * 7);
    return DateRange.of(startDate, dateRange.endDate);
  }

  private convertToWeeklyPrices(
    pricePoints: Array<{ date: Date; close: number }>,
  ): WeeklyPriceData[] {
    if (pricePoints.length === 0) {
      return [];
    }

    const weeklyMap = new Map<string, WeeklyPriceData>();

    for (const point of pricePoints) {
      const weekKey = this.getWeekKey(point.date);
      const existing = weeklyMap.get(weekKey);

      if (!existing || point.date > existing.date) {
        weeklyMap.set(weekKey, {
          date: point.date,
          price: point.close,
        });
      }
    }

    return Array.from(weeklyMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
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

  private calculateBenchmark(
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

  private calculateRelativeStrengths(
    sectorData: SectorWeeklyData[],
    benchmark: Map<number, number>,
  ): Map<string, Map<number, number>> {
    const relativeStrengths = new Map<string, Map<number, number>>();

    for (const { sector, prices } of sectorData) {
      const rsMap = new Map<number, number>();

      for (const { date, price } of prices) {
        const benchmarkPrice = benchmark.get(date.getTime());
        if (benchmarkPrice && benchmarkPrice > 0) {
          const rs = Math.log(price) - Math.log(benchmarkPrice);
          rsMap.set(date.getTime(), rs);
        }
      }

      relativeStrengths.set(sector.symbol, rsMap);
    }

    return relativeStrengths;
  }

  private calculateXValues(
    relativeStrengths: Map<string, Map<number, number>>,
    lookbackWeeks: number,
    normalizationWindowWeeks: number,
  ): Map<string, Map<number, number>> {
    const xValues = new Map<string, Map<number, number>>();

    for (const [sectorSymbol, rsMap] of relativeStrengths.entries()) {
      const sortedDates = Array.from(rsMap.keys()).sort((a, b) => a - b);
      const xRawMap = new Map<number, number>();

      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        const currentRS = rsMap.get(currentDate)!;

        if (i >= lookbackWeeks) {
          const lookbackDate = sortedDates[i - lookbackWeeks];
          const lookbackRS = rsMap.get(lookbackDate)!;
          const xRaw = currentRS / lookbackRS - 1;

          xRawMap.set(currentDate, xRaw);
        }
      }

      const xNormalizedMap = this.normalizeWithZScore(
        xRawMap,
        normalizationWindowWeeks,
        sortedDates,
      );

      xValues.set(sectorSymbol, xNormalizedMap);
    }

    return xValues;
  }

  private calculateYValues(
    xValues: Map<string, Map<number, number>>,
    momentumWeeks: number,
    normalizationWindowWeeks: number,
  ): Map<string, Map<number, number>> {
    const yValues = new Map<string, Map<number, number>>();

    for (const [sectorSymbol, xMap] of xValues.entries()) {
      const sortedDates = Array.from(xMap.keys()).sort((a, b) => a - b);
      const yRawMap = new Map<number, number>();

      for (let i = 0; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        const currentX = xMap.get(currentDate)!;

        if (i >= momentumWeeks) {
          const momentumDate = sortedDates[i - momentumWeeks];
          const momentumX = xMap.get(momentumDate)!;
          const yRaw = currentX - momentumX;
          yRawMap.set(currentDate, yRaw);
        }
      }

      const yNormalizedMap = this.normalizeWithZScore(
        yRawMap,
        normalizationWindowWeeks,
        sortedDates,
      );

      yValues.set(sectorSymbol, yNormalizedMap);
    }

    return yValues;
  }

  private normalizeWithZScore(
    rawMap: Map<number, number>,
    windowWeeks: number,
    sortedDates: number[],
  ): Map<number, number> {
    const normalizedMap = new Map<number, number>();

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const windowStart = Math.max(0, i - windowWeeks + 1);
      const windowDates = sortedDates.slice(windowStart, i + 1);
      const windowValues = windowDates
        .map((d) => rawMap.get(d))
        .filter((v): v is number => v !== undefined);

      if (windowValues.length > 0) {
        const mean =
          windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length;
        const variance =
          windowValues.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
          windowValues.length;
        const stdDev = Math.sqrt(variance);

        const rawValue = rawMap.get(currentDate);
        if (rawValue !== undefined && stdDev > 0) {
          const zScore = (rawValue - mean) / stdDev;
          normalizedMap.set(currentDate, zScore);
        }
      }
    }

    return normalizedMap;
  }

  private createDataPoints(
    sectorData: SectorWeeklyData[],
    relativeStrengths: Map<string, Map<number, number>>,
    xValues: Map<string, Map<number, number>>,
    yValues: Map<string, Map<number, number>>,
  ): SectorRotationDataPoint[] {
    const dataPoints: SectorRotationDataPoint[] = [];
    const allDates = new Set<number>();

    for (const { prices } of sectorData) {
      for (const { date } of prices) {
        allDates.add(date.getTime());
      }
    }

    for (const dateTime of allDates) {
      for (const { sector, prices } of sectorData) {
        const pricePoint = prices.find((p) => p.date.getTime() === dateTime);
        if (!pricePoint) continue;

        const rs = relativeStrengths.get(sector.symbol)?.get(dateTime);
        const x = xValues.get(sector.symbol)?.get(dateTime);
        const y = yValues.get(sector.symbol)?.get(dateTime);

        if (
          rs !== undefined &&
          x !== undefined &&
          y !== undefined &&
          !isNaN(x) &&
          !isNaN(y)
        ) {
          const quadrant = Quadrant.fromCoordinates(x, y);
          const dataPoint = SectorRotationDataPoint.of(
            pricePoint.date,
            sector.symbol,
            pricePoint.price,
            rs,
            x,
            y,
            quadrant,
          );
          dataPoints.push(dataPoint);
        }
      }
    }

    return dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
