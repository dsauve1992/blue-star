import { WatchlistMonitoringId } from '../value-objects/watchlist-monitoring-id';
import { MonitoringType } from '../value-objects/monitoring-type';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';

export interface CreateWatchlistMonitoringArgs {
  watchlistId: WatchlistId;
  type: MonitoringType;
}

export class WatchlistMonitoring {
  private constructor(
    public readonly id: WatchlistMonitoringId,
    public readonly watchlistId: WatchlistId,
    public readonly type: MonitoringType,
    private _active: boolean,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static create(args: CreateWatchlistMonitoringArgs): WatchlistMonitoring {
    const id = WatchlistMonitoringId.new();
    const now = new Date();
    return new WatchlistMonitoring(
      id,
      args.watchlistId,
      args.type,
      true,
      now,
      now,
    );
  }

  static fromData(data: {
    id: WatchlistMonitoringId;
    watchlistId: WatchlistId;
    type: MonitoringType;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): WatchlistMonitoring {
    return new WatchlistMonitoring(
      data.id,
      data.watchlistId,
      data.type,
      data.active,
      data.createdAt,
      data.updatedAt,
    );
  }

  activate(): void {
    this._active = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._active = false;
    this._updatedAt = new Date();
  }

  get active(): boolean {
    return this._active;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }
}
