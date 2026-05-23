import { Injectable, Inject } from '@nestjs/common';
import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import type { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../../domain/services/sector-rotation-calculation.service';
import { SectorRotationResult } from '../../domain/value-objects/sector-rotation-result';
import { SectorRotationDataPoint } from '../../domain/value-objects/sector-rotation-data-point';
import { Quadrant } from '../../domain/value-objects/quadrant';
import { RotationMember } from '../../domain/value-objects/rotation-member';
import { RotationUniverse } from '../../domain/value-objects/rotation-universe';
import { ZScoreNormalizer } from './z-score-normalizer.service';
import { BenchmarkCalculator } from './benchmark-calculator.service';
import { WeekUtils } from '../utils/week-utils';
import { EMACalculator } from '../utils/ema-calculator';
import { RollingStatsCalculator, RollingStats } from '../utils/rolling-stats';
import { RRG_PARAMETERS } from '../../constants/rrg-parameters';
import { SECTOR_ROTATION_MARKET_DATA_SERVICE } from '../../constants/tokens';

interface WeeklyPriceData {
  date: Date;
  price: number;
}

interface MemberWeeklyData {
  member: RotationMember;
  prices: WeeklyPriceData[];
}

const MIN_DATA_POINTS_REQUIRED = 2;
const Z_SCORE_MULTIPLIER = 3;
const Z_SCORE_CENTER = 100;

@Injectable()
export class SectorRotationCalculationServiceImpl
  implements SectorRotationCalculationService
{
  constructor(
    @Inject(SECTOR_ROTATION_MARKET_DATA_SERVICE)
    private readonly marketDataService: MarketDataService,
    private readonly zScoreNormalizer: ZScoreNormalizer,
    private readonly benchmarkCalculator: BenchmarkCalculator,
  ) {}

  async calculate(
    universe: RotationUniverse,
    dateRange: DateRange,
    params: SectorRotationCalculationParams,
  ): Promise<SectorRotationResult> {
    this.validateParams(params);
    this.validateUniverse(universe);

    const requiredLookbackWeeks = Math.max(
      params.normalizationWindowWeeks,
      params.momentumWeeks,
      RRG_PARAMETERS.RS_SMOOTHING_PERIOD,
    );

    const extendedDateRange = this.extendDateRangeForLookback(
      dateRange,
      requiredLookbackWeeks,
    );

    const memberData = await this.fetchMemberData(
      universe.members,
      extendedDateRange,
    );
    this.validateMemberData(memberData, requiredLookbackWeeks);

    const benchmark = await this.benchmarkCalculator.calculate(
      universe.benchmarkSymbol,
      extendedDateRange,
    );
    this.validateBenchmark(benchmark);

    const relativeStrengths = this.calculateRelativeStrengths(
      memberData,
      benchmark,
    );
    const xValues = this.calculateXValues(
      relativeStrengths,
      params.normalizationWindowWeeks,
    );
    const yValues = this.calculateYValues(
      xValues,
      params.normalizationWindowWeeks,
    );
    const allDataPoints = this.createDataPoints(
      memberData,
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
      universe.members.map((m) => m.symbol),
    );
  }

  private validateParams(params: SectorRotationCalculationParams): void {
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

  private validateUniverse(universe: RotationUniverse): void {
    if (!universe || universe.members.length === 0) {
      throw new Error('At least one sector is required');
    }
  }

  private validateMemberData(
    memberData: MemberWeeklyData[],
    requiredLookbackWeeks: number,
  ): void {
    if (memberData.length === 0) {
      throw new Error('No sector data available after fetching');
    }

    const minRequiredPoints = requiredLookbackWeeks + MIN_DATA_POINTS_REQUIRED;
    for (const { member, prices } of memberData) {
      if (prices.length < minRequiredPoints) {
        throw new Error(
          `Sector ${member.symbol} has insufficient data: ${prices.length} points, need at least ${minRequiredPoints}`,
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

  private async fetchMemberData(
    members: ReadonlyArray<RotationMember>,
    dateRange: DateRange,
  ): Promise<MemberWeeklyData[]> {
    const fetchPromises = members.map((member) =>
      this.fetchSingleMember(member, dateRange),
    );

    const results = await Promise.allSettled(fetchPromises);
    const memberData: MemberWeeklyData[] = [];
    const errors: string[] = [];

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const member = members[i];

      if (result.status === 'fulfilled') {
        memberData.push(result.value);
      } else {
        const errorMessage = `Failed to fetch data for sector ${member.symbol}: ${result.reason || 'Unknown error'}`;
        errors.push(errorMessage);
        console.warn(errorMessage);
      }
    }

    if (memberData.length === 0) {
      throw new Error(
        `Failed to fetch data for all sectors. Errors: ${errors.join('; ')}`,
      );
    }

    if (errors.length > 0) {
      console.warn(
        `Some sectors failed to load (${errors.length}/${members.length}). Continuing with available data.`,
      );
    }

    return memberData;
  }

  private async fetchSingleMember(
    member: RotationMember,
    dateRange: DateRange,
  ): Promise<MemberWeeklyData> {
    const symbol = Symbol.of(member.symbol);
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
      member,
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

    return Array.from(weeklyMap.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }

  private calculateRelativeStrengths(
    memberData: MemberWeeklyData[],
    benchmark: Map<number, number>,
  ): Map<string, Map<number, number>> {
    const relativeStrengths = new Map<string, Map<number, number>>();

    for (const { member, prices } of memberData) {
      const rsMap = new Map<number, number>();

      for (const { date, price } of prices) {
        const benchmarkPrice = benchmark.get(date.getTime());
        if (benchmarkPrice && benchmarkPrice > 0) {
          const rs = 100 * (price / benchmarkPrice);
          if (Number.isFinite(rs) && rs > 0) {
            rsMap.set(date.getTime(), rs);
          }
        }
      }

      relativeStrengths.set(member.symbol, rsMap);
    }

    return relativeStrengths;
  }

  private calculateXValues(
    relativeStrengths: Map<string, Map<number, number>>,
    normalizationWindowWeeks: number,
  ): Map<string, Map<number, number>> {
    const xValues = new Map<string, Map<number, number>>();

    for (const [symbol, rsMap] of relativeStrengths.entries()) {
      const sortedDates = Array.from(rsMap.keys()).sort((a, b) => a - b);

      const rsSmoothed = EMACalculator.calculate(
        rsMap,
        sortedDates,
        RRG_PARAMETERS.RS_SMOOTHING_PERIOD,
      );

      const xNormalizedMap = this.calculateRSRatio(
        rsSmoothed,
        sortedDates,
        normalizationWindowWeeks,
      );

      xValues.set(symbol, xNormalizedMap);
    }

    return xValues;
  }

  private calculateRSRatio(
    rsSmoothed: Map<number, number>,
    sortedDates: number[],
    normalizationWindowWeeks: number,
  ): Map<number, number> {
    const rsRatioMap = new Map<number, number>();
    const windowQueue: Array<{ date: number; value: number }> = [];
    let stats: RollingStats = {
      mean: 0,
      variance: 0,
      count: 0,
    };

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const smoothedValue = rsSmoothed.get(currentDate);

      if (smoothedValue === undefined) {
        continue;
      }

      const windowStartIndex = Math.max(0, i - normalizationWindowWeeks + 1);
      const windowStartDate = sortedDates[windowStartIndex];

      while (windowQueue.length > 0 && windowQueue[0].date < windowStartDate) {
        const removed = windowQueue.shift()!;
        stats = RollingStatsCalculator.removeValue(stats, removed.value);
      }

      windowQueue.push({ date: currentDate, value: smoothedValue });
      stats = RollingStatsCalculator.addValue(stats, smoothedValue);

      if (stats.count > 0 && stats.variance > 0) {
        const stdDev = Math.sqrt(stats.variance);
        const zScoreRatio = (smoothedValue - stats.mean) / stdDev;
        const jdkRSRatio = Z_SCORE_CENTER + zScoreRatio * Z_SCORE_MULTIPLIER;
        rsRatioMap.set(currentDate, jdkRSRatio);
      }
    }

    return rsRatioMap;
  }

  private calculateYValues(
    xValues: Map<string, Map<number, number>>,
    normalizationWindowWeeks: number,
  ): Map<string, Map<number, number>> {
    const yValues = new Map<string, Map<number, number>>();

    for (const [symbol, xMap] of xValues.entries()) {
      const sortedDates = Array.from(xMap.keys()).sort((a, b) => a - b);
      const rsRatioDiffMap = new Map<number, number>();

      for (let i = 1; i < sortedDates.length; i++) {
        const currentDate = sortedDates[i];
        const currentRSRatio = xMap.get(currentDate);
        const previousDate = sortedDates[i - 1];
        const previousRSRatio = xMap.get(previousDate);

        if (currentRSRatio !== undefined && previousRSRatio !== undefined) {
          const rsRatioDiff = currentRSRatio - previousRSRatio;
          if (Number.isFinite(rsRatioDiff)) {
            rsRatioDiffMap.set(currentDate, rsRatioDiff);
          }
        }
      }

      const sortedDiffDates = Array.from(rsRatioDiffMap.keys()).sort(
        (a, b) => a - b,
      );

      const rsRatioDiffSmoothed = EMACalculator.calculate(
        rsRatioDiffMap,
        sortedDiffDates,
        RRG_PARAMETERS.RS_SMOOTHING_PERIOD,
      );

      const yNormalizedMap = this.calculateRSMomentum(
        rsRatioDiffSmoothed,
        sortedDiffDates,
        normalizationWindowWeeks,
      );

      yValues.set(symbol, yNormalizedMap);
    }

    return yValues;
  }

  private calculateRSMomentum(
    rsRatioDiff: Map<number, number>,
    sortedDates: number[],
    normalizationWindowWeeks: number,
  ): Map<number, number> {
    const rsMomentumMap = new Map<number, number>();
    const windowQueue: Array<{ date: number; value: number }> = [];
    let stats: RollingStats = {
      mean: 0,
      variance: 0,
      count: 0,
    };

    for (let i = 0; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const diffValue = rsRatioDiff.get(currentDate);

      if (diffValue === undefined) {
        continue;
      }

      const windowStartIndex = Math.max(0, i - normalizationWindowWeeks + 1);
      const windowStartDate = sortedDates[windowStartIndex];

      while (windowQueue.length > 0 && windowQueue[0].date < windowStartDate) {
        const removed = windowQueue.shift()!;
        stats = RollingStatsCalculator.removeValue(stats, removed.value);
      }

      windowQueue.push({ date: currentDate, value: diffValue });
      stats = RollingStatsCalculator.addValue(stats, diffValue);

      if (stats.count > 0 && stats.variance > 0) {
        const stdDev = Math.sqrt(stats.variance);
        const zScoreMomentum = (diffValue - stats.mean) / stdDev;
        const jdkRSMomentum =
          Z_SCORE_CENTER + zScoreMomentum * Z_SCORE_MULTIPLIER;
        rsMomentumMap.set(currentDate, jdkRSMomentum);
      }
    }

    return rsMomentumMap;
  }

  private createDataPoints(
    memberData: MemberWeeklyData[],
    relativeStrengths: Map<string, Map<number, number>>,
    xValues: Map<string, Map<number, number>>,
    yValues: Map<string, Map<number, number>>,
  ): SectorRotationDataPoint[] {
    const dataPoints: SectorRotationDataPoint[] = [];
    const dateToMemberPrices = new Map<number, Map<string, WeeklyPriceData>>();

    for (const { member, prices } of memberData) {
      for (const priceData of prices) {
        const dateTime = priceData.date.getTime();
        if (!dateToMemberPrices.has(dateTime)) {
          dateToMemberPrices.set(dateTime, new Map());
        }
        dateToMemberPrices.get(dateTime)!.set(member.symbol, priceData);
      }
    }

    const sortedDates = Array.from(dateToMemberPrices.keys()).sort(
      (a, b) => a - b,
    );

    for (const dateTime of sortedDates) {
      const memberPricesAtDate = dateToMemberPrices.get(dateTime)!;

      for (const [symbol, priceData] of memberPricesAtDate.entries()) {
        const rs = relativeStrengths.get(symbol)?.get(dateTime);
        const x = xValues.get(symbol)?.get(dateTime);
        const y = yValues.get(symbol)?.get(dateTime);

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
            symbol,
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
