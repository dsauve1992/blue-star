import { RotationUniverse } from '../value-objects/rotation-universe';
import { SectorRotationResult } from '../value-objects/sector-rotation-result';
import { DateRange } from '../../../market-data/domain/value-objects/date-range';

export interface SectorRotationPersistenceService {
  initializeLast52Weeks(universe: RotationUniverse): Promise<void>;
  computeAndSaveIncremental(universe: RotationUniverse): Promise<void>;
  getOrCompute(
    universe: RotationUniverse,
    dateRange: DateRange,
  ): Promise<SectorRotationResult>;
}
