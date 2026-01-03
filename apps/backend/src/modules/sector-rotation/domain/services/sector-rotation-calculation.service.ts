import { Symbol } from '../../../market-data/domain/value-objects/symbol';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';
import { MarketDataService } from '../../../market-data/domain/services/market-data.service';
import { SectorRotationResult } from '../value-objects/sector-rotation-result';
import { SectorRotationDataPoint } from '../value-objects/sector-rotation-data-point';
import { Quadrant } from '../value-objects/quadrant';
import { Sector } from '../value-objects/sector';
import { BenchmarkType } from '../value-objects/benchmark-type';

export interface SectorRotationCalculationParams {
  lookbackWeeks: number;
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

