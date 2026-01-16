import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { SectorRotationDataPoint } from '../../domain/value-objects/sector-rotation-data-point';
import { SectorRotationDataWriteRepository } from '../../domain/repositories/sector-rotation-data-write.repository.interface';

@Injectable()
export class SectorRotationDataWriteRepositoryImpl
  implements SectorRotationDataWriteRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async save(dataPoint: SectorRotationDataPoint): Promise<void> {
    const query = `
      INSERT INTO sector_rotation_data_points (
        date, sector_symbol, price, relative_strength, x, y, quadrant, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (date, sector_symbol) DO UPDATE SET
        price = EXCLUDED.price,
        relative_strength = EXCLUDED.relative_strength,
        x = EXCLUDED.x,
        y = EXCLUDED.y,
        quadrant = EXCLUDED.quadrant,
        updated_at = NOW()
    `;

    await this.databaseService.query(query, [
      dataPoint.date.toISOString().split('T')[0],
      dataPoint.sectorSymbol,
      dataPoint.price,
      dataPoint.relativeStrength,
      dataPoint.x,
      dataPoint.y,
      dataPoint.quadrant.value,
    ]);
  }

  async saveMany(dataPoints: SectorRotationDataPoint[]): Promise<void> {
    if (dataPoints.length === 0) {
      return;
    }

    await this.databaseService.transaction(async (client) => {
      for (const dataPoint of dataPoints) {
        const query = `
          INSERT INTO sector_rotation_data_points (
            date, sector_symbol, price, relative_strength, x, y, quadrant, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (date, sector_symbol) DO UPDATE SET
            price = EXCLUDED.price,
            relative_strength = EXCLUDED.relative_strength,
            x = EXCLUDED.x,
            y = EXCLUDED.y,
            quadrant = EXCLUDED.quadrant,
            updated_at = NOW()
        `;

        await client.query(query, [
          dataPoint.date.toISOString().split('T')[0],
          dataPoint.sectorSymbol,
          dataPoint.price,
          dataPoint.relativeStrength,
          dataPoint.x,
          dataPoint.y,
          dataPoint.quadrant.value,
        ]);
      }
    });
  }

  async deleteByDateRange(startDate: Date, endDate: Date): Promise<void> {
    const query = `
      DELETE FROM sector_rotation_data_points
      WHERE date >= $1 AND date <= $2
    `;

    await this.databaseService.query(query, [
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]);
  }
}
