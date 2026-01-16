import { SectorRotationDataPoint } from '../value-objects/sector-rotation-data-point';

export interface SectorRotationDataReadRepository {
  findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<SectorRotationDataPoint[]>;
  findBySectorAndDateRange(
    sectorSymbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SectorRotationDataPoint[]>;
  findLatestDate(): Promise<Date | null>;
  findLatestDateBySector(sectorSymbol: string): Promise<Date | null>;
  findExistingDates(
    startDate: Date,
    endDate: Date,
    sectorSymbols: string[],
  ): Promise<Set<string>>;
}
