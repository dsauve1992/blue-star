import { SectorRotationDataPoint } from './sector-rotation-data-point';

export class SectorRotationResult {
  private constructor(
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly dataPoints: SectorRotationDataPoint[],
    public readonly sectorSymbols: string[],
  ) {}

  static of(
    startDate: Date,
    endDate: Date,
    dataPoints: SectorRotationDataPoint[],
    sectorSymbols: string[],
  ): SectorRotationResult {
    if (!startDate || !(startDate instanceof Date)) {
      throw new Error('Start date must be a valid Date object');
    }
    if (!endDate || !(endDate instanceof Date)) {
      throw new Error('End date must be a valid Date object');
    }
    if (startDate > endDate) {
      throw new Error('Start date must be before end date');
    }
    if (!dataPoints || dataPoints.length === 0) {
      throw new Error('Data points cannot be empty');
    }
    if (!sectorSymbols || sectorSymbols.length === 0) {
      throw new Error('Sector symbols cannot be empty');
    }

    return new SectorRotationResult(
      startDate,
      endDate,
      dataPoints,
      sectorSymbols,
    );
  }

  getDataPointsBySector(sectorSymbol: string): SectorRotationDataPoint[] {
    return this.dataPoints.filter(
      (point) => point.sectorSymbol === sectorSymbol.toUpperCase(),
    );
  }

  getDataPointsByDate(date: Date): SectorRotationDataPoint[] {
    const dateTime = date.getTime();
    return this.dataPoints.filter((point) => point.date.getTime() === dateTime);
  }

  getLatestDataPoints(): SectorRotationDataPoint[] {
    if (this.dataPoints.length === 0) {
      return [];
    }

    const latestDate = new Date(
      Math.max(...this.dataPoints.map((p) => p.date.getTime())),
    );
    return this.getDataPointsByDate(latestDate);
  }

  getUniqueDates(): Date[] {
    const dates = new Set(this.dataPoints.map((point) => point.date.getTime()));
    return Array.from(dates)
      .map((time) => new Date(time))
      .sort((a, b) => a.getTime() - b.getTime());
  }
}
