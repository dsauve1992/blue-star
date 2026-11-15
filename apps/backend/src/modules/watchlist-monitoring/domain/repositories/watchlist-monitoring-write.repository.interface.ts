import { WatchlistMonitoring } from '../entities/watchlist-monitoring.entity';
import { WatchlistId } from '../../../watchlist/watchlist.module';
import { MonitoringType } from '../value-objects/monitoring-type';

export interface WatchlistMonitoringWriteRepository {
  save(monitoring: WatchlistMonitoring): Promise<void>;
  findByWatchlistIdAndType(
    watchlistId: WatchlistId,
    type: MonitoringType,
  ): Promise<WatchlistMonitoring | null>;
}
