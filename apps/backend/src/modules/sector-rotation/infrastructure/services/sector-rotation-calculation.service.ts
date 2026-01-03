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
import { ZScoreNormalizer } from './z-score-normalizer.service';
import { BenchmarkCalculator } from './benchmark-calculator.service';
import { BenchmarkType } from '../../domain/value-objects/benchmark-type';

interface WeeklyPriceData {
  date: Date;
  price: number;
}

interface SectorWeeklyData {
  sector: Sector;
  prices: WeeklyPriceData[];
}

const MIN_DATA_POINTS_REQUIRED = 2;
const EPSILON = 1e-10;

@Injectable()
export class SectorRotationCalculationServiceImpl
  implements SectorRotationCalculationService
{
  constructor(
    @Inject(MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    private readonly zScoreNormalizer: ZScoreNormalizer,
    private readonly benchmarkCalculator: BenchmarkCalculator,
  ) {}

  async calculate(
    sectors: Sector[],
    dateRange: DateRange,
    params: SectorRotationCalculationParams,
  ): Promise<SectorRotationResult> {
    this.validateParams(params);
    this.validateSectors(sectors);

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
    this.validateSectorData(sectorData, requiredLookbackWeeks);

    const benchmarkType = params.benchmarkType ?? BenchmarkType.EqualWeighted;
    const benchmark = await this.benchmarkCalculator.calculate(
      sectorData,
      extendedDateRange,
      benchmarkType,
    );
    this.validateBenchmark(benchmark);

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

    if (outputDataPoints.length === 0) {
      throw new Error(
        `No data points generated for date range ${dateRange.startDate.toISOString()} to ${dateRange.endDate.toISOString()}. Insufficient historical data.`,
      );
    }

    return SectorRotationResult.of(
      dateRange.startDate,
      dateRange.endDate,
      outputDataPoints,
      sectors.map((s) => s.symbol),
    );
  }

  private validateParams(params: SectorRotationCalculationParams): void {
    if (params.lookbackWeeks < 1) {
      throw new Error(
        `lookbackWeeks must be at least 1, got ${params.lookbackWeeks}`,
      );
    }
    if (params.momentumWeeks < 1) {
      throw new Error(
        `momentumWeeks must be at least 1, got ${params.momentumWeeks}`,
      );
    }
    if (params.normalizationWindowWeeks < 1) {
      throw new Error(
        `normalizationWindowWeeks must be at least 1, got ${params.normalizationWindowWeeks}`,
      );
    }
  }

  private validateSectors(sectors: Sector[]): void {
    if (!sectors || sectors.length === 0) {
      throw new Error('At least one sector is required');
    }
  }

  private validateSectorData(
    sectorData: SectorWeeklyData[],
    requiredLookbackWeeks: number,
  ): void {
    if (sectorData.length === 0) {
      throw new Error('No sector data available after fetching');
    }

    const minRequiredPoints = requiredLookbackWeeks + MIN_DATA_POINTS_REQUIRED;
    for (const { sector, prices } of sectorData) {
      if (prices.length < minRequiredPoints) {
        throw new Error(
          `Sector ${sector.symbol} has insufficient data: ${prices.length} points, need at least ${minRequiredPoints}`,
        );
      }
    }
  }

  private validateBenchmark(benchmark: Map<number, number>): void {
    if (benchmark.size === 0) {
      throw new Error('Benchmark calculation produced no data points');
    }

    for (const [date, price] of benchmark.entries()) {
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error(
          `Invalid benchmark price at ${new Date(date).toISOString()}: ${price}`,
        );
      }
    }
  }

  private async fetchSectorData(
    sectors: Sector[],
    dateRange: DateRange,
  ): Promise<SectorWeeklyData[]> {
    const fetchPromises = sectors.map((sector) =>
      this.fetchSingleSector(sector, dateRange),
    );

    const results = await Promise.allSettled(fetchPromises);
    const sectorData: SectorWeeklyData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const sector = sectors[i];

      if (result.status === 'fulfilled') {
        sectorData.push(result.value);
      } else {
        const errorMessage = `Failed to fetch data for sector ${sector.symbol}: ${result.reason?.message || 'Unknown error'}`;
        errors.push(errorMessage);
        console.warn(errorMessage);
      }
    }

    if (sectorData.length === 0) {
      throw new Error(
        `Failed to fetch data for all sectors. Errors: ${errors.join('; ')}`,
      );
    }

    if (errors.length > 0) {
      console.warn(
        `Some sectors failed to load (${errors.length}/${sectors.length}). Continuing with available data.`,
      );
    }

    return sectorData;
  }

  private async fetchSingleSector(
    sector: Sector,
    dateRange: DateRange,
  ): Promise<SectorWeeklyData> {
    const symbol = Symbol.of(sector.symbol);
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

    return {
      sector,
      prices: weeklyPrices,
    };
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
          if (Number.isFinite(rs)) {
            rsMap.set(date.getTime(), rs);
          }
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

          const xRaw = this.calculateXRawValue(currentRS, lookbackRS);
          if (Number.isFinite(xRaw)) {
            xRawMap.set(currentDate, xRaw);
          }
        }
      }

      const xNormalizedMap = this.zScoreNormalizer.normalizeWithRollingWindow(
        xRawMap,
        sortedDates,
        normalizationWindowWeeks,
      );

      xValues.set(sectorSymbol, xNormalizedMap);
    }

    return xValues;
  }

  private calculateXRawValue(currentRS: number, lookbackRS: number): number {
    if (Math.abs(lookbackRS) < EPSILON) {
      return currentRS - lookbackRS;
    }

    const ratio = currentRS / lookbackRS;
    if (ratio > 0) {
      return Math.log(ratio);
    }

    return currentRS / lookbackRS - 1;
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

          if (Number.isFinite(yRaw)) {
            yRawMap.set(currentDate, yRaw);
          }
        }
      }

      const yNormalizedMap = this.zScoreNormalizer.normalizeWithRollingWindow(
        yRawMap,
        sortedDates,
        normalizationWindowWeeks,
      );

      yValues.set(sectorSymbol, yNormalizedMap);
    }

    return yValues;
  }

  private createDataPoints(
    sectorData: SectorWeeklyData[],
    relativeStrengths: Map<string, Map<number, number>>,
    xValues: Map<string, Map<number, number>>,
    yValues: Map<string, Map<number, number>>,
  ): SectorRotationDataPoint[] {
    const dataPoints: SectorRotationDataPoint[] = [];
    const dateToSectorPrices = new Map<number, Map<string, WeeklyPriceData>>();

    for (const { sector, prices } of sectorData) {
      for (const priceData of prices) {
        const dateTime = priceData.date.getTime();
        if (!dateToSectorPrices.has(dateTime)) {
          dateToSectorPrices.set(dateTime, new Map());
        }
        dateToSectorPrices.get(dateTime)!.set(sector.symbol, priceData);
      }
    }

    const sortedDates = Array.from(dateToSectorPrices.keys()).sort(
      (a, b) => a - b,
    );

    for (const dateTime of sortedDates) {
      const sectorPricesAtDate = dateToSectorPrices.get(dateTime)!;

      for (const [sectorSymbol, priceData] of sectorPricesAtDate.entries()) {
        const rs = relativeStrengths.get(sectorSymbol)?.get(dateTime);
        const x = xValues.get(sectorSymbol)?.get(dateTime);
        const y = yValues.get(sectorSymbol)?.get(dateTime);

        if (
          rs !== undefined &&
          x !== undefined &&
          y !== undefined &&
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          !isNaN(x) &&
          !isNaN(y)
        ) {
          const quadrant = Quadrant.fromCoordinates(x, y);
          const dataPoint = SectorRotationDataPoint.of(
            priceData.date,
            sectorSymbol,
            priceData.price,
            rs,
            x,
            y,
            quadrant,
          );
          dataPoints.push(dataPoint);
        }
      }
    }

    return dataPoints;
  }
}
