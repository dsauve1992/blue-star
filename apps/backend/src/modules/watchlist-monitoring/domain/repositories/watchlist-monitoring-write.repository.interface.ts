import { WatchlistMonitoring } from '../entities/watchlist-monitoring.entity';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { MonitoringType } from '../value-objects/monitoring-type';

export interface WatchlistMonitoringWriteRepository {
  save(monitoring: WatchlistMonitoring): Promise<void>;
  findByWatchlistIdAndType(
    watchlistId: WatchlistId,
    type: MonitoringType,
  ): Promise<WatchlistMonitoring | null>;
}
