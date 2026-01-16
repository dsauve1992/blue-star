import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { SectorRotationDataPoint } from '../../domain/value-objects/sector-rotation-data-point';
import { Quadrant } from '../../domain/value-objects/quadrant';
import { SectorRotationDataReadRepository } from '../../domain/repositories/sector-rotation-data-read.repository.interface';

interface DatabaseRow {
  date: string;
  sector_symbol: string;
  price: number;
  relative_strength: number;
  x: number;
  y: number;
  quadrant: string;
}

@Injectable()
export class SectorRotationDataReadRepositoryImpl
  implements SectorRotationDataReadRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async findByDateRange(
    startDate: Date,
    endDate: Date,
  ): Promise<SectorRotationDataPoint[]> {
    const query = `
      SELECT date, sector_symbol, price, relative_strength, x, y, quadrant
      FROM sector_rotation_data_points
      WHERE date >= $1 AND date <= $2
      ORDER BY date ASC, sector_symbol ASC
    `;

    const result = await this.databaseService.query(query, [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]);

    return this.mapRowsToDataPoints(result.rows as DatabaseRow[]);
  }

  async findBySectorAndDateRange(
    sectorSymbol: string,
    startDate: Date,
    endDate: Date,
  ): Promise<SectorRotationDataPoint[]> {
    const query = `
      SELECT date, sector_symbol, price, relative_strength, x, y, quadrant
      FROM sector_rotation_data_points
      WHERE sector_symbol = $1 AND date >= $2 AND date <= $3
      ORDER BY date ASC
    `;

    const result = await this.databaseService.query(query, [
      sectorSymbol,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]);

    return this.mapRowsToDataPoints(result.rows as DatabaseRow[]);
  }

  async findLatestDate(): Promise<Date | null> {
    const query = `
      SELECT MAX(date) as latest_date
      FROM sector_rotation_data_points
    `;

    const result = await this.databaseService.query(query);

    if (
      result.rows.length === 0 ||
      !result.rows[0].latest_date ||
      result.rows[0].latest_date === null
    ) {
      return null;
    }

    return new Date(result.rows[0].latest_date);
  }

  async findLatestDateBySector(sectorSymbol: string): Promise<Date | null> {
    const query = `
      SELECT MAX(date) as latest_date
      FROM sector_rotation_data_points
      WHERE sector_symbol = $1
    `;

    const result = await this.databaseService.query(query, [sectorSymbol]);

    if (
      result.rows.length === 0 ||
      !result.rows[0].latest_date ||
      result.rows[0].latest_date === null
    ) {
      return null;
    }

    return new Date(result.rows[0].latest_date);
  }

  async findExistingDates(
    startDate: Date,
    endDate: Date,
    sectorSymbols: string[],
  ): Promise<Set<string>> {
    if (sectorSymbols.length === 0) {
      return new Set();
    }

    const placeholders = sectorSymbols.map((_, i) => `$${i + 3}`).join(', ');
    const query = `
      SELECT DISTINCT date::text as date_str
      FROM sector_rotation_data_points
      WHERE date >= $1 AND date <= $2
        AND sector_symbol IN (${placeholders})
    `;

    const result = await this.databaseService.query(query, [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
      ...sectorSymbols,
    ]);

    return new Set(result.rows.map((row) => row.date_str));
  }

  private mapRowsToDataPoints(rows: DatabaseRow[]): SectorRotationDataPoint[] {
    return rows.map((row) => {
      const quadrant = this.mapQuadrant(row.quadrant);
      return SectorRotationDataPoint.of(
        new Date(row.date),
        row.sector_symbol,
        row.price,
        row.relative_strength,
        row.x,
        row.y,
        quadrant,
      );
    });
  }

  private mapQuadrant(quadrantStr: string): Quadrant {
    switch (quadrantStr) {
      case 'Leading':
        return Quadrant.Leading;
      case 'Weakening':
        return Quadrant.Weakening;
      case 'Lagging':
        return Quadrant.Lagging;
      case 'Improving':
        return Quadrant.Improving;
      default:
        throw new Error(`Unknown quadrant: ${quadrantStr}`);
    }
  }
}
