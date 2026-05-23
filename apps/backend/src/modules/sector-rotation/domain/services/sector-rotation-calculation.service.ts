import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { SectorRotationResult } from '../value-objects/sector-rotation-result';
import { RotationUniverse } from '../value-objects/rotation-universe';

export interface SectorRotationCalculationParams {
  momentumWeeks: number;
  normalizationWindowWeeks: number;
}

export interface SectorRotationCalculationService {
  calculate(
    universe: RotationUniverse,
    dateRange: DateRange,
    params: SectorRotationCalculationParams,
  ): Promise<SectorRotationResult>;
}
