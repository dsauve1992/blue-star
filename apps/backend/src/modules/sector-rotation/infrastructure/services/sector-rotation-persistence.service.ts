import { Injectable, Inject } from '@nestjs/common';
import { Sector } from '../../domain/value-objects/sector';
import { SectorRotationResult } from '../../domain/value-objects/sector-rotation-result';
import { SectorRotationDataPoint } from '../../domain/value-objects/sector-rotation-data-point';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { SectorRotationPersistenceService } from '../../domain/services/sector-rotation-persistence.service';
import {
  SectorRotationCalculationService,
  SectorRotationCalculationParams,
} from '../../domain/services/sector-rotation-calculation.service';
import { SectorRotationDataReadRepository } from '../../domain/repositories/sector-rotation-data-read.repository.interface';
import { SectorRotationDataWriteRepository } from '../../domain/repositories/sector-rotation-data-write.repository.interface';
import { SECTOR_ROTATION_CALCULATION_SERVICE } from '../../constants/tokens';
import {
  SECTOR_ROTATION_DATA_READ_REPOSITORY,
  SECTOR_ROTATION_DATA_WRITE_REPOSITORY,
} from '../../constants/tokens';
import { RRG_PARAMETERS } from '../../constants/rrg-parameters';

@Injectable()
export class SectorRotationPersistenceServiceImpl
  implements SectorRotationPersistenceService
{
  constructor(
    @Inject(SECTOR_ROTATION_CALCULATION_SERVICE)
    private readonly calculationService: SectorRotationCalculationService,
    @Inject(SECTOR_ROTATION_DATA_READ_REPOSITORY)
    private readonly readRepository: SectorRotationDataReadRepository,
    @Inject(SECTOR_ROTATION_DATA_WRITE_REPOSITORY)
    private readonly writeRepository: SectorRotationDataWriteRepository,
  ) {}

  async initializeLast52Weeks(sectors: Sector[]): Promise<void> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 52 * 7);

    const dateRange = DateRange.of(startDate, endDate);
    const params: SectorRotationCalculationParams = {
      momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
      normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
    };

    const result = await this.calculationService.calculate(
      sectors,
      dateRange,
      params,
    );

    await this.writeRepository.saveMany(result.dataPoints);
  }

  async computeAndSaveIncremental(sectors: Sector[]): Promise<void> {
    const latestDate = await this.readRepository.findLatestDate();

    if (!latestDate) {
      await this.initializeLast52Weeks(sectors);
      return;
    }

    const today = new Date();
    const daysSinceLatest = Math.floor(
      (today.getTime() - latestDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceLatest < 5) {
      return;
    }

    const requiredLookbackWeeks = Math.max(
      RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      RRG_PARAMETERS.MOMENTUM_WEEKS,
      RRG_PARAMETERS.RS_SMOOTHING_PERIOD,
    );

    const computeStartDate = new Date(latestDate);
    computeStartDate.setDate(
      computeStartDate.getDate() - requiredLookbackWeeks * 7,
    );

    const computeEndDate = new Date();

    const dateRange = DateRange.of(computeStartDate, computeEndDate);
    const params: SectorRotationCalculationParams = {
      momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
      normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
    };

    const result = await this.calculationService.calculate(
      sectors,
      dateRange,
      params,
    );

    const newDataPoints = result.dataPoints.filter(
      (point) => point.date > latestDate,
    );

    if (newDataPoints.length > 0) {
      await this.writeRepository.saveMany(newDataPoints);
    }
  }

  async getOrCompute(
    sectors: Sector[],
    dateRange: DateRange,
  ): Promise<SectorRotationResult> {
    const sectorSymbols = sectors.map((s) => s.etfSymbol);
    const existingDataPoints = await this.readRepository.findByDateRange(
      dateRange.startDate,
      dateRange.endDate,
    );

    const existingDates = new Set(
      existingDataPoints.map((point) => point.date.toISOString().split('T')[0]),
    );

    const allDates = this.generateWeekDates(
      dateRange.startDate,
      dateRange.endDate,
    );
    const missingDates = allDates.filter(
      (date) => !existingDates.has(date.toISOString().split('T')[0]),
    );

    if (missingDates.length === 0) {
      const filteredDataPoints = existingDataPoints.filter((point) =>
        sectorSymbols.includes(point.sectorSymbol),
      );
      return SectorRotationResult.of(
        dateRange.startDate,
        dateRange.endDate,
        filteredDataPoints,
        sectorSymbols,
      );
    }

    const requiredLookbackWeeks = Math.max(
      RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
      RRG_PARAMETERS.MOMENTUM_WEEKS,
      RRG_PARAMETERS.RS_SMOOTHING_PERIOD,
    );

    const computeStartDate = new Date(dateRange.startDate);
    computeStartDate.setDate(
      computeStartDate.getDate() - requiredLookbackWeeks * 7,
    );

    const computeEndDate = new Date(dateRange.endDate);

    const computeDateRange = DateRange.of(computeStartDate, computeEndDate);
    const params: SectorRotationCalculationParams = {
      momentumWeeks: RRG_PARAMETERS.MOMENTUM_WEEKS,
      normalizationWindowWeeks: RRG_PARAMETERS.NORMALIZATION_WINDOW_WEEKS,
    };

    const computedResult = await this.calculationService.calculate(
      sectors,
      computeDateRange,
      params,
    );

    const newDataPoints = computedResult.dataPoints.filter(
      (point) =>
        point.date >= dateRange.startDate &&
        point.date <= dateRange.endDate &&
        sectorSymbols.includes(point.sectorSymbol),
    );

    await this.writeRepository.saveMany(newDataPoints);

    const allDataPoints = [
      ...existingDataPoints.filter(
        (point) =>
          point.date >= dateRange.startDate &&
          point.date <= dateRange.endDate &&
          sectorSymbols.includes(point.sectorSymbol),
      ),
      ...newDataPoints,
    ];

    const uniqueDataPoints = this.deduplicateDataPoints(allDataPoints);

    return SectorRotationResult.of(
      dateRange.startDate,
      dateRange.endDate,
      uniqueDataPoints,
      sectorSymbols,
    );
  }

  private generateWeekDates(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);

    while (current <= endDate) {
      const weekStart = this.getWeekStart(current);
      if (weekStart >= startDate && weekStart <= endDate) {
        dates.push(new Date(weekStart));
      }
      current.setDate(current.getDate() + 7);
    }

    return dates;
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private deduplicateDataPoints(
    dataPoints: SectorRotationDataPoint[],
  ): SectorRotationDataPoint[] {
    const seen = new Map<string, SectorRotationDataPoint>();

    for (const point of dataPoints) {
      const key = `${point.date.toISOString().split('T')[0]}-${point.sectorSymbol}`;
      const existing = seen.get(key);

      if (!existing || point.date > existing.date) {
        seen.set(key, point);
      }
    }

    return Array.from(seen.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime(),
    );
  }
}
