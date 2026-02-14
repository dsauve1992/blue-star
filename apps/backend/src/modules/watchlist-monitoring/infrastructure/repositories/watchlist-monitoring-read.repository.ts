import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../config/database.service';
import { WatchlistMonitoring } from '../../domain/entities/watchlist-monitoring.entity';
import { WatchlistMonitoringId } from '../../domain/value-objects/watchlist-monitoring-id';
import { MonitoringType } from '../../domain/value-objects/monitoring-type';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { WatchlistMonitoringReadRepository as IWatchlistMonitoringReadRepository } from '../../domain/repositories/watchlist-monitoring-read.repository.interface';

interface DatabaseRow {
  id: string;
  watchlist_id: string;
  type: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class WatchlistMonitoringReadRepository
  implements IWatchlistMonitoringReadRepository
{
  constructor(private readonly databaseService: DatabaseService) {}

  async findByWatchlistId(
    watchlistId: WatchlistId,
  ): Promise<WatchlistMonitoring[]> {
    const query = `
      SELECT id, watchlist_id, type, active, created_at, updated_at
      FROM watchlist_monitoring
      WHERE watchlist_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.databaseService.query(query, [watchlistId.value]);

    return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
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

  async findAllActive(): Promise<WatchlistMonitoring[]> {
    const query = `
      SELECT id, watchlist_id, type, active, created_at, updated_at
      FROM watchlist_monitoring
      WHERE active = true
      ORDER BY created_at DESC
    `;

    const result = await this.databaseService.query(query);
    return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
  }

  async findAllActiveByType(
    type: MonitoringType,
  ): Promise<WatchlistMonitoring[]> {
    const query = `
      SELECT id, watchlist_id, type, active, created_at, updated_at
      FROM watchlist_monitoring
      WHERE active = true AND type = $1
      ORDER BY created_at DESC
    `;

    const result = await this.databaseService.query(query, [type]);
    return result.rows.map((row) => this.mapRowToEntity(row as DatabaseRow));
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
