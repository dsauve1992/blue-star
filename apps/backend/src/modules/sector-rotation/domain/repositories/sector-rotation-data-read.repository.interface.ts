import { SectorRotationDataPoint } from '../value-objects/sector-rotation-data-point';

export interface SectorRotationDataReadRepository {
  findByDateRange(
    universeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SectorRotationDataPoint[]>;
  findBySectorAndDateRange(
    universeId: string,
    sectorSymbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SectorRotationDataPoint[]>;
  findLatestDate(universeId: string): Promise<Date | null>;
  findLatestDateBySector(
    universeId: string,
    sectorSymbol: string,
  ): Promise<Date | null>;
  findExistingDates(
    universeId: string,
    startDate: Date,
    endDate: Date,
    sectorSymbols: string[],
  ): Promise<Set<string>>;
}
