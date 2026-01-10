import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { SectorRotationResult } from '../value-objects/sector-rotation-result';
import { Sector } from '../value-objects/sector';
import { BenchmarkType } from '../value-objects/benchmark-type';

export interface SectorRotationCalculationParams {
  momentumWeeks: number;
  normalizationWindowWeeks: number;
  benchmarkType?: BenchmarkType;
}

export interface SectorRotationCalculationService {
  calculate(
    sectors: Sector[],
    dateRange: DateRange,
    params: SectorRotationCalculationParams,
  ): Promise<SectorRotationResult>;
}
