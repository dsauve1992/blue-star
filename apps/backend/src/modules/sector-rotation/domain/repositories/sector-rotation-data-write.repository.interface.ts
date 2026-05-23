import { SectorRotationDataPoint } from '../value-objects/sector-rotation-data-point';

export interface SectorRotationDataWriteRepository {
  save(universeId: string, dataPoint: SectorRotationDataPoint): Promise<void>;
  saveMany(
    universeId: string,
    dataPoints: SectorRotationDataPoint[],
  ): Promise<void>;
  deleteByDateRange(
    universeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void>;
}
