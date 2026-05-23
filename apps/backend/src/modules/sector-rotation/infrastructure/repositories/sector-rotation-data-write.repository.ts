import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { SectorRotationDataPoint } from '../../domain/value-objects/sector-rotation-data-point';
import { SectorRotationDataWriteRepository } from '../../domain/repositories/sector-rotation-data-write.repository.interface';

@Injectable()
export class SectorRotationDataWriteRepositoryImpl
  implements SectorRotationDataWriteRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async save(
    universeId: string,
    dataPoint: SectorRotationDataPoint,
  ): Promise<void> {
    const query = `
      INSERT INTO sector_rotation_data_points (
        universe_id, date, sector_symbol, price, relative_strength, x, y, quadrant, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (universe_id, date, sector_symbol) DO UPDATE SET
        price = EXCLUDED.price,
        relative_strength = EXCLUDED.relative_strength,
        x = EXCLUDED.x,
        y = EXCLUDED.y,
        quadrant = EXCLUDED.quadrant,
        updated_at = NOW()
    `;

    await this.databaseService.query(query, [
      universeId,
      dataPoint.date.toISOString().split('T')[0],
      dataPoint.sectorSymbol,
      dataPoint.price,
      dataPoint.relativeStrength,
      dataPoint.x,
      dataPoint.y,
      dataPoint.quadrant.value,
    ]);
  }

  async saveMany(
    universeId: string,
    dataPoints: SectorRotationDataPoint[],
  ): Promise<void> {
    if (dataPoints.length === 0) {
      return;
    }

    await this.databaseService.transaction(async (client) => {
      for (const dataPoint of dataPoints) {
        const query = `
          INSERT INTO sector_rotation_data_points (
            universe_id, date, sector_symbol, price, relative_strength, x, y, quadrant, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (universe_id, date, sector_symbol) DO UPDATE SET
            price = EXCLUDED.price,
            relative_strength = EXCLUDED.relative_strength,
            x = EXCLUDED.x,
            y = EXCLUDED.y,
            quadrant = EXCLUDED.quadrant,
            updated_at = NOW()
        `;

        await client.query(query, [
          universeId,
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

  async deleteByDateRange(
    universeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const query = `
      DELETE FROM sector_rotation_data_points
      WHERE universe_id = $1 AND date >= $2 AND date <= $3
    `;

    await this.databaseService.query(query, [
      universeId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0],
    ]);
  }
}
