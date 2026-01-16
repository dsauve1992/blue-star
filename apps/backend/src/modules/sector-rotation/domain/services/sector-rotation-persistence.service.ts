import { Sector } from '../value-objects/sector';
import { SectorRotationResult } from '../value-objects/sector-rotation-result';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';

export interface SectorRotationPersistenceService {
  initializeLast52Weeks(sectors: Sector[]): Promise<void>;
  computeAndSaveIncremental(sectors: Sector[]): Promise<void>;
  getOrCompute(
    sectors: Sector[],
    dateRange: DateRange,
  ): Promise<SectorRotationResult>;
}
