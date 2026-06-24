import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { LocalDate } from '../value-objects/local-date';

export class GapDetectedEvent {
  static readonly NAME = 'gap.detected';

  constructor(
    public readonly ticker: WatchlistTicker,
    public readonly watchlistId: WatchlistId,
    public readonly watchlistName: string,
    public readonly marketDate: LocalDate,
    public readonly detectedAt: Date,
  ) {}
}
