import { WatchlistMonitoring } from '../entities/watchlist-monitoring.entity';
import { WatchlistId } from '../../../watchlist/watchlist.module';
import { MonitoringType } from '../value-objects/monitoring-type';

export interface WatchlistMonitoringReadRepository {
  findByWatchlistId(watchlistId: WatchlistId): Promise<WatchlistMonitoring[]>;
  findByWatchlistIdAndType(
    watchlistId: WatchlistId,
    type: MonitoringType,
  ): Promise<WatchlistMonitoring | null>;
  findAllActive(): Promise<WatchlistMonitoring[]>;
  findAllActiveByType(type: MonitoringType): Promise<WatchlistMonitoring[]>;
}
