import { SectorRotationDataPoint } from '../value-objects/sector-rotation-data-point';

export interface SectorRotationDataWriteRepository {
  save(dataPoint: SectorRotationDataPoint): Promise<void>;
  saveMany(dataPoints: SectorRotationDataPoint[]): Promise<void>;
  deleteByDateRange(startDate: Date, endDate: Date): Promise<void>;
}
