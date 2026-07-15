import { PaperTrade } from '../entities/paper-trade';
import { WatchlistTicker } from '../../../watchlist/domain/value-objects/watchlist-ticker';
import { PaperTradeStatus } from '../entities/paper-trade';

export interface PaperTradeReadRepository {
  findById(id: string): Promise<PaperTrade | null>;
  findOpen(): Promise<PaperTrade[]>;
  hasOpenTrade(ticker: WatchlistTicker): Promise<boolean>;
  list(status?: PaperTradeStatus): Promise<PaperTrade[]>;
  getRealizedPnl(): Promise<number>;
}
