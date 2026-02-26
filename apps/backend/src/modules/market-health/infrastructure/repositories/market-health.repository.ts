import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { MarketHealth } from '../../domain/entities/market-health.entity';
import { MarketHealthStatus } from '../../domain/value-objects/market-health-status';
import type { MarketHealthRepository as IMarketHealthRepository } from '../../domain/repositories/market-health.repository.interface';

interface DatabaseRow {
  id: string;
  status: string;
  ema9: string;
  ema21: string;
  computed_at: string;
  created_at: string;
}

@Injectable()
export class MarketHealthRepositoryImpl implements IMarketHealthRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  async save(marketHealth: MarketHealth): Promise<void> {
    await this.databaseService.query(
      `INSERT INTO market_health_status (id, status, ema9, ema21, computed_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [
        marketHealth.id,
        marketHealth.status.value,
        marketHealth.ema9,
        marketHealth.ema21,
        marketHealth.computedAt.toISOString(),
      ],
    );
  }

  async findLatest(): Promise<MarketHealth | null> {
    const result = await this.databaseService.query(
      `SELECT * FROM market_health_status ORDER BY computed_at DESC LIMIT 1`,
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0] as DatabaseRow);
  }

  private mapRowToEntity(row: DatabaseRow): MarketHealth {
    return MarketHealth.create({
      id: row.id,
      status: MarketHealthStatus.of(row.status),
      ema9: parseFloat(row.ema9),
      ema21: parseFloat(row.ema21),
      computedAt: new Date(row.computed_at),
    });
  }
}
