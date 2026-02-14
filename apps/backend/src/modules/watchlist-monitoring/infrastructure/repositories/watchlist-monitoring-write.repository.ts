import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { WatchlistMonitoring } from '../../domain/entities/watchlist-monitoring.entity';
import { WatchlistMonitoringId } from '../../domain/value-objects/watchlist-monitoring-id';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { WatchlistMonitoringWriteRepository as IWatchlistMonitoringWriteRepository } from '../../domain/repositories/watchlist-monitoring-write.repository.interface';

interface DatabaseRow {
  id: string;
  watchlist_id: string;
  type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class WatchlistMonitoringWriteRepository
  implements IWatchlistMonitoringWriteRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async save(monitoring: WatchlistMonitoring): Promise<void> {
    const query = `
      INSERT INTO watchlist_monitoring (id, watchlist_id, type, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (watchlist_id, type) DO UPDATE SET
        active = EXCLUDED.active,
        updated_at = EXCLUDED.updated_at
    `;

    await this.databaseService.query(query, [
      monitoring.id.value,
      monitoring.watchlistId.value,
      monitoring.type,
      monitoring.active,
      monitoring.createdAt.toISOString(),
      monitoring.updatedAt.toISOString(),
    ]);
  }

  async findByWatchlistIdAndType(
    watchlistId: WatchlistId,
    type: MonitoringType,
  ): Promise<WatchlistMonitoring | null> {
    const query = `
      SELECT id, watchlist_id, type, active, created_at, updated_at
      FROM watchlist_monitoring
      WHERE watchlist_id = $1 AND type = $2
    `;

    const result = await this.databaseService.query(query, [
      watchlistId.value,
      type,
    ]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToEntity(result.rows[0] as DatabaseRow);
  }

  private mapRowToEntity(row: DatabaseRow): WatchlistMonitoring {
    return WatchlistMonitoring.fromData({
      id: WatchlistMonitoringId.of(row.id),
      watchlistId: WatchlistId.of(row.watchlist_id),
      type: row.type as MonitoringType,
      active: row.active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }
}
