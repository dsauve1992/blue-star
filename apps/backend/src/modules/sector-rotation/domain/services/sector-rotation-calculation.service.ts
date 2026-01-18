import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { SectorRotationResult } from '../value-objects/sector-rotation-result';
import { Sector } from '../value-objects/sector';

export interface SectorRotationCalculationParams {
  momentumWeeks: number;
  normalizationWindowWeeks: number;
}

export interface SectorRotationCalculationService {
  calculate(
    sectors: Sector[],
    dateRange: DateRange,
    params: SectorRotationCalculationParams,
  ): Promise<SectorRotationResult>;
}
