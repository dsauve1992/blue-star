import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { WatchlistId } from '../../../watchlist/domain/value-objects/watchlist-id';
import { LocalDate } from '../value-objects/local-date';
import { IndustryGroupQuadrant } from '../value-objects/gap-context';

export class GapDetectedEvent {
  static readonly NAME = 'gap.detected';

  constructor(
    public readonly ticker: WatchlistTicker,
    public readonly watchlistId: WatchlistId,
    public readonly watchlistName: string,
    public readonly marketDate: LocalDate,
    public readonly detectedAt: Date,
    public readonly entryPrice: number,
    public readonly stopPrice: number,
    public readonly industryGroup: string | null,
    public readonly globalRsRating: number | null,
    public readonly industryGroupRsRating: number | null,
    public readonly industryGroupQuadrant: IndustryGroupQuadrant | null,
  ) {}
}
